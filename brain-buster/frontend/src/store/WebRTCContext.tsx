// src/store/WebRTCContext.tsx
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
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

  // Initialisiere den WebRTC-Service
  useEffect(() => {
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
      }
    });
    
    setWebRTC(webRTCService);
    
    // Bereinige beim Unmounten
    return () => {
      // Keine explizite Bereinigung nötig, da der Service selbst bereinigt
    };
  }, []);

  // Verbinde mit dem Signaling-Server
  const connectToSignalingServer = async () => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return Promise.reject('WebRTC-Service nicht initialisiert');
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
      setError(`Fehler bei der Verbindung: ${error}`);
      setIsSignalingConnected(false);
      return Promise.reject(error);
    }
  };

  // Erstelle einen neuen Raum
  const createRoom = async (playerName: string, roomId: string) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return Promise.reject('WebRTC-Service nicht initialisiert');
    }
    
    if (!isSignalingConnected) {
      try {
        await connectToSignalingServer();
      } catch (error) {
        return Promise.reject('Keine Verbindung zum Signaling-Server');
      }
    }
    
    try {
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
  };

  // Tritt einem existierenden Raum bei
  const joinRoom = async (playerName: string, roomId: string) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return Promise.reject('WebRTC-Service nicht initialisiert');
    }
    
    if (!isSignalingConnected) {
      try {
        await connectToSignalingServer();
      } catch (error) {
        return Promise.reject('Keine Verbindung zum Signaling-Server');
      }
    }
    
    try {
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
  };

  // Verlasse den aktuellen Raum
  const leaveRoom = () => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    webRTC.leaveRoom();
    setCurrentRoom(null);
    setIsHost(false);
    setPlayers([]);
  };

  // Setze den Bereit-Status
  const setReady = (isReady: boolean) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    webRTC.setReady(isReady);
  };

  // Starte das Spiel
  const startGame = (questions: Question[]) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    if (!isHost) {
      setError('Nur der Host kann das Spiel starten');
      return;
    }
    
    webRTC.startGame(questions);
  };

  // Beantworte eine Frage
  const answerQuestion = (questionIndex: number, answer: number) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    webRTC.answerQuestion(questionIndex, answer);
  };

  // Gehe zur nächsten Frage
  const nextQuestion = () => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    if (!isHost) {
      setError('Nur der Host kann zur nächsten Frage wechseln');
      return;
    }
    
    webRTC.nextQuestion();
  };

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
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  
  return context;
};