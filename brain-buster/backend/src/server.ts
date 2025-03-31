// server.js - Hauptdatei des BrainBuster-Backends

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Logger-Funktion für bessere Fehlersuche
const logger = (level, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${level}] ${timestamp}: ${message}`);
};

// Environment-Variablen
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Express-App initialisieren
const app = express();
app.use(cors());
app.use(express.json());

// Server erstellen
const server = http.createServer(app);

// Socket.io mit CORS-Einstellungen initialisieren
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 30000
});

// Status-Endpunkt für Healthchecks
app.get('/', (req, res) => {
    res.json({ status: 'ok', environment: NODE_ENV });
});

// Spieldaten-Speicher
const rooms = {};
const userSocketMap = {}; // Zuordnung von Benutzernamen zu Socket-IDs

// Hilfsfunktionen
const generateRoomCode = () => {
    // 6-stelliger alphanumerischer Code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const cleanupPlayer = (socketId) => {
    // Finde alle Räume, in denen der Spieler ist
    Object.keys(rooms).forEach(roomCode => {
        const room = rooms[roomCode];
        const playerIndex = room.players.findIndex(p => p.id === socketId);

        if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            logger('INFO', `Player ${player.name} left room ${roomCode}`);

            // Spieler aus Raum entfernen
            room.players.splice(playerIndex, 1);

            // Wenn keine Spieler übrig sind, Raum löschen
            if (room.players.length === 0) {
                logger('INFO', `Room ${roomCode} is empty, deleting`);
                delete rooms[roomCode];
            }
            // Sonst Host-Status aktualisieren, falls nötig
            else if (player.isHost && room.players.length > 0) {
                logger('INFO', `Host left room ${roomCode}, assigning new host`);
                room.players[0].isHost = true;
                io.to(roomCode).emit('roomUpdated', room);
                io.to(room.players[0].id).emit('hostStatus', true);
            }

            // Anderen Spielern im Raum Bescheid geben
            io.to(roomCode).emit('playerLeft', socketId, room);
        }
    });
};

// Socket.io Event-Handler
io.on('connection', (socket) => {
    logger('INFO', `New connection: ${socket.id}`);

    // Verbindungsabbruch behandeln
    socket.on('disconnect', (reason) => {
        logger('INFO', `Disconnected: ${socket.id}, reason: ${reason}`);
        cleanupPlayer(socket.id);

        // Aus userSocketMap entfernen
        Object.keys(userSocketMap).forEach(username => {
            if (userSocketMap[username] === socket.id) {
                delete userSocketMap[username];
            }
        });
    });

    // Raum erstellen
    socket.on('createRoom', (playerName) => {
        logger('INFO', `Creating room for player: ${playerName}`);

        // Prüfen ob der Spielername bereits in einem Raum ist
        if (userSocketMap[playerName]) {
            const existingSocketId = userSocketMap[playerName];
            // Wenn derselbe Spieler eine neue Verbindung herstellt
            if (existingSocketId !== socket.id) {
                logger('INFO', `Player ${playerName} already exists with socket ${existingSocketId}, updating to ${socket.id}`);
                // Alte Socket-Verbindung aufräumen
                const oldSocket = io.sockets.sockets.get(existingSocketId);
                if (oldSocket) {
                    oldSocket.disconnect();
                }
            }
        }

        // Spieler zur Mapping hinzufügen
        userSocketMap[playerName] = socket.id;

        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{
                id: socket.id,
                name: playerName,
                isHost: true,
                isReady: false
            }],
            status: 'waiting',
            gameData: null,
            createdAt: new Date().toISOString()
        };

        socket.join(roomCode);
        socket.roomCode = roomCode;
        logger('INFO', `Room ${roomCode} created by ${playerName}`);

        // Raum-Informationen an den Client senden
        socket.emit('roomCreated', roomCode, rooms[roomCode]);
        socket.emit('hostStatus', true);
    });

    // Raum beitreten
    socket.on('joinRoom', (roomCode, playerName) => {
        logger('INFO', `Player ${playerName} trying to join room ${roomCode}`);

        // Prüfen, ob der Raum existiert
        if (!rooms[roomCode]) {
            logger('ERROR', `Room ${roomCode} does not exist`);
            socket.emit('error', 'Raum existiert nicht');
            return;
        }

        // Prüfen, ob der Spielername bereits in der Mapping existiert
        if (userSocketMap[playerName]) {
            const existingSocketId = userSocketMap[playerName];
            // Wenn derselbe Spieler eine neue Verbindung herstellt
            if (existingSocketId !== socket.id) {
                logger('INFO', `Player ${playerName} already exists with socket ${existingSocketId}, updating to ${socket.id}`);

                // Überprüfen, ob der Spieler bereits in diesem Raum ist
                const existingPlayerInRoom = rooms[roomCode].players.find(p => p.id === existingSocketId);
                if (existingPlayerInRoom) {
                    // Socket-ID aktualisieren
                    existingPlayerInRoom.id = socket.id;

                    // Alte Socket-Verbindung aufräumen
                    const oldSocket = io.sockets.sockets.get(existingSocketId);
                    if (oldSocket) {
                        oldSocket.disconnect();
                    }

                    // Socket-Map aktualisieren
                    userSocketMap[playerName] = socket.id;

                    // Socket dem Raum beitreten lassen
                    socket.join(roomCode);
                    socket.roomCode = roomCode;

                    // Raum-Update an alle senden
                    io.to(roomCode).emit('roomUpdated', rooms[roomCode]);

                    // Host-Status setzen, falls nötig
                    if (existingPlayerInRoom.isHost) {
                        socket.emit('hostStatus', true);
                    }

                    logger('INFO', `Updated player ${playerName} socket in room ${roomCode}`);
                    return;
                }
            }
        }

        // Spieler zur Mapping hinzufügen
        userSocketMap[playerName] = socket.id;

        // Prüfen, ob der Spielername bereits im Raum ist
        const playerExists = rooms[roomCode].players.some(p => p.name === playerName);
        if (playerExists) {
            logger('ERROR', `Player name ${playerName} already exists in room ${roomCode}`);
            socket.emit('error', 'Spielername bereits im Raum vergeben');
            return;
        }

        // Prüfen, ob das Spiel bereits läuft
        if (rooms[roomCode].status === 'playing') {
            logger('ERROR', `Game in room ${roomCode} already in progress`);
            socket.emit('error', 'Spiel bereits im Gange');
            return;
        }

        // Spieler zum Raum hinzufügen
        rooms[roomCode].players.push({
            id: socket.id,
            name: playerName,
            isHost: false,
            isReady: false
        });

        socket.join(roomCode);
        socket.roomCode = roomCode;
        logger('INFO', `Player ${playerName} joined room ${roomCode}`);

        // Raum-Informationen an alle Spieler senden
        io.to(roomCode).emit('roomUpdated', rooms[roomCode]);
        socket.emit('roomJoined', roomCode, rooms[roomCode]);
    });

    // Spieler-Status ändern (bereit/nicht bereit)
    socket.on('toggleReady', (roomCode) => {
        logger('INFO', `Toggle ready status in room ${roomCode}`);

        // Prüfen, ob der Raum existiert
        if (!rooms[roomCode]) {
            logger('ERROR', `Room ${roomCode} does not exist`);
            socket.emit('error', 'Raum existiert nicht');
            return;
        }

        // Spieler im Raum finden
        const player = rooms[roomCode].players.find(p => p.id === socket.id);
        if (!player) {
            logger('ERROR', `Player with socket ${socket.id} not found in room ${roomCode}`);
            socket.emit('error', 'Spieler nicht im Raum');
            return;
        }

        // Bereit-Status umschalten
        player.isReady = !player.isReady;
        logger('INFO', `Player ${player.name} is now ${player.isReady ? 'ready' : 'not ready'}`);

        // Status an alle Spieler senden
        io.to(roomCode).emit('roomUpdated', rooms[roomCode]);
    });

    // Spiel starten
    socket.on('startGame', (roomCode) => {
        logger('INFO', `Attempt to start game in room ${roomCode}`);

        // Prüfen, ob der Raum existiert
        if (!rooms[roomCode]) {
            logger('ERROR', `Room ${roomCode} does not exist`);
            socket.emit('error', 'Raum existiert nicht');
            return;
        }

        // Prüfen, ob der Spieler der Host ist
        const player = rooms[roomCode].players.find(p => p.id === socket.id);
        if (!player || !player.isHost) {
            logger('ERROR', `Player with socket ${socket.id} is not the host of room ${roomCode}`);
            socket.emit('error', 'Nur der Host kann das Spiel starten');
            return;
        }

        // Prüfen, ob alle Spieler bereit sind (außer dem Host)
        const allReady = rooms[roomCode].players.every(p => p.isHost || p.isReady);
        if (!allReady) {
            logger('ERROR', `Not all players are ready in room ${roomCode}`);
            socket.emit('error', 'Nicht alle Spieler sind bereit');
            return;
        }

        // Mindestanzahl an Spielern prüfen
        if (rooms[roomCode].players.length < 2) {
            logger('ERROR', `Not enough players in room ${roomCode}`);
            socket.emit('error', 'Mindestens 2 Spieler benötigt');
            return;
        }

        // Spiel initialisieren
        rooms[roomCode].status = 'playing';
        rooms[roomCode].gameData = {
            currentRound: 1,
            maxRounds: 10,
            startTime: new Date().toISOString(),
            questions: [], // Hier würden die Fragen generiert
            scores: rooms[roomCode].players.map(p => ({
                playerId: p.id,
                playerName: p.name,
                score: 0
            }))
        };

        logger('INFO', `Game started in room ${roomCode}`);

        // Spielstart an alle Spieler senden
        io.to(roomCode).emit('gameStarted', rooms[roomCode]);
    });

    // Spiel verlassen
    socket.on('leaveRoom', () => {
        logger('INFO', `Player with socket ${socket.id} leaving room`);
        cleanupPlayer(socket.id);
    });

    // Spiel-spezifische Events würden hier folgen
    // ...
});

// Server starten
server.listen(PORT, () => {
    logger('INFO', `Server running on port ${PORT}`);
    logger('INFO', `Process ID: ${process.pid}`);
    logger('INFO', `Environment: ${NODE_ENV}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger('INFO', 'SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger('INFO', 'Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };