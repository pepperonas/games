// backend/src/signaling-server.ts
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Einfache Strukturen für Spieler und Räume
interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

interface Room {
  id: string;
  players: Player[];
  isGameStarted: boolean;
}

// Das Express-App und HTTP-Server erstellen
const app = express();
const server = http.createServer(app);

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../../')));

// Gesundheitscheck-Endpunkt
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Fallback-Route für SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// WebSocket-Server erstellen
const wss = new WebSocketServer({ server, path: '/socket.io/' });

// Räume speichern
const rooms: Map<string, Room> = new Map();

// WebSocket-Verbindungs-Handler
wss.on('connection', (ws: WebSocket) => {
  console.log('Neue WebSocket-Verbindung');

  let playerId = '';
  let currentRoomId = '';

  // Nachrichtenverarbeitung
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Nachricht:', error);
      sendTo(ws, {
        type: 'error',
        content: { message: 'Ungültige Nachricht' }
      });
    }
  });

  // Verbindungsabbruch
  ws.on('close', () => {
    console.log('WebSocket-Verbindung geschlossen');
    
    // Spieler aus dem Raum entfernen, wenn vorhanden
    if (currentRoomId && playerId) {
      handlePlayerLeave(currentRoomId, playerId);
    }
  });

  // Fehlerbehandlung
  ws.on('error', (error) => {
    console.error('WebSocket-Fehler:', error);
  });

  // Nachrichtenverarbeitung
  function handleMessage(ws: WebSocket, data: any): void {
    const { type, sender, roomId, content } = data;

    // Setze die Spieler-ID und den aktuellen Raum
    if (sender) playerId = sender;
    if (roomId) currentRoomId = roomId;

    console.log(`Nachricht empfangen: ${type} von ${sender} in Raum ${roomId}`);

    switch (type) {
      case 'create-room':
        handleCreateRoom(roomId, sender, content.playerName, ws);
        break;

      case 'join-room':
        handleJoinRoom(roomId, sender, content.playerName, ws);
        break;

      case 'leave':
        handlePlayerLeave(roomId, sender);
        break;

      case 'player-ready':
        handlePlayerReady(roomId, sender, content.isReady);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Einfaches Weiterleiten an den anderen Spieler im Raum
        forwardMessage(roomId, sender, data);
        break;

      case 'ping':
        // Ping-Antwort senden
        sendTo(ws, { type: 'pong' });
        break;

      default:
        console.warn(`Unbekannter Nachrichtentyp: ${type}`);
    }
  }

  // Raum erstellen
  function handleCreateRoom(roomId: string, playerId: string, playerName: string, ws: WebSocket): void {
    // Prüfe, ob der Raum bereits existiert
    if (rooms.has(roomId)) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Raum existiert bereits' }
      });
      return;
    }

    // Erstelle einen neuen Spieler
    const player: Player = {
      id: playerId,
      name: playerName,
      ws,
      isHost: true,
      isReady: false,
      score: 0
    };

    // Erstelle einen neuen Raum
    const room: Room = {
      id: roomId,
      players: [player],
      isGameStarted: false
    };

    // Speichere den Raum
    rooms.set(roomId, room);

    console.log(`Raum erstellt: ${roomId} von ${playerName} (${playerId})`);

    // Bestätige die Raumerstellung
    sendTo(ws, {
      type: 'room-created',
      content: { roomId, playerId }
    });

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Raum beitreten
  function handleJoinRoom(roomId: string, playerId: string, playerName: string, ws: WebSocket): void {
    // Prüfe, ob der Raum existiert
    if (!rooms.has(roomId)) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Raum existiert nicht' }
      });
      return;
    }

    const room = rooms.get(roomId)!;

    // Prüfe, ob das Spiel bereits gestartet ist
    if (room.isGameStarted) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Spiel bereits gestartet' }
      });
      return;
    }

    // Prüfe, ob der Raum bereits voll ist (max. 2 Spieler)
    if (room.players.length >= 2) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Raum ist voll' }
      });
      return;
    }

    // Erstelle einen neuen Spieler
    const player: Player = {
      id: playerId,
      name: playerName,
      ws,
      isHost: false,
      isReady: false,
      score: 0
    };

    // Füge den Spieler dem Raum hinzu
    room.players.push(player);

    console.log(`Spieler beigetreten: ${playerName} (${playerId}) in Raum ${roomId}`);

    // Informiere alle Spieler im Raum
    broadcastToRoom(roomId, {
      type: 'player-joined',
      content: {
        id: playerId,
        name: playerName,
        isHost: false,
        isReady: false,
        score: 0
      }
    });

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Spieler verlässt den Raum
  function handlePlayerLeave(roomId: string, playerId: string): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;
    const playerIndex = room.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    console.log(`Spieler verlässt Raum: ${player.name} (${playerId}) aus Raum ${roomId}`);

    // Entferne den Spieler aus dem Raum
    room.players.splice(playerIndex, 1);

    // Informiere alle verbleibenden Spieler
    broadcastToRoom(roomId, {
      type: 'player-left',
      content: { playerId }
    });

    // Wenn der Raum leer ist, entferne ihn
    if (room.players.length === 0) {
      console.log(`Raum wird entfernt: ${roomId}`);
      rooms.delete(roomId);
      return;
    }

    // Wenn der Host den Raum verlassen hat, mache den nächsten Spieler zum Host
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      console.log(`Neuer Host: ${room.players[0].name} (${room.players[0].id})`);
    }

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Spieler ändert Bereit-Status
  function handlePlayerReady(roomId: string, playerId: string, isReady: boolean): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;
    const player = room.players.find(p => p.id === playerId);

    if (!player) return;

    player.isReady = isReady;
    console.log(`Spieler ${player.name} (${playerId}) ist ${isReady ? 'bereit' : 'nicht bereit'}`);

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Nachricht an alle Spieler im Raum weiterleiten
  function forwardMessage(roomId: string, senderId: string, message: any): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;

    // Sende die Nachricht an alle anderen Spieler im Raum
    room.players.forEach(player => {
      if (player.id !== senderId) {
        sendTo(player.ws, message);
      }
    });
  }

  // Aktualisiere die Spielerliste für alle Spieler im Raum
  function broadcastPlayerList(roomId: string): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;
    const players = room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      score: p.score
    }));

    broadcastToRoom(roomId, {
      type: 'player-list-updated',
      content: { players }
    });
  }

  // Sende eine Nachricht an alle Spieler im Raum
  function broadcastToRoom(roomId: string, message: any): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;

    room.players.forEach(player => {
      sendTo(player.ws, message);
    });
  }

  // Sende eine Nachricht an einen bestimmten WebSocket
  function sendTo(ws: WebSocket, message: any): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    }
  }
});

// Server starten
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling-Server läuft auf Port ${PORT}`);
});

export default server;