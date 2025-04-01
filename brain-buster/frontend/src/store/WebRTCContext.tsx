// src/store/WebRTCContext.tsx
import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import WebRTCService from '../services/webRTCService';
import { Question } from '../types';

interface WebRTCContextProps {
  webRTC: WebRTCService | null;
  isConnected: boolean;
  isSignalingConnected: boolean;
  connectionState: string;
  currentRoom: string | null;
  isHost: boolean;
  players: PlayerInfo[];
  error: string | null;
  connectToSignalingServer: () => Promise<void>;
  createRoom: (playerName: string, roomId: string) => Promise<string>;
  joinRoom: (playerName: string, roomId: string) => Promise<void>;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  startGame: (questions: Question[]) => void;
  answerQuestion: (questionIndex: number, answer: number) => void;
  nextQuestion: () => void;
}

interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

interface WebRTCProviderProps {
  children: ReactNode;
}

const WebRTCContext = createContext<WebRTCContextProps | undefined>(undefined);

// Signaling-Server-URL basierend auf der aktuellen Domain
const getSignalingServerUrl = () => {
  // Protokoll basierend auf der aktuellen Seite wählen
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // Komplette URL mit korrektem Pfad erstellen - kritisch für die Verbindung!
  return `${protocol}//${window.location.host}/games/brain-buster/api/socket.io/`;
};

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
  const [webRTC, setWebRTC] = useState<WebRTCService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisiere den WebRTC-Service - nur einmal
  useEffect(() => {
    if (isInitialized) return;

    console.log("WebRTCProvider: Initialisiere WebRTC-Service");

    try {
      const webRTCService = new WebRTCService();

      // Registriere Callbacks
      webRTCService.registerCallbacks({
        onConnectionStateChange: (state) => {
          console.log('WebRTC Verbindungsstatus:', state);
          setConnectionState(state);
          setIsConnected(state === 'connected');
        },
        onPlayerJoined: (player) => {
          console.log('Spieler beigetreten:', player);
        },
        onPlayerLeft: (playerId) => {
          console.log('Spieler hat verlassen:', playerId);
        },
        onPlayersUpdate: (updatedPlayers) => {
          console.log('Spielerliste aktualisiert:', updatedPlayers);
          setPlayers(updatedPlayers);
        },
        onError: (message) => {
          console.error('WebRTC Fehler:', message);
          setError(message);
        },
        onReconnect: () => {
          console.log('WebRTC wurde neu verbunden');
          setError(null);
        }
      });

      setWebRTC(webRTCService);
      setIsInitialized(true);

    } catch (error) {
      console.error("Fehler bei WebRTC-Initialisierung:", error);
      setError(`Initialisierungsfehler: ${error}`);
    }
  }, [isInitialized]);

  // Verbinde mit dem Signaling-Server
  const connectToSignalingServer = useCallback(async () => {
    if (!webRTC) {
      console.error('WebRTC-Service wurde noch nicht initialisiert');
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return Promise.reject('WebRTC-Service wurde noch nicht initialisiert');
    }

    try {
      const serverUrl = getSignalingServerUrl();
      console.log('Verbinde mit Signaling-Server:', serverUrl);

      await webRTC.connectToSignalingServer(serverUrl);
      setIsSignalingConnected(true);
      setError(null);
      return Promise.resolve();
    } catch (error) {
      console.error('Fehler bei der Verbindung mit dem Signaling-Server:', error);
      setError(`Verbindungsfehler: ${error}`);
      setIsSignalingConnected(false);
      return Promise.reject(error);
    }
  }, [webRTC]);

  // Erstelle einen neuen Raum
  const createRoom = useCallback(async (playerName: string, roomId: string) => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return Promise.reject('WebRTC-Service wurde noch nicht initialisiert');
    }

    if (!isSignalingConnected) {
      try {
        console.log("Keine Verbindung zum Signaling-Server, versuche zu verbinden...");
        await connectToSignalingServer();
      } catch (error) {
        console.error("Verbindung zum Signaling-Server fehlgeschlagen:", error);
        return Promise.reject('Keine Verbindung zum Signaling-Server');
      }
    }

    try {
      console.log(`Erstelle Raum: ${roomId}, Spieler: ${playerName}`);
      const createdRoomId = await webRTC.createRoom(playerName, roomId);
      setCurrentRoom(createdRoomId);
      setIsHost(true);
      setError(null);
      return createdRoomId;
    } catch (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      setError(`Fehler beim Erstellen des Raums: ${error}`);
      return Promise.reject(error);
    }
  }, [webRTC, isSignalingConnected, connectToSignalingServer]);

  // Tritt einem existierenden Raum bei
  const joinRoom = useCallback(async (playerName: string, roomId: string) => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return Promise.reject('WebRTC-Service wurde noch nicht initialisiert');
    }

    if (!isSignalingConnected) {
      try {
        console.log("Keine Verbindung zum Signaling-Server, versuche zu verbinden...");
        await connectToSignalingServer();
      } catch (error) {
        console.error("Verbindung zum Signaling-Server fehlgeschlagen:", error);
        return Promise.reject('Keine Verbindung zum Signaling-Server');
      }
    }

    try {
      console.log(`Betrete Raum: ${roomId}, Spieler: ${playerName}`);
      await webRTC.joinRoom(playerName, roomId);
      setCurrentRoom(roomId);
      setIsHost(false);
      setError(null);
      return Promise.resolve();
    } catch (error) {
      console.error('Fehler beim Beitreten zum Raum:', error);
      setError(`Fehler beim Beitreten zum Raum: ${error}`);
      return Promise.reject(error);
    }
  }, [webRTC, isSignalingConnected, connectToSignalingServer]);

  // Verlasse den aktuellen Raum
  const leaveRoom = useCallback(() => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return;
    }

    console.log("Verlasse Raum");
    webRTC.leaveRoom();
    setCurrentRoom(null);
    setIsHost(false);
    setPlayers([]);
  }, [webRTC]);

  // Setze den Bereit-Status
  const setReady = useCallback((isReady: boolean) => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return;
    }

    console.log(`Setze Bereit-Status: ${isReady}`);
    webRTC.setReady(isReady);
  }, [webRTC]);

  // Starte das Spiel
  const startGame = useCallback((questions: Question[]) => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return;
    }

    if (!isHost) {
      setError('Nur der Host kann das Spiel starten');
      return;
    }

    if (!questions || questions.length === 0) {
      setError('Keine Fragen zum Starten des Spiels verfügbar');
      return;
    }

    console.log(`Starte Spiel mit ${questions.length} Fragen`);
    webRTC.startGame(questions);
  }, [webRTC, isHost]);

  // Beantworte eine Frage
  const answerQuestion = useCallback((questionIndex: number, answer: number) => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return;
    }

    console.log(`Beantworte Frage ${questionIndex} mit Antwort ${answer}`);
    webRTC.answerQuestion(questionIndex, answer);
  }, [webRTC]);

  // Gehe zur nächsten Frage
  const nextQuestion = useCallback(() => {
    if (!webRTC) {
      setError('WebRTC-Service wurde noch nicht initialisiert');
      return;
    }

    if (!isHost) {
      setError('Nur der Host kann zur nächsten Frage wechseln');
      return;
    }

    console.log('Wechsle zur nächsten Frage');
    webRTC.nextQuestion();
  }, [webRTC, isHost]);

  // Automatischer Verbindungsversuch beim Laden
  useEffect(() => {
    if (webRTC && !isSignalingConnected) {
      console.log("Automatischer Verbindungsversuch zum Signaling-Server");
      connectToSignalingServer().catch(err =>
          console.warn("Anfänglicher Verbindungsversuch fehlgeschlagen, manuelle Verbindung erforderlich", err)
      );
    }
  }, [webRTC, isSignalingConnected, connectToSignalingServer]);

  const value = {
    webRTC,
    isConnected,
    isSignalingConnected,
    connectionState,
    currentRoom,
    isHost,
    players,
    error,
    connectToSignalingServer,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    answerQuestion,
    nextQuestion
  };

  return (
      <WebRTCContext.Provider value={value}>
        {children}
      </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);

  if (context === undefined) {
    throw new Error('useWebRTC muss innerhalb eines WebRTCProviders verwendet werden');
  }

  return context;
};