// socket-connection.js - Diese Datei im src-Verzeichnis erstellen

import { io } from 'socket.io-client';

// Zentrale Konfiguration für Socket.io
const SIGNALING_SERVER = 'https://mrx3k1.de'; // Absolute URL verwenden
const SOCKET_OPTIONS = {
    path: '/socket.io/', // Muss mit der NGINX-Konfiguration übereinstimmen
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
};

// Factory-Funktion zur Erstellung einer Socket-Verbindung
export const createSocketConnection = () => {
    try {
        console.log('Verbinde mit Signaling-Server:', SIGNALING_SERVER);
        const socket = io(SIGNALING_SERVER, SOCKET_OPTIONS);

        // Standard Event-Handler hinzufügen
        socket.on('connect', () => {
            console.log('Mit dem Signaling-Server verbunden. Socket ID:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Verbindungsfehler zum Signaling-Server:', error);
        });

        socket.on('disconnect', (reason) => {
            console.log('Vom Signaling-Server getrennt. Grund:', reason);
        });

        return socket;
    } catch (error) {
        console.error('Fehler beim Herstellen der Socket.io-Verbindung:', error);
        throw error;
    }
};

// Hilfsfunktion zum Aufräumen der Socket-Verbindung
export const cleanupSocketConnection = (socket) => {
    if (socket) {
        console.log('Räume Socket.io-Verbindung auf');
        try {
            // Alle benutzerdefinierten Event-Listener entfernen
            socket.off('roomCreated');
            socket.off('gameReady');
            socket.off('playerRole');
            socket.off('offer');
            socket.off('answer');
            socket.off('iceCandidate');
            socket.off('error');
            socket.off('peerDisconnected');

            // Verbindung trennen
            socket.disconnect();
        } catch (e) {
            console.error('Fehler beim Aufräumen der Socket-Verbindung:', e);
        }
    }
};