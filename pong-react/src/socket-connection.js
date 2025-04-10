// socket-connection.js - Socket.io-Verbindungsverwaltung

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

// Singleton-Objekt für die Socket-Verbindung
export const socketManager = {
    socket: null,
    roomId: null,
    isHost: false,
    connectionCount: 0,

    // Socket-Verbindung holen oder erstellen
    getSocket() {
        if (!this.socket) {
            console.log('⚡ SocketManager: Erstelle neue Socket.io-Verbindung');
            try {
                this.socket = io(SIGNALING_SERVER, SOCKET_OPTIONS);

                // Standardmäßige Event-Handler hinzufügen
                this.socket.on('connect', () => {
                    console.log('⚡ SocketManager: Verbunden mit ID:', this.socket.id);
                    this.connectionCount++;
                });

                this.socket.on('connect_error', (error) => {
                    console.error('⚡ SocketManager: Verbindungsfehler:', error);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('⚡ SocketManager: Verbindung getrennt. Grund:', reason);
                });
            } catch (error) {
                console.error('⚡ SocketManager: Fehler beim Verbinden:', error);
                throw error;
            }
        } else {
            console.log('⚡ SocketManager: Verwende bestehende Socket-Verbindung, ID:', this.socket.id);
        }

        return this.socket;
    },

    // Raum-ID setzen
    setRoomId(id) {
        console.log('⚡ SocketManager: Speichere Raum-ID:', id);
        this.roomId = id;
    },

    // Host-Status setzen
    setIsHost(host) {
        console.log('⚡ SocketManager: Setze Host-Status auf:', host);
        this.isHost = host;
    },

    // Socket-Verbindung trennen und Zustand zurücksetzen
    cleanup() {
        if (this.socket) {
            console.log('⚡ SocketManager: Trenne Socket-Verbindung und setze Zustand zurück');

            // Alle Standard-Events entfernen
            this.socket.off('roomCreated');
            this.socket.off('gameReady');
            this.socket.off('playerRole');
            this.socket.off('offer');
            this.socket.off('answer');
            this.socket.off('iceCandidate');
            this.socket.off('error');
            this.socket.off('peerDisconnected');

            // Verbindung trennen
            this.socket.disconnect();
            this.socket = null;
            this.roomId = null;
            this.isHost = false;
        }
    },

    // Debug-Info ausgeben
    logStatus() {
        console.log('⚡ SocketManager Status:');
        console.log('  • Verbunden:', this.socket ? 'Ja' : 'Nein');
        if (this.socket) {
            console.log('  • Socket ID:', this.socket.id);
            console.log('  • Socket verbunden:', this.socket.connected);
        }
        console.log('  • Raum-ID:', this.roomId);
        console.log('  • Host:', this.isHost);
        console.log('  • Verbindungszähler:', this.connectionCount);
    }
};

// Legacy-Funktionen für Abwärtskompatibilität
export const createSocketConnection = () => {
    console.log('⚠️ Veraltete Funktion: createSocketConnection wird durch socketManager ersetzt');
    return socketManager.getSocket();
};

export const cleanupSocketConnection = (socket) => {
    console.log('⚠️ Veraltete Funktion: cleanupSocketConnection wird durch socketManager ersetzt');
    // Nur lokales Aufräumen, nicht die globale Socket-Instanz trennen
    if (socket) {
        socket.off('roomCreated');
        socket.off('gameReady');
        socket.off('playerRole');
        socket.off('offer');
        socket.off('answer');
        socket.off('iceCandidate');
        socket.off('error');
        socket.off('peerDisconnected');
    }
};