// socketService.js - Frontend-Service für Socket.io-Verbindungen

import io from 'socket.io-client';

// Zentrale Socket-Instanz
let socket = null;
let activeListeners = new Set();

/**
 * Initialisiert die Socket-Verbindung, falls sie noch nicht existiert oder getrennt ist
 * @returns {Socket} Die Socket-Instanz
 */
export const initializeSocket = () => {
    // Verbindung nur initialisieren, wenn sie noch nicht existiert oder getrennt ist
    if (!socket || !socket.connected) {
        // Alte Socket-Verbindung entfernen, falls vorhanden
        if (socket) {
            console.log('Disconnecting existing socket before creating a new one');
            socket.disconnect();
            socket.removeAllListeners();
        }

        // Vollständige URL mit Basis-Pfad
        const socketUrl = '/games/brain-buster/api';

        console.log(`Initializing socket connection to ${socketUrl}`);

        // Socket mit verbesserten Optionen initialisieren
        socket = io(socketUrl, {
            transports: ['websocket'],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
            query: {
                clientTime: Date.now() // Verhindert Caching-Probleme
            }
        });

        // Standard-Debug-Event-Listener
        socket.on('connect', () => {
            console.log('Socket connected with ID:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(`Fehler: ${error}`);
        });
    } else {
        console.log('Reusing existing socket connection:', socket.id);
    }

    return socket;
};

/**
 * Registriert Event-Listener für die Socket-Verbindung
 * @param {Object} callbacks - Objekt mit Event-Namen als Keys und Callback-Funktionen als Values
 */
export const registerSocketListeners = (callbacks) => {
    const socket = initializeSocket();

    // Zuerst alle bestehenden Listener für die angegebenen Events entfernen
    Object.keys(callbacks).forEach(event => {
        if (activeListeners.has(event)) {
            console.log(`Removing existing listener for event: ${event}`);
            socket.off(event);
            activeListeners.delete(event);
        }
    });

    // Dann neue Listener registrieren und im Set speichern
    Object.entries(callbacks).forEach(([event, callback]) => {
        console.log(`Registering listener for event: ${event}`);
        socket.on(event, callback);
        activeListeners.add(event);
    });
};

/**
 * Sendet ein Event an den Server
 * @param {string} event - Event-Name
 * @param {...any} args - Event-Argumente
 */
export const emitEvent = (event, ...args) => {
    const socket = initializeSocket();
    console.log(`Emitting event: ${event}`, args);
    socket.emit(event, ...args);
};

/**
 * Erstellt einen neuen Spielraum
 * @param {string} playerName - Name des Spielers
 */
export const createRoom = (playerName) => {
    const socket = initializeSocket();
    console.log(`Creating room for player: ${playerName}`);
    socket.emit('createRoom', playerName);
};

/**
 * Tritt einem existierenden Spielraum bei
 * @param {string} roomCode - Raum-Code
 * @param {string} playerName - Name des Spielers
 */
export const joinRoom = (roomCode, playerName) => {
    const socket = initializeSocket();
    console.log(`Joining room ${roomCode} as player: ${playerName}`);
    socket.emit('joinRoom', roomCode, playerName);
};

/**
 * Schaltet den Bereit-Status des Spielers um
 * @param {string} roomCode - Raum-Code
 */
export const toggleReady = (roomCode) => {
    const socket = initializeSocket();
    console.log(`Toggling ready status in room: ${roomCode}`);
    socket.emit('toggleReady', roomCode);
};

/**
 * Startet das Spiel (nur für den Host)
 * @param {string} roomCode - Raum-Code
 */
export const startGame = (roomCode) => {
    const socket = initializeSocket();
    console.log(`Starting game in room: ${roomCode}`);
    socket.emit('startGame', roomCode);
};

/**
 * Verlässt den aktuellen Raum
 */
export const leaveRoom = () => {
    const socket = initializeSocket();
    console.log('Leaving current room');
    socket.emit('leaveRoom');
};

/**
 * Entfernt alle Event-Listener, behält aber die Verbindung
 */
export const cleanupListeners = () => {
    if (socket) {
        console.log('Cleaning up all socket listeners');
        activeListeners.forEach(event => {
            socket.off(event);
        });
        activeListeners.clear();
    }
};

/**
 * Trennt die Socket-Verbindung vollständig
 */
export const disconnectSocket = () => {
    if (socket) {
        console.log('Disconnecting socket');
        socket.disconnect();
        socket = null;
        activeListeners.clear();
    }
};

export default {
    initializeSocket,
    registerSocketListeners,
    emitEvent,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    leaveRoom,
    cleanupListeners,
    disconnectSocket
};