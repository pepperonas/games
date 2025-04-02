// backend/src/signaling-server.ts
import express from 'express';
import http from 'http';
import {WebSocket as WSSocket, WebSocketServer} from 'ws';
import path from 'path';
import cors from 'cors';

// Einfache Strukturen für Spieler und Räume
interface Player {
    id: string;
    name: string;
    ws: WSSocket;
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

// CORS für API-Anfragen aktivieren
app.use(cors());

// JSON-Parser für Express aktivieren
app.use(express.json());

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
// WICHTIG: Der Pfad muss exakt mit der Frontend-Erwartung übereinstimmen
const wss = new WebSocketServer({
    server,
    path: '/socket.io/' // Vereinfachter Pfad für bessere Kompatibilität
});

// Räume speichern
const rooms: Map<string, Room> = new Map();

// Log-Funktion für bessere Debugging-Möglichkeiten
const logMessage = (type: string, message: string) => {
    console.log(`[${new Date().toISOString()}] [${type}] ${message}`);
};

// WebSocket-Verbindungs-Handler
wss.on('connection', (ws: WSSocket) => {
    logMessage('CONNECTION', 'Neue WebSocket-Verbindung');

    // NEUE Verbindungs-ID generieren für besseres Tracking
    const connectionId = `conn-${Math.random().toString(36).substring(2, 10)}`;
    logMessage('CONNECTION', `Neue Verbindung mit ID: ${connectionId}`);

    let playerId = '';
    let currentRoomId = '';

    // Verbindungsstatus regelmäßig prüfen
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            try {
                ws.ping();
                logMessage('PING', `Ping an Spieler ${playerId || 'unknown'} / ${connectionId}`);
            } catch (error) {
                logMessage('ERROR', `Ping-Fehler für ${connectionId}: ${error}`);
            }
        }
    }, 15000); // Auf 15 Sekunden reduziert

    // Nachrichtenverarbeitung mit besserer Fehlerhandhabung
    ws.on('message', (message: Buffer | string) => {
        try {
            const messageStr = message.toString();
            logMessage('RECEIVED', `Nachricht von ${connectionId}: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? '...' : ''}`);

            const data = JSON.parse(messageStr);

            // Bei game-started und related Nachrichten bessere Logs
            if (data.type && data.type.includes('game')) {
                logMessage('GAME', `Spielnachricht Typ: ${data.type} von ${data.sender || 'unknown'}`);
            }

            handleMessage(ws, data);
        } catch (error) {
            // Verbesserte Fehlerbehandlung mit korrekter Typisierung
            const errorMessage = error instanceof Error ? error.message : String(error);
            logMessage('ERROR', `Fehler beim Verarbeiten der Nachricht von ${connectionId}: ${errorMessage}`);
            sendTo(ws, {
                type: 'error',
                content: {message: 'Ungültige Nachricht: ' + errorMessage}
            });
        }
    });

    // Verbesserte Behandlung für geschlossene Verbindungen
    ws.on('close', (code: number, reason: string) => {
        logMessage('CLOSE', `WebSocket-Verbindung geschlossen für Spieler ${playerId || 'unknown'} / ${connectionId}, Code: ${code}, Grund: ${reason || 'keine Angabe'}`);

        clearInterval(pingInterval);

        // Spieler aus dem Raum entfernen, wenn vorhanden
        if (currentRoomId && playerId) {
            logMessage('ROOM', `Spieler ${playerId} verlässt Raum ${currentRoomId} aufgrund von geschlossener Verbindung`);
            handlePlayerLeave(currentRoomId, playerId);
        }
    });

    // Fehlerbehandlung
    ws.on('error', (error: Error) => {
        logMessage('ERROR', `WebSocket-Fehler: ${error.message}`);
    });

    // Pong-Handler hinzufügen
    ws.on('pong', () => {
        logMessage('PONG', `Pong von Spieler ${playerId || 'unknown'}`);
    });

    // Nachrichtenverarbeitung
    function handleMessage(ws: WSSocket, data: any): void {
        const {type, sender, roomId, content} = data;

        // Setze die Spieler-ID und den aktuellen Raum
        if (sender) playerId = sender;
        if (roomId) currentRoomId = roomId;

        logMessage('MESSAGE', `Nachricht empfangen: ${type} von ${sender} in Raum ${roomId}`);

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
                sendTo(ws, {type: 'pong'});
                break;

            default:
                logMessage('WARNING', `Unbekannter Nachrichtentyp: ${type}`);
        }
    }

    // Raum erstellen
    function handleCreateRoom(roomId: string, playerId: string, playerName: string, ws: WSSocket): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        // Prüfe, ob der Raum bereits existiert
        if (rooms.has(normalizedRoomId)) {
            sendTo(ws, {
                type: 'error',
                content: {message: 'Raum existiert bereits'}
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
            id: normalizedRoomId,
            players: [player],
            isGameStarted: false
        };

        // Speichere den Raum
        rooms.set(normalizedRoomId, room);

        logMessage('ROOM', `Raum erstellt: ${normalizedRoomId} von ${playerName} (${playerId})`);

        // Bestätige die Raumerstellung
        sendTo(ws, {
            type: 'room-created',
            content: {roomId: normalizedRoomId, playerId}
        });

        // Aktualisiere die Spielerliste
        broadcastPlayerList(normalizedRoomId);
    }

    // Raum beitreten
    function handleJoinRoom(roomId: string, playerId: string, playerName: string, ws: WSSocket): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        // Prüfe, ob der Raum existiert
        if (!rooms.has(normalizedRoomId)) {
            logMessage('ERROR', `Raum ${normalizedRoomId} existiert nicht für Spieler ${playerId}`);
            sendTo(ws, {
                type: 'error',
                content: {message: 'Raum existiert nicht'}
            });
            return;
        }

        const room = rooms.get(normalizedRoomId)!;
        logMessage('ROOM', `Spieler ${playerName} (${playerId}) versucht, Raum ${normalizedRoomId} beizutreten`);

        // Prüfe, ob das Spiel bereits gestartet ist
        if (room.isGameStarted) {
            logMessage('ROOM', `Zugriff verweigert: Spiel in Raum ${normalizedRoomId} bereits gestartet`);
            sendTo(ws, {
                type: 'error',
                content: {message: 'Spiel bereits gestartet'}
            });
            return;
        }

        // Prüfe, ob der Raum bereits voll ist (max. 8 Spieler)
        if (room.players.length >= 8) {
            logMessage('ROOM', `Zugriff verweigert: Raum ${normalizedRoomId} ist voll`);
            sendTo(ws, {
                type: 'error',
                content: {message: 'Raum ist voll'}
            });
            return;
        }

        // Prüfe, ob der Spieler bereits im Raum ist
        const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
        if (existingPlayerIndex >= 0) {
            // Spieler ist bereits im Raum - aktualisiere WebSocket
            logMessage('ROOM', `Spieler ${playerName} (${playerId}) bereits in Raum ${normalizedRoomId} - WebSocket aktualisiert`);
            room.players[existingPlayerIndex].ws = ws;
            room.players[existingPlayerIndex].name = playerName;

            sendTo(ws, {
                type: 'room-joined',
                content: {
                    roomId: normalizedRoomId,
                    playerId,
                    success: true,
                    message: 'Reconnected to room'
                }
            });

            broadcastPlayerList(normalizedRoomId);
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

        logMessage('ROOM', `Spieler beigetreten: ${playerName} (${playerId}) in Raum ${normalizedRoomId}, Spieler insgesamt: ${room.players.length}`);

        // Bestätige den Raumbeitritt
        sendTo(ws, {
            type: 'room-joined',
            content: {
                roomId: normalizedRoomId,
                playerId,
                success: true
            }
        });

        // Informiere alle Spieler im Raum
        broadcastToRoom(normalizedRoomId, {
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
        broadcastPlayerList(normalizedRoomId);
    }

    // Spieler verlässt den Raum
    function handlePlayerLeave(roomId: string, playerId: string): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        if (!rooms.has(normalizedRoomId)) return;

        const room = rooms.get(normalizedRoomId)!;
        const playerIndex = room.players.findIndex(p => p.id === playerId);

        if (playerIndex === -1) return;

        const player = room.players[playerIndex];
        logMessage('ROOM', `Spieler verlässt Raum: ${player.name} (${playerId}) aus Raum ${normalizedRoomId}`);

        // Entferne den Spieler aus dem Raum
        room.players.splice(playerIndex, 1);

        // Informiere alle verbleibenden Spieler
        broadcastToRoom(normalizedRoomId, {
            type: 'player-left',
            content: {playerId}
        });

        // Wenn der Raum leer ist, entferne ihn
        if (room.players.length === 0) {
            logMessage('ROOM', `Raum wird entfernt: ${normalizedRoomId}`);
            rooms.delete(normalizedRoomId);
            return;
        }

        // Wenn der Host den Raum verlassen hat, mache den nächsten Spieler zum Host
        if (player.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            logMessage('ROOM', `Neuer Host: ${room.players[0].name} (${room.players[0].id})`);
        }

        // Aktualisiere die Spielerliste
        broadcastPlayerList(normalizedRoomId);
    }

    // Spieler ändert Bereit-Status
    function handlePlayerReady(roomId: string, playerId: string, isReady: boolean): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        if (!rooms.has(normalizedRoomId)) return;

        const room = rooms.get(normalizedRoomId)!;
        const player = room.players.find(p => p.id === playerId);

        if (!player) return;

        player.isReady = isReady;
        logMessage('PLAYER', `Spieler ${player.name} (${playerId}) ist ${isReady ? 'bereit' : 'nicht bereit'}`);

        // Aktualisiere die Spielerliste
        broadcastPlayerList(normalizedRoomId);
    }

    // Nachricht an alle Spieler im Raum weiterleiten
    function forwardMessage(roomId: string, senderId: string, message: any): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        if (!rooms.has(normalizedRoomId)) return;

        const room = rooms.get(normalizedRoomId)!;

        // Sende die Nachricht an alle anderen Spieler im Raum
        room.players.forEach(player => {
            if (player.id !== senderId) {
                sendTo(player.ws, message);
            }
        });
    }

    // Aktualisiere die Spielerliste für alle Spieler im Raum
    function broadcastPlayerList(roomId: string): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        if (!rooms.has(normalizedRoomId)) return;

        const room = rooms.get(normalizedRoomId)!;
        const players = room.players.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            isReady: p.isReady,
            score: p.score
        }));

        broadcastToRoom(normalizedRoomId, {
            type: 'player-list-updated',
            content: {
                roomId: normalizedRoomId, // Wichtig: Sendet die Raum-ID immer mit!
                players
            }
        });
    }

    // Sende eine Nachricht an alle Spieler im Raum
    function broadcastToRoom(roomId: string, message: any): void {
        // WICHTIG: Konsistenten Raum-ID-Format sicherstellen
        const normalizedRoomId = roomId.toUpperCase().trim();

        if (!rooms.has(normalizedRoomId)) return;

        const room = rooms.get(normalizedRoomId)!;

        room.players.forEach(player => {
            sendTo(player.ws, message);
        });
    }

    // Sende eine Nachricht an einen bestimmten WebSocket
    function sendTo(ws: WSSocket, message: any): void {
        try {
            if (ws.readyState === ws.OPEN) {
                const messageStr = JSON.stringify(message);
                ws.send(messageStr);
                logMessage('SEND', `Nachricht gesendet: ${message.type}`);
            }
        } catch (error) {
            logMessage('ERROR', `Fehler beim Senden der Nachricht: ${error}`);
        }
    }
});

// Server starten
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    logMessage('SERVER', `Signaling-Server läuft auf Port ${PORT}`);
});

export default server;