// Canvas und Kontext einholen
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// HTML-Elemente
const scoreDisplay = document.getElementById('score-display');
const connectionStatus = document.getElementById('connection-status');
const connectionStatusValue = document.getElementById('connection-status-value');
const pingDisplay = document.getElementById('ping-display');
const pingValue = document.getElementById('ping-value');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const onlineConnectionScreen = document.getElementById('online-connection');
const winnerText = document.getElementById('winner-text');
const restartBtn = document.getElementById('restart-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');
const easyBtn = document.getElementById('easy-btn');
const mediumBtn = document.getElementById('medium-btn');
const hardBtn = document.getElementById('hard-btn');
const multiplayerLocalBtn = document.getElementById('multiplayer-local-btn');
const multiplayerOnlineBtn = document.getElementById('multiplayer-online-btn');
const backBtn = document.getElementById('back-btn');
const connectBtn = document.getElementById('connect-btn');
const connectionIdDisplay = document.getElementById('connection-id');
const connectionInput = document.getElementById('connection-input');
const copyBtn = document.getElementById('copy-btn');
const waitingMessage = document.getElementById('waiting-message');
const errorMessage = document.getElementById('error-message');
const hostSection = document.getElementById('host-section');
const joinSection = document.getElementById('join-section');
const forceStartBtn = document.getElementById('force-start-btn');
const debugInfo = document.getElementById('debug-info');

// Spielkonstanten
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 15;
const BALL_RADIUS = 10;
const WINNING_SCORE = 5;

// Spielvariablen
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = 5;
let ballSpeedY = 2;
let leftPaddleY = canvas.height / 2 - PADDLE_HEIGHT / 2;
let rightPaddleY = canvas.height / 2 - PADDLE_HEIGHT / 2;
let leftScore = 0;
let rightScore = 0;
let isGameRunning = false;
let computerSpeed = 3; // Standard-Schwierigkeit: Mittel
let gameMode = 'singleplayer'; // 'singleplayer', 'local-multiplayer', 'online-multiplayer'

// WebRTC und Netzwerkvariablen
const SIGNALING_SERVER = 'https://mrx3k1.de'; // Kein Port angeben, da wir den Proxy nutzen
let socket = null;
let peerConnection = null;
let dataChannel = null;
let roomId = null;
let isHost = false;
let lastPingTime = 0;
let pingInterval = null;
let lastReceivedState = null;
let syncInterval = null;

// Steuerungsvariablen
let wPressed = false;
let sPressed = false;
let upPressed = false;
let downPressed = false;
let mousePosition = {
    y: canvas.height / 2
};

// Event-Listener für Tastatursteuerung
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

// Event-Listener für Maussteuerung
canvas.addEventListener('mousemove', mouseMoveHandler);

// Event-Listener für Schwierigkeitsgrade und Spielmodi
easyBtn.addEventListener('click', () => startSinglePlayerGame(2));
mediumBtn.addEventListener('click', () => startSinglePlayerGame(3));
hardBtn.addEventListener('click', () => startSinglePlayerGame(5));
multiplayerLocalBtn.addEventListener('click', startLocalMultiplayerGame);
multiplayerOnlineBtn.addEventListener('click', setupOnlineMultiplayer);
restartBtn.addEventListener('click', resetGame);
mainMenuBtn.addEventListener('click', returnToMainMenu);
backBtn.addEventListener('click', returnToMainMenu);
connectBtn.addEventListener('click', connectToRoom);
copyBtn.addEventListener('click', copyRoomIdToClipboard);
document.getElementById('reset-connection-btn').addEventListener('click', resetSocketConnection);
forceStartBtn.addEventListener('click', forceStartGame);

// Debug-Funktion für Logging
function logDebug(message) {
    console.log(message);
    debugInfo.textContent = message;
    setTimeout(() => {
        debugInfo.textContent = '';
    }, 5000);
}

// Timeout-Manager für verbesserte Fehlerbehandlung
class ConnectionTimeoutManager {
    constructor() {
        this.timeouts = new Map();
    }

    setTimeout(id, callback, delay) {
        this.clearTimeout(id);
        const timeoutId = setTimeout(() => {
            callback();
            this.timeouts.delete(id);
        }, delay);
        this.timeouts.set(id, timeoutId);
        return timeoutId;
    }

    clearTimeout(id) {
        if (this.timeouts.has(id)) {
            clearTimeout(this.timeouts.get(id));
            this.timeouts.delete(id);
        }
    }

    clearAll() {
        this.timeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.timeouts.clear();
    }
}

// Initialisiere den Timeout-Manager
const timeoutManager = new ConnectionTimeoutManager();

// Funktion zum Kopieren der Raum-ID in die Zwischenablage
function copyRoomIdToClipboard() {
    navigator.clipboard.writeText(connectionIdDisplay.textContent)
        .then(() => {
            copyBtn.textContent = "Kopiert!";
            setTimeout(() => {
                copyBtn.textContent = "Kopieren";
            }, 2000);
        })
        .catch(err => {
            console.error('Fehler beim Kopieren: ', err);
        });
}

// WebRTC-Setup und Socket.io-Verbindung
function setupOnlineMultiplayer() {
    logDebug('🎮 Starte Online-Multiplayer Setup');
    startScreen.style.display = 'none';
    onlineConnectionScreen.style.display = 'flex';

    // Wenn es eine alte Verbindung gibt, diese zuerst trennen
    if (socket && socket.connected) {
        logDebug('🔌 Trenne bestehende Socket.io-Verbindung');
        try {
            socket.disconnect();
        } catch (e) {
            console.error('Fehler beim Trennen der bestehenden Verbindung:', e);
        }
        socket = null;
    }

    // Verbindung zum Signaling-Server herstellen
    logDebug('🔌 Verbinde mit Signaling-Server: ' + SIGNALING_SERVER);

    try {
        socket = io(SIGNALING_SERVER, {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });
    } catch (error) {
        logDebug('❌ Fehler beim Herstellen der Socket.io-Verbindung: ' + error.message);
        showError('Verbindungsfehler: ' + error.message);
        return;
    }

    // Socket.io Event-Handler
    socket.on('connect', () => {
        logDebug('🔌 Mit dem Signaling-Server verbunden. Socket ID: ' + socket.id);
        errorMessage.style.display = 'none';
        // Raum erstellen, sobald verbunden
        createRoom();
    });

    socket.on('roomCreated', ({roomId: newRoomId}) => {
        roomId = newRoomId;
        connectionIdDisplay.textContent = roomId;
        logDebug(`🏠 Raum erstellt: ${roomId}`);
    });

    socket.on('gameReady', (data) => {
        logDebug('⭐ Spiel ist bereit! ' + JSON.stringify(data));
        waitingMessage.textContent = 'Verbunden! Spiel startet...';
        waitingMessage.classList.remove('pulse');

        // WebRTC-Verbindung initialisieren
        initializePeerConnection();

        // Wenn Host, SDP-Angebot senden
        if (isHost) {
            logDebug('⭐ Ich bin Host, erstelle Angebot');
            createOffer();
        } else {
            logDebug('⭐ Ich bin Gast, warte auf Angebot');
        }
    });

    socket.on('playerRole', ({isHost: role}) => {
        isHost = role;
        logDebug(`👑 Spielerrolle: ${isHost ? 'Host' : 'Gast'}`);
    });

    socket.on('offer', async (data) => {
        logDebug('📩 SDP-Angebot empfangen');
        if (!peerConnection) initializePeerConnection();
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            logDebug('📩 Remote-Beschreibung gesetzt, erstelle Antwort');
            const answer = await peerConnection.createAnswer();
            logDebug('📩 SDP-Antwort erstellt');
            await peerConnection.setLocalDescription(answer);
            logDebug('📩 Lokale Beschreibung gesetzt, sende Antwort');
            socket.emit('answer', peerConnection.localDescription);
        } catch (error) {
            console.error('📩 Fehler beim Verarbeiten des Angebots:', error);
            showError('Verbindungsproblem: ' + error.message);
        }
    });

    socket.on('answer', async (data) => {
        logDebug('📩 SDP-Antwort empfangen');
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            logDebug('📩 Remote-Beschreibung gesetzt');
        } catch (error) {
            console.error('📩 Fehler beim Verarbeiten der Antwort:', error);
            showError('Verbindungsproblem: ' + error.message);
        }
    });

    socket.on('iceCandidate', (data) => {
        logDebug('🧊 ICE-Kandidat empfangen');
        try {
            peerConnection.addIceCandidate(new RTCIceCandidate(data))
                .then(() => logDebug('🧊 ICE-Kandidat hinzugefügt'))
                .catch(e => console.error('🧊 Fehler beim Hinzufügen des ICE-Kandidaten:', e));
        } catch (error) {
            console.error('🧊 Fehler beim Hinzufügen des ICE-Kandidaten:', error);
        }
    });

    socket.on('error', ({message}) => {
        console.error('❌ Server-Fehler:', message);
        showError(message);
    });

    socket.on('peerDisconnected', () => {
        logDebug('👋 Gegner hat Verbindung getrennt');
        showError('Dein Gegner hat die Verbindung getrennt.');
        cleanupWebRTC();
        setTimeout(() => {
            returnToMainMenu();
        }, 3000);
    });

    socket.on('connect_error', (error) => {
        console.error('🔌 Verbindungsfehler zum Signaling-Server:', error);
        showError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.');
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Vom Signaling-Server getrennt. Grund:', reason);
        if (reason === 'io server disconnect') {
            // Der Server hat die Verbindung getrennt
            showError('Der Server hat die Verbindung getrennt.');
        } else if (reason === 'transport close') {
            // Die Verbindung wurde geschlossen (z.B. durch Netzwerkprobleme)
            showError('Verbindung zum Server verloren.');
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Neu verbunden mit dem Server nach ${attemptNumber} Versuchen`);
        errorMessage.style.display = 'none';
    });

    socket.on('reconnect_failed', () => {
        console.error('🔄 Neuverbindung zum Server fehlgeschlagen');
        showError('Neuverbindung zum Server fehlgeschlagen. Bitte lade die Seite neu.');
    });
}

// Zeigt eine Fehlermeldung an
function showError(message) {
    console.error('❌ Fehler:', message);
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Erstellt einen neuen Raum
function createRoom() {
    console.log('🏠 Erstelle neuen Spielraum');
    connectionIdDisplay.textContent = 'Wird generiert...';
    waitingMessage.style.display = 'block';
    waitingMessage.textContent = 'Warte auf Verbindung...';
    waitingMessage.classList.add('pulse');
    hostSection.style.display = 'block';
    joinSection.style.display = 'block';

    socket.emit('createRoom');
}

// Tritt einem existierenden Raum bei
function connectToRoom() {
    const roomIdInput = connectionInput.value.trim().toUpperCase();

    if (!roomIdInput) {
        showError('Bitte gib eine Verbindungs-ID ein');
        return;
    }

    console.log('🏠 Versuche Raum beizutreten:', roomIdInput);
    roomId = roomIdInput;
    connectionInput.disabled = true;
    connectBtn.disabled = true;
    connectBtn.textContent = 'Verbinde...';

    socket.emit('joinRoom', {roomId});
}

// Initialisiere WebRTC Peer Connection
function initializePeerConnection() {
    // ICE-Server-Konfiguration
    const configuration = {
        iceServers: [
            {urls: 'stun:stun.l.google.com:19302'},
            {urls: 'stun:stun1.l.google.com:19302'},
            {urls: 'stun:stun2.l.google.com:19302'}
        ]
    };

    console.log('🔄 Initialisiere Peer Connection');

    // Bestehende Verbindung aufräumen, falls vorhanden
    if (peerConnection) {
        console.log('🧹 Bestehende Peer-Verbindung wird geschlossen');
        try {
            peerConnection.close();
        } catch (e) {
            console.error('Fehler beim Schließen der bestehenden Verbindung', e);
        }
        peerConnection = null;
    }

    try {
        peerConnection = new RTCPeerConnection(configuration);
    } catch (e) {
        console.error('Fehler beim Erstellen der RTCPeerConnection:', e);
        showError('Verbindungsproblem: ' + e.message);
        return;
    }

    // Timeout für die Verbindung (falls sie zu lange dauert)
    const connectionTimeout = setTimeout(() => {
        console.error('⏱️ WebRTC-Verbindungstimeout');
        showError('Verbindungstimeout. Bitte versuche es erneut.');

        // In Produktion würde man hier abbrechen, für Testzwecke starten wir das Spiel trotzdem
        logDebug('⚠️ Notfall-Fallback: Starte Spiel trotz fehlender Verbindung');
    }, 20000);

    // Event Handler
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('🧊 Neuer ICE-Kandidat gefunden');
            socket.emit('iceCandidate', event.candidate);
        } else {
            console.log('🧊 ICE-Kandidatensammlung abgeschlossen');
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE-Status geändert:', peerConnection.iceConnectionState);
        connectionStatusValue.textContent = peerConnection.iceConnectionState;

        if (peerConnection.iceConnectionState === 'connected' ||
            peerConnection.iceConnectionState === 'completed') {
            console.log('🧊 ICE-Verbindung hergestellt!');
            clearTimeout(connectionTimeout);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('🔄 Verbindungsstatus geändert:', peerConnection.connectionState);

        if (peerConnection.connectionState === 'connected') {
            console.log('🔄 Vollständig verbunden!');
            clearTimeout(connectionTimeout);
        } else if (peerConnection.connectionState === 'failed') {
            console.error('🔄 Verbindung fehlgeschlagen!');
            clearTimeout(connectionTimeout);
            showError('WebRTC-Verbindung fehlgeschlagen. Bitte versuche es erneut.');
        }
    };

    // Datenkanal einrichten mit Fehlerbehandlung
    try {
        if (isHost) {
            console.log('📢 Erstelle Datenkanal (Host)');
            dataChannel = peerConnection.createDataChannel('gameData', {
                ordered: true
            });
            setupDataChannel();
        } else {
            console.log('📢 Warte auf Datenkanal (Gast)');
            peerConnection.ondatachannel = (event) => {
                console.log('📢 Datenkanal empfangen');
                dataChannel = event.channel;
                setupDataChannel();
            };
        }
    } catch (error) {
        console.error('📢 Fehler beim Einrichten des Datenkanals:', error);
        showError('Fehler beim Einrichten der Spielverbindung: ' + error.message);
    }
}

// Erzwungener Spielstart ohne eine erfolgreiche WebRTC-Verbindung
function forceStartGame() {
    console.log('⚡ Erzwinge Spielstart ohne Datenkanal');

    // Warnmeldung anzeigen
    showError('Eingeschränkter Spielmodus: Synchronisierung könnte fehlerhaft sein');

    // Direkt zum Spiel wechseln
    startOnlineMultiplayerGame();
}

// Datenkanal-Event-Handler einrichten
function setupDataChannel() {
    console.log('📢 Richte Datenkanal ein. Status:', dataChannel.readyState);

    dataChannel.onopen = () => {
        console.log('📢 Datenkanal geöffnet!');
        connectionStatus.style.display = 'block';
        connectionStatusValue.textContent = 'Verbunden';

        // Ping-Messung starten
        startPingMeasurement();

        // Starte das Spiel sofort
        startOnlineMultiplayerGame();
    };

    dataChannel.onclose = () => {
        console.log('📢 Datenkanal geschlossen');
        connectionStatus.style.display = 'none';
        pingDisplay.style.display = 'none';
    };

    dataChannel.onerror = (error) => {
        console.error('📢 Datenkanal-Fehler:', error);
        showError('Kommunikationsfehler: ' + error.message);
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'ping') {
                // Ping-Anfrage - sende sofort Antwort zurück
                sendData({type: 'pong', id: data.id});
            } else if (data.type === 'pong') {
                // Ping-Antwort - berechne Latenz
                const latency = Date.now() - data.id;
                pingValue.textContent = latency;
            } else if (data.type === 'gameState') {
                // Spielzustand vom anderen Spieler
                lastReceivedState = data;

                // Update der Gegnerposition
                if (isHost) {
                    rightPaddleY = data.paddleY;
                } else {
                    leftPaddleY = data.paddleY;
                }

                // Wenn Host, synchronisiere Ball und Punkte
                if (!isHost && data.ballX !== undefined) {
                    ballX = data.ballX;
                    ballY = data.ballY;
                    ballSpeedX = data.ballSpeedX;
                    ballSpeedY = data.ballSpeedY;
                    leftScore = data.leftScore;
                    rightScore = data.rightScore;

                    updateScore();
                }
            }
        } catch (error) {
            console.error('📢 Fehler beim Verarbeiten der Nachricht:', error);
        }
    };
}

// Ping-Messung starten
function startPingMeasurement() {
    console.log('📊 Starte Ping-Messung');
    pingDisplay.style.display = 'block';

    // Ping alle 2 Sekunden senden
    pingInterval = setInterval(() => {
        const pingId = Date.now();
        sendData({type: 'ping', id: pingId});
    }, 2000);
}

// SDP-Angebot erstellen (für WebRTC-Verbindung)
async function createOffer() {
    try {
        console.log('📤 Erstelle SDP-Angebot');
        const offer = await peerConnection.createOffer();
        console.log('📤 SDP-Angebot erstellt');
        await peerConnection.setLocalDescription(offer);
        console.log('📤 Lokale Beschreibung gesetzt, sende an Signaling-Server');
        socket.emit('offer', peerConnection.localDescription);
    } catch (error) {
        console.error('📤 Fehler beim Erstellen des Angebots:', error);
        showError('Verbindungsfehler: ' + error.message);
    }
}

// Hilfsfunktion zum Senden von Daten über den Datenkanal
function sendData(data) {
    if (dataChannel && dataChannel.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify(data));
        } catch (error) {
            console.error('📤 Fehler beim Senden von Daten:', error);
        }
    } else {
        console.warn('📤 Datenkanal nicht bereit. Status:', dataChannel ? dataChannel.readyState : 'nicht initialisiert');
    }
}

// Spieldaten synchronisieren
function sendGameState() {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        return;
    }

    const gameState = {
        type: 'gameState',
        paddleY: isHost ? leftPaddleY : rightPaddleY
    };

    // Host sendet zusätzlich Ball- und Punktestand-Daten
    if (isHost) {
        gameState.ballX = ballX;
        gameState.ballY = ballY;
        gameState.ballSpeedX = ballSpeedX;
        gameState.ballSpeedY = ballSpeedY;
        gameState.leftScore = leftScore;
        gameState.rightScore = rightScore;
    }

    sendData(gameState);
}

// WebRTC-Verbindung aufräumen
function cleanupWebRTC() {
    console.log('🧹 Räume WebRTC-Ressourcen auf');

    // Intervalle stoppen
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }

    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }

    // Datenkanal schließen
    if (dataChannel) {
        console.log('🧹 Schließe Datenkanal');
        try {
            dataChannel.close();
        } catch (e) {
            console.error('Fehler beim Schließen des Datenkanals:', e);
        }
        dataChannel = null;
    }

    // Peer Connection schließen
    if (peerConnection) {
        console.log('🧹 Schließe Peer-Verbindung');
        try {
            peerConnection.close();
        } catch (e) {
            console.error('Fehler beim Schließen der Peer-Verbindung:', e);
        }
        peerConnection = null;
    }

    // Socket.io-Verbindung zurücksetzen (aber nicht schließen)
    if (socket) {
        console.log('🧹 Setze Socket.io-Verbindung zurück');
        // Entferne alle Listener bis auf 'connect', 'disconnect' und 'connect_error'
        socket.off('roomCreated');
        socket.off('gameReady');
        socket.off('playerRole');
        socket.off('offer');
        socket.off('answer');
        socket.off('iceCandidate');
        socket.off('error');
        socket.off('peerDisconnected');
    }

    // Zurücksetzen der WebRTC-bezogenen Variablen
    isHost = false;
    roomId = null;
    lastReceivedState = null;

    // UI-Elemente zurücksetzen
    connectionStatus.style.display = 'none';
    pingDisplay.style.display = 'none';
}

// Startfunktion für den Einzelspielermodus
function startSinglePlayerGame(difficulty) {
    gameMode = 'singleplayer';
    computerSpeed = difficulty;
    isGameRunning = true;
    startScreen.style.display = 'none';
    scoreDisplay.textContent = `Spieler: 0 | Computer: 0`;
    resetGame();
    gameLoop();
}

// Startfunktion für den lokalen Mehrspielermodus
function startLocalMultiplayerGame() {
    gameMode = 'local-multiplayer';
    isGameRunning = true;
    startScreen.style.display = 'none';
    scoreDisplay.textContent = `Spieler 1: 0 | Spieler 2: 0`;
    resetGame();
    gameLoop();
}

// Zum Hauptmenü zurückkehren
function returnToMainMenu() {
    console.log('🏠 Kehre zum Hauptmenü zurück');

    // Spiel zurücksetzen
    isGameRunning = false;

    // WebRTC aufräumen, wenn nötig
    if (gameMode === 'online-multiplayer') {
        cleanupWebRTC();
    }

    // Timeouts aufräumen
    timeoutManager.clearAll();

    // Bildschirme zurücksetzen
    onlineConnectionScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'flex';

    // Verbindungsinformationen zurücksetzen
    connectionInput.value = '';
    connectionInput.disabled = false;
    connectBtn.disabled = false;
    connectBtn.textContent = 'Verbinden';
    waitingMessage.style.display = 'block';
    waitingMessage.textContent = 'Warte auf Verbindung...';
    waitingMessage.classList.add('pulse');
    errorMessage.style.display = 'none';

    // GameMode zurücksetzen
    gameMode = 'singleplayer';
}

// Startet das Online-Multiplayerspiel
function startOnlineMultiplayerGame() {
    console.log('⭐ Starte Online-Multiplayerspiel. isHost:', isHost);
    gameMode = 'online-multiplayer';
    isGameRunning = true;
    onlineConnectionScreen.style.display = 'none';

    if (isHost) {
        scoreDisplay.textContent = `Du (links): 0 | Gegner: 0`;
    } else {
        scoreDisplay.textContent = `Gegner: 0 | Du (rechts): 0`;
    }

    resetGame();

    // Starte Synchronisierung des Spielzustands
    syncInterval = setInterval(() => {
        if (isGameRunning) {
            sendGameState();
        }
    }, 16); // ca. 60 FPS

    gameLoop();
}

function resetSocketConnection() {
    console.log('🔄 Setze Socket.io-Verbindung vollständig zurück');

    if (socket) {
        try {
            socket.disconnect();
        } catch (e) {
            console.error('Fehler beim Trennen der Socket-Verbindung:', e);
        }
        socket = null;
    }

    // Verzögerte Neuverbindung
    setTimeout(() => {
        setupOnlineMultiplayer();
    }, 500);
}

// Steuerungsfunktionen
function keyDownHandler(e) {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
        upPressed = true;
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
        downPressed = true;
    } else if (e.key === 'w' || e.key === 'W') {
        wPressed = true;
    } else if (e.key === 's' || e.key === 'S') {
        sPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
        upPressed = false;
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
        downPressed = false;
    } else if (e.key === 'w' || e.key === 'W') {
        wPressed = false;
    } else if (e.key === 's' || e.key === 'S') {
        sPressed = false;
    }
}

function mouseMoveHandler(e) {
    const relativeY = e.clientY - canvas.getBoundingClientRect().top;
    mousePosition.y = relativeY;
}

// Funktion zum Zurücksetzen des Spiels
function resetGame() {
    // Stoppe die aktuelle Spielschleife, falls sie läuft
    isGameRunning = false;

    // Warte einen Frame, damit die alte Schleife wirklich stoppt
    setTimeout(() => {
        // Setze Spielvariablen zurück
        leftScore = 0;
        rightScore = 0;
        leftPaddleY = canvas.height / 2 - PADDLE_HEIGHT / 2;
        rightPaddleY = canvas.height / 2 - PADDLE_HEIGHT / 2;
        resetBall();

        // Verstecke Game-Over-Screen
        gameOverScreen.style.display = 'none';

        // Starte das Spiel neu
        isGameRunning = true;
        updateScore();

        // Garantiere, dass die Spielschleife läuft
        if (!gameLoop.isRunning) {
            gameLoop.isRunning = false; // Reset the flag first
            gameLoop();
        } else {
            // Starte eine neue Schleife
            gameLoop.isRunning = false;
            gameLoop();
        }
    }, 0);
}

// Funktion zum Zurücksetzen des Balls
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;

    // Zufällige Richtung beim Neustart
    ballSpeedX = Math.random() > 0.5 ? 5 : -5;
    ballSpeedY = Math.random() * 4 - 2;
}

// Aktualisierung der Schläger
function updatePaddles() {
    // Steuerung basierend auf Spielmodus
    if (gameMode === 'singleplayer') {
        // Spieler: Linker Schläger mit Maus oder Tastatur
        if (upPressed && leftPaddleY > 0) {
            leftPaddleY -= 8;
        } else if (downPressed && leftPaddleY < canvas.height - PADDLE_HEIGHT) {
            leftPaddleY += 8;
        }

        // Maussteuerung, wenn keine Tasten gedrückt sind
        if (!upPressed && !downPressed) {
            leftPaddleY = Math.min(Math.max(mousePosition.y - PADDLE_HEIGHT / 2, 0), canvas.height - PADDLE_HEIGHT);
        }

        // Computer: Rechter Schläger KI
        const computerPaddleCenter = rightPaddleY + PADDLE_HEIGHT / 2;
        const distanceToMove = ballY - computerPaddleCenter;

        // Einfache KI mit verzögerter Reaktion
        if (Math.abs(distanceToMove) > PADDLE_HEIGHT / 4) {
            if (distanceToMove > 0) {
                rightPaddleY += computerSpeed;
            } else {
                rightPaddleY -= computerSpeed;
            }
        }
    } else if (gameMode === 'local-multiplayer') {
        // Spieler 1: Linker Schläger mit W/S
        if (wPressed && leftPaddleY > 0) {
            leftPaddleY -= 8;
        } else if (sPressed && leftPaddleY < canvas.height - PADDLE_HEIGHT) {
            leftPaddleY += 8;
        }

        // Spieler 2: Rechter Schläger mit Pfeiltasten
        if (upPressed && rightPaddleY > 0) {
            rightPaddleY -= 8;
        } else if (downPressed && rightPaddleY < canvas.height - PADDLE_HEIGHT) {
            rightPaddleY += 8;
        }
    } else if (gameMode === 'online-multiplayer') {
        if (isHost) {
            // Host steuert den linken Schläger mit W/S oder Pfeiltasten
            const useArrowKeys = !wPressed && !sPressed;

            if ((wPressed || (useArrowKeys && upPressed)) && leftPaddleY > 0) {
                leftPaddleY -= 8;
            } else if ((sPressed || (useArrowKeys && downPressed)) && leftPaddleY < canvas.height - PADDLE_HEIGHT) {
                leftPaddleY += 8;
            }

            // Rechter Schläger wird vom Gegner gesteuert (über WebRTC)
        } else {
            // Gast steuert den rechten Schläger mit W/S oder Pfeiltasten
            const useArrowKeys = !wPressed && !sPressed;

            if ((wPressed || (useArrowKeys && upPressed)) && rightPaddleY > 0) {
                rightPaddleY -= 8;
            } else if ((sPressed || (useArrowKeys && downPressed)) && rightPaddleY < canvas.height - PADDLE_HEIGHT) {
                rightPaddleY += 8;
            }

            // Linker Schläger wird vom Gegner gesteuert (über WebRTC)
        }
    }

    // Begrenzung der Schläger
    leftPaddleY = Math.min(Math.max(leftPaddleY, 0), canvas.height - PADDLE_HEIGHT);
    rightPaddleY = Math.min(Math.max(rightPaddleY, 0), canvas.height - PADDLE_HEIGHT);
}

// Aktualisierung des Balls
function updateBall() {
    // Im Online-Modus aktualisiert nur der Host den Ball
    if (gameMode === 'online-multiplayer' && !isHost) {
        return; // Nicht-Host verwendet die vom Host empfangenen Ball-Daten
    }

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Kollision mit oberer/unterer Wand
    if (ballY < BALL_RADIUS || ballY > canvas.height - BALL_RADIUS) {
        ballSpeedY = -ballSpeedY;
    }
}

// Kollisionsprüfung
function checkCollisions() {
    // Im Online-Modus prüft nur der Host auf Kollisionen
    if (gameMode === 'online-multiplayer' && !isHost) {
        return;
    }

    // Kollision mit linkem Schläger (Spieler 1)
    if (ballX < PADDLE_WIDTH + BALL_RADIUS) {
        if (ballY > leftPaddleY && ballY < leftPaddleY + PADDLE_HEIGHT) {
            ballSpeedX = -ballSpeedX;

            // Abprallwinkel basierend auf Trefferpunkt
            const deltaY = ballY - (leftPaddleY + PADDLE_HEIGHT / 2);
            ballSpeedY = deltaY * 0.2;

            // Erhöhung der Geschwindigkeit
            ballSpeedX *= 1.05;
            if (Math.abs(ballSpeedX) > 12) ballSpeedX = ballSpeedX > 0 ? 12 : -12;
        }
    }

    // Kollision mit rechtem Schläger (Spieler 2 / Computer)
    if (ballX > canvas.width - PADDLE_WIDTH - BALL_RADIUS) {
        if (ballY > rightPaddleY && ballY < rightPaddleY + PADDLE_HEIGHT) {
            ballSpeedX = -ballSpeedX;

            // Abprallwinkel basierend auf Trefferpunkt
            const deltaY = ballY - (rightPaddleY + PADDLE_HEIGHT / 2);
            ballSpeedY = deltaY * 0.2;

            // Erhöhung der Geschwindigkeit
            ballSpeedX *= 1.05;
            if (Math.abs(ballSpeedX) > 12) ballSpeedX = ballSpeedX > 0 ? 12 : -12;
        }
    }
}

// Hauptspielschleife
function gameLoop() {
    if (!isGameRunning) return;

    gameLoop.isRunning = true;

    updatePaddles();
    updateBall();
    checkCollisions();

    // Im Online-Modus aktualisiert nur der Host den Punktestand
    if (gameMode !== 'online-multiplayer' || isHost) {
        checkScore();
    }

    drawEverything();

    requestAnimationFrame(gameLoop);
}

gameLoop.isRunning = false;

// Punktestand überprüfen
function checkScore() {
    if (ballX < 0) {
        rightScore++;
        updateScore();
        resetBall();
        checkWinner();
    } else if (ballX > canvas.width) {
        leftScore++;
        updateScore();
        resetBall();
        checkWinner();
    }
}

// Funktion zum Aktualisieren des Punktestands
function updateScore() {
    if (gameMode === 'singleplayer') {
        scoreDisplay.textContent = `Spieler: ${leftScore} | Computer: ${rightScore}`;
    } else if (gameMode === 'local-multiplayer') {
        scoreDisplay.textContent = `Spieler 1: ${leftScore} | Spieler 2: ${rightScore}`;
    } else if (gameMode === 'online-multiplayer') {
        if (isHost) {
            scoreDisplay.textContent = `Du (links): ${leftScore} | Gegner: ${rightScore}`;
        } else {
            scoreDisplay.textContent = `Gegner: ${leftScore} | Du (rechts): ${rightScore}`;
        }
    }
}

// Alles zeichnen
function drawEverything() {
    // Canvas löschen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mittellinie zeichnen
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.setLineDash([]);

    // Linker Schläger zeichnen (Spieler 1)
    ctx.fillStyle = "white";
    ctx.fillRect(0, leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Rechter Schläger zeichnen (Spieler 2 / Computer)
    ctx.fillRect(canvas.width - PADDLE_WIDTH, rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball zeichnen
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
}

// Funktion zur Überwachung und Aktualisierung des Verbindungsstatus
function updateConnectionStatus(state, details = '') {
    connectionStatusValue.textContent = state;
    if (details) {
        connectionStatusValue.title = details;
    }

    // Farbliche Hervorhebung des Verbindungsstatus
    switch (state) {
        case 'connected':
        case 'complete':
            connectionStatusValue.style.color = '#4CAF50'; // Grün
            break;
        case 'connecting':
        case 'new':
            connectionStatusValue.style.color = '#2196F3'; // Blau
            break;
        case 'disconnected':
        case 'failed':
        case 'closed':
            connectionStatusValue.style.color = '#f44336'; // Rot
            break;
        default:
            connectionStatusValue.style.color = '#ffffff'; // Weiß
    }
}

// Timeout für Verbindungsversuche
function setupConnectionTimeout() {
    // Setze einen Timeout für die Verbindung (15 Sekunden)
    timeoutManager.setTimeout('connection', () => {
        console.error('⏱️ Verbindungszeitüberschreitung');
        showError('Verbindungszeitüberschreitung. Der Gegner konnte nicht erreicht werden.');
        cleanupWebRTC();

        // UI zurücksetzen
        connectionInput.disabled = false;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Verbinden';
    }, 15000);
}

// Event-Listener für Browser-Tab-Schließen
window.addEventListener('beforeunload', () => {
    // Aufräumen, bevor die Seite verlassen wird
    if (gameMode === 'online-multiplayer') {
        cleanupWebRTC();
    }
});