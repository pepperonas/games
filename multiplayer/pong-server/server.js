// server.js - WebRTC Signaling Server für Pong-Multiplayer
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const {v4: uuidv4} = require('uuid');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://mrx3k1.de", "https://www.mrx3k1.de", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 5000
});

// Speichert aktive Räume und verbundene Clients
const rooms = new Map();
const clients = new Map();

// Statische Dateien bereitstellen
app.use(express.static('public'));

// Grundlegende Serverroute
app.get('/', (req, res) => {
    res.send('Pong WebRTC Signaling Server läuft');
});

// Debug-Information für WebRTC-Pfad
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        rooms: Array.from(rooms.keys()),
        clients: Array.from(clients.keys()).length,
        timestamp: new Date().toISOString()
    });
});

// Zeitlimit für Räume - nach 30 Minuten automatisch aufräumen
const ROOM_CLEANUP_INTERVAL = 1800000; // 30 Minuten
setInterval(() => {
    const now = Date.now();
    // Lösche alte Räume
    for (const [roomId, room] of rooms.entries()) {
        if (now - room.createdAt > ROOM_CLEANUP_INTERVAL) {
            console.log(`Räume inaktiven Raum auf: ${roomId}`);

            // Benachrichtige aktive Clients im Raum
            if (room.creator && io.sockets.sockets.has(room.creator)) {
                io.to(room.creator).emit('error', {message: 'Raum ist abgelaufen'});
            }
            if (room.joiner && io.sockets.sockets.has(room.joiner)) {
                io.to(room.joiner).emit('error', {message: 'Raum ist abgelaufen'});
            }

            rooms.delete(roomId);
        }
    }
}, 300000); // Alle 5 Minuten überprüfen

// Socket.io Verbindungshandling
io.on('connection', (socket) => {
    console.log(`Neuer Client verbunden: ${socket.id}`);

    // Verbesserte Fehlerbehandlung
    socket.on('error', (error) => {
        console.error(`Socket-Fehler für Client ${socket.id}:`, error);
    });

    // Client wünscht ein neues Spiel zu erstellen
    socket.on('createRoom', () => {
        try {
            const roomId = uuidv4().substring(0, 8).toUpperCase(); // Kürzere, besser merkbare ID

            rooms.set(roomId, {
                creator: socket.id,
                joiner: null,
                status: 'waiting',
                createdAt: Date.now()
            });

            clients.set(socket.id, roomId);

            // Tritt dem Raum bei (für Socket.io-spezifische Nachrichten)
            socket.join(roomId);

            console.log(`Raum erstellt: ${roomId}`);
            socket.emit('roomCreated', {roomId});
        } catch (error) {
            console.error(`Fehler beim Erstellen des Raums für Client ${socket.id}:`, error);
            socket.emit('error', {message: 'Fehler beim Erstellen des Raums'});
        }
    });

    // Client will einem Raum beitreten
    socket.on('joinRoom', ({roomId}) => {
        console.log(`Client ${socket.id} versucht Raum ${roomId} beizutreten`);

        try {
            const room = rooms.get(roomId);

            if (!room) {
                console.log(`Raum ${roomId} existiert nicht`);
                socket.emit('error', {message: 'Raum existiert nicht'});
                return;
            }

            if (room.status !== 'waiting') {
                console.log(`Raum ${roomId} ist bereits voll`);
                socket.emit('error', {message: 'Raum ist bereits voll'});
                return;
            }

            // Raum aktualisieren
            room.joiner = socket.id;
            room.status = 'ready';
            clients.set(socket.id, roomId);

            // Tritt dem Raum bei (für Socket.io-spezifische Nachrichten)
            socket.join(roomId);

            console.log(`Client ${socket.id} ist Raum ${roomId} beigetreten`);

            // Informiere beide Spieler, dass das Spiel bereit ist
            io.to(roomId).emit('gameReady', {roomId});
            io.to(room.creator).emit('playerRole', {isHost: true});
            io.to(room.joiner).emit('playerRole', {isHost: false});
        } catch (error) {
            console.error(`Fehler beim Betreten des Raums ${roomId} für Client ${socket.id}:`, error);
            socket.emit('error', {message: 'Fehler beim Betreten des Raums'});
        }
    });

    // Umleitung von WebRTC-Signaling-Nachrichten zwischen Peers
    socket.on('offer', (data) => {
        try {
            const roomId = clients.get(socket.id);
            if (!roomId) {
                console.log('Angebot: Kein Raum für Client gefunden', socket.id);
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                console.log('Angebot: Raum nicht gefunden', roomId);
                return;
            }

            const targetId = socket.id === room.creator ? room.joiner : room.creator;
            if (!targetId || !io.sockets.sockets.has(targetId)) {
                console.log(`Ziel-Client ${targetId} nicht mehr verbunden`);
                socket.emit('error', {message: 'Gegner nicht mehr verbunden'});
                return;
            }

            console.log(`Leite Angebot weiter von ${socket.id} zu ${targetId}`);
            io.to(targetId).emit('offer', data);
        } catch (error) {
            console.error(`Fehler bei der Angebotsweiterleitung für Client ${socket.id}:`, error);
        }
    });

    socket.on('answer', (data) => {
        try {
            const roomId = clients.get(socket.id);
            if (!roomId) {
                console.log('Antwort: Kein Raum für Client gefunden', socket.id);
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                console.log('Antwort: Raum nicht gefunden', roomId);
                return;
            }

            const targetId = socket.id === room.creator ? room.joiner : room.creator;
            if (!targetId || !io.sockets.sockets.has(targetId)) {
                console.log(`Ziel-Client ${targetId} nicht mehr verbunden`);
                socket.emit('error', {message: 'Gegner nicht mehr verbunden'});
                return;
            }

            console.log(`Leite Antwort weiter von ${socket.id} zu ${targetId}`);
            io.to(targetId).emit('answer', data);
        } catch (error) {
            console.error(`Fehler bei der Antwortweiterleitung für Client ${socket.id}:`, error);
        }
    });

    socket.on('iceCandidate', (data) => {
        try {
            const roomId = clients.get(socket.id);
            if (!roomId) {
                console.log('ICE-Kandidat: Kein Raum für Client gefunden', socket.id);
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                console.log('ICE-Kandidat: Raum nicht gefunden', roomId);
                return;
            }

            const targetId = socket.id === room.creator ? room.joiner : room.creator;
            if (!targetId || !io.sockets.sockets.has(targetId)) {
                console.log(`Ziel-Client ${targetId} nicht mehr verbunden`);
                // Bei ICE-Kandidaten kein Fehler an den Client, nur Logging
                return;
            }

            console.log(`Leite ICE-Kandidat weiter von ${socket.id} zu ${targetId}`);
            io.to(targetId).emit('iceCandidate', data);
        } catch (error) {
            console.error(`Fehler bei der ICE-Kandidatenweiterleitung für Client ${socket.id}:`, error);
        }
    });

    // Verbindung getrennt
    socket.on('disconnect', () => {
        console.log(`Client getrennt: ${socket.id}`);

        try {
            const roomId = clients.get(socket.id);
            if (roomId) {
                const room = rooms.get(roomId);

                if (room) {
                    // Informiere den anderen Spieler über die Trennung
                    if (room.creator === socket.id && room.joiner) {
                        if (io.sockets.sockets.has(room.joiner)) {
                            io.to(room.joiner).emit('peerDisconnected');
                        }
                    } else if (room.joiner === socket.id && room.creator) {
                        if (io.sockets.sockets.has(room.creator)) {
                            io.to(room.creator).emit('peerDisconnected');
                        }
                    }

                    // Raum aufräumen, wenn beide Spieler weg sind
                    if (room.creator === socket.id) {
                        room.creator = null;
                    } else if (room.joiner === socket.id) {
                        room.joiner = null;
                    }

                    // Raum löschen, wenn leer
                    if (!room.creator && !room.joiner) {
                        console.log(`Lösche leeren Raum: ${roomId}`);
                        rooms.delete(roomId);
                    } else {
                        // Raum wieder auf "wartet" setzen, wenn ein Spieler geht
                        room.status = 'waiting';
                    }
                }

                clients.delete(socket.id);
            }
        } catch (error) {
            console.error(`Fehler bei der Trennung für Client ${socket.id}:`, error);
        }
    });
});

// Server starten
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Signaling-Server läuft auf Port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('Server wird heruntergefahren...');
    server.close(() => {
        console.log('Server wurde sauber beendet.');
        process.exit(0);
    });
});