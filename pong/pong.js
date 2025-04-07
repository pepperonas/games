// Canvas und Kontext einholen
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const relightSound = document.getElementById('relight-sound');

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

// Neue Variablen für die Gewinner-Animation
let showWinAnimation = false;
let winAnimationStartTime = 0;
let winAnimationDuration = 3000; // 3 Sekunden
let winningPlayer = ''; // 'left' oder 'right'
let isLocalPlayerWinner = false; // Zeigt an, ob der lokale Spieler gewonnen hat

// Verlierer-Animation-Variablen
let raindrops = []; // Array für Regentropfen
const RAINDROP_COUNT = 100; // Anzahl der Regentropfen

// Variablen für das Ball-Reset
let ballInResetState = false;
let ballResetStartTime = 0;
let ballResetDuration = 2000; // 2 Sekunden Pause vor Neustart

// Event-Listener für Tastatursteuerung
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

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

    // Fügen Sie diese Zeile hinzu, um die Rolle zurückzusetzen
    isHost = null;
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

        // WICHTIG: Wir warten hier, bis wir sicher die Rolle kennen
        if (isHost === null || isHost === undefined) {
            logDebug('⏳ Warte auf Rollenzuweisung...');
            // Wir fügen einen kurzen Timeout hinzu, um auf den playerRole-Event zu warten
            setTimeout(() => {
                initializeConnectionAfterRoleAssignment(data);
            }, 500);
        } else {
            // Rolle ist bereits bekannt, fahre fort
            initializeConnectionAfterRoleAssignment(data);
        }
    });

    function initializeConnectionAfterRoleAssignment(data) {
        logDebug(`🔍 Starte Verbindung mit Rolle: ${isHost ? 'Host' : 'Gast'}`);

        // WebRTC-Verbindung initialisieren
        initializePeerConnection();

        // Wenn Host, SDP-Angebot senden
        if (isHost) {
            logDebug('📤 Als Host erstelle ich jetzt ein Angebot');
            createOffer();
        } else {
            logDebug('📥 Als Gast warte ich jetzt auf ein Angebot');
            // Der Gast muss nichts tun, er wartet auf das Angebot
        }
    }

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
                    ballInResetState = data.ballInResetState;
                    ballResetStartTime = data.ballResetStartTime;

                    updateScore();
                }
            } else if (data.type === 'gameOver') {
                // Spiel ist vorbei, Animation starten
                console.log('Spielende-Nachricht empfangen', data);
                isGameRunning = false;
                showWinAnimation = true;
                winAnimationStartTime = Date.now();
                winningPlayer = data.winner;
                isLocalPlayerWinner = (isHost && data.winner === 'left') || (!isHost && data.winner === 'right');

                // Initialisiere Regentropfen für Verlierer-Animation
                if (!isLocalPlayerWinner) {
                    initializeRaindrops();
                }

                // Animation im gameLoop weiterlaufen lassen, aber keine Spiellogik mehr
                // Das Game-Over-Screen wird erst nach der Animation angezeigt
                setTimeout(() => {
                    showWinAnimation = false;
                    gameOverScreen.style.display = 'flex';

                    if (data.winner === 'left') {
                        winnerText.textContent = isHost ? 'Du hast gewonnen!' : 'Gegner hat gewonnen!';
                    } else {
                        winnerText.textContent = isHost ? 'Gegner hat gewonnen!' : 'Du hast gewonnen!';
                    }
                }, winAnimationDuration);
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
        gameState.ballInResetState = ballInResetState;
        gameState.ballResetStartTime = ballResetStartTime;
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

    // Ball in Pause-Zustand versetzen
    ballInResetState = true;
    ballResetStartTime = Date.now();
    ballSpeedX = 0;
    ballSpeedY = 0;
}

// Neue Funktion für die Aktualisierung des Ball-Reset-Zustands
function updateBallResetState() {
    if (ballInResetState) {
        // Überprüfe, ob die Reset-Dauer abgelaufen ist
        if (Date.now() - ballResetStartTime >= ballResetDuration) {
            // Reset beenden und Ball bewegen
            ballInResetState = false;

            // Zufällige Richtung beim Neustart
            ballSpeedX = Math.random() > 0.5 ? 5 : -5;
            ballSpeedY = Math.random() * 4 - 2;
        }
    }
}

// Aktualisierung der Schläger
function updatePaddles() {
    // Steuerung basierend auf Spielmodus
    if (gameMode === 'singleplayer') {
        // Spieler: Linker Schläger nur mit Tastatur (Maussteuerung entfernt)
        if (upPressed && leftPaddleY > 0) {
            leftPaddleY -= 8;
        } else if (downPressed && leftPaddleY < canvas.height - PADDLE_HEIGHT) {
            leftPaddleY += 8;
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
        } else {
            // Gast steuert den rechten Schläger mit W/S oder Pfeiltasten
            const useArrowKeys = !wPressed && !sPressed;

            if ((wPressed || (useArrowKeys && upPressed)) && rightPaddleY > 0) {
                rightPaddleY -= 8;
            } else if ((sPressed || (useArrowKeys && downPressed)) && rightPaddleY < canvas.height - PADDLE_HEIGHT) {
                rightPaddleY += 8;
            }
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

    // Nicht bewegen, wenn im Reset-Zustand
    if (ballInResetState) {
        return;
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

// Funktion zur Initialisierung der Regentropfen für die Verlierer-Animation
function initializeRaindrops() {
    raindrops = [];
    for (let i = 0; i < RAINDROP_COUNT; i++) {
        raindrops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height, // Start above the canvas
            length: 10 + Math.random() * 20,
            speed: 5 + Math.random() * 10
        });
    }
}

// Modifizierte gameLoop-Funktion, um die Animation zu zeichnen
function gameLoop() {
    if (!isGameRunning && !showWinAnimation) return;

    gameLoop.isRunning = true;

    // Nur Spiellogik ausführen, wenn das Spiel läuft
    if (isGameRunning) {
        // Nur der Host oder lokale Spieler aktualisieren den Ball-Reset-Zustand
        if (gameMode !== 'online-multiplayer' || isHost) {
            updateBallResetState();
        }

        updatePaddles();
        updateBall();
        checkCollisions();

        // Im Online-Modus aktualisiert nur der Host den Punktestand
        if (gameMode !== 'online-multiplayer' || isHost) {
            checkScore();
        }
    }

    // Zeichnen immer ausführen (auch während der Animation)
    drawEverything();

    // Wenn die Animation aktiv ist, zeichne die entsprechende Animation
    if (showWinAnimation) {
        if (isLocalPlayerWinner) {
            drawWinAnimation();
        } else {
            drawLoserAnimation();
        }
    }

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

    // Countdown während Reset-Zustand anzeigen
    if (ballInResetState) {
        ctx.font = "30px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        // Berechne verbleibende Zeit
        const timeElapsed = Date.now() - ballResetStartTime;
        const timeLeft = Math.ceil((ballResetDuration - timeElapsed) / 1000);

        // Zeige Countdown nur, wenn noch Zeit übrig ist
        if (timeLeft > 0) {
            ctx.fillText(`${timeLeft}`, canvas.width / 2, canvas.height / 2 - 50);
        }
    }
}

// Funktion zum Zeichnen der Gewinner-Animation
function drawWinAnimation() {
    if (!showWinAnimation) return;

    const elapsed = Date.now() - winAnimationStartTime;
    const progress = Math.min(elapsed / winAnimationDuration, 1);

    // Hintergrund-Flash-Effekt
    const flashIntensity = (Math.sin(elapsed * 0.01) + 1) / 2;
    ctx.fillStyle = `rgba(100, 100, 255, ${flashIntensity * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Textanimation
    ctx.save();
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Pulsierender Effekt für den Text
    const scale = 1 + Math.sin(elapsed * 0.01) * 0.1;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);

    // Text basierend auf Spielmodus und Gewinner
    let winText = '';
    if (winningPlayer === 'left') {
        if (gameMode === 'singleplayer') {
            winText = 'Du hast gewonnen!';
            ctx.fillStyle = 'rgba(50, 255, 50, ' + (0.7 + flashIntensity * 0.3) + ')';
        } else if (gameMode === 'local-multiplayer') {
            winText = 'Spieler 1 gewinnt!';
            ctx.fillStyle = 'rgba(50, 255, 50, ' + (0.7 + flashIntensity * 0.3) + ')';
        } else if (gameMode === 'online-multiplayer') {
            winText = isHost ? 'Du hast gewonnen!' : 'Gegner gewinnt!';
            ctx.fillStyle = isHost ? 'rgba(50, 255, 50, ' + (0.7 + flashIntensity * 0.3) + ')'
                : 'rgba(255, 50, 50, ' + (0.7 + flashIntensity * 0.3) + ')';
        }
    } else {
        if (gameMode === 'singleplayer') {
            winText = 'Computer gewinnt!';
            ctx.fillStyle = 'rgba(255, 50, 50, ' + (0.7 + flashIntensity * 0.3) + ')';
        } else if (gameMode === 'local-multiplayer') {
            winText = 'Spieler 2 gewinnt!';
            ctx.fillStyle = 'rgba(50, 50, 255, ' + (0.7 + flashIntensity * 0.3) + ')';
        } else if (gameMode === 'online-multiplayer') {
            winText = isHost ? 'Gegner gewinnt!' : 'Du hast gewonnen!';
            ctx.fillStyle = isHost ? 'rgba(255, 50, 50, ' + (0.7 + flashIntensity * 0.3) + ')'
                : 'rgba(50, 255, 50, ' + (0.7 + flashIntensity * 0.3) + ')';
        }
    }

    // Schatten für bessere Lesbarkeit
    ctx.shadowColor = "black";
    ctx.shadowBlur = 10;
    ctx.fillText(winText, 0, 0);

    // Zeichne Sterneneffekt um den Text
    for (let i = 0; i < 20; i++) {
        const angle = progress * 10 + i * Math.PI / 10;
        const distance = 80 + Math.sin(elapsed * 0.005 + i) * 20;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const size = 5 + Math.sin(elapsed * 0.01 + i) * 3;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 50, ${0.7 + flashIntensity * 0.3})`;
        ctx.fill();
    }

    ctx.restore();
}

// Funktion zum Zeichnen der Verlierer-Animation
function drawLoserAnimation() {
    if (!showWinAnimation) return;

    const elapsed = Date.now() - winAnimationStartTime;
    const progress = Math.min(elapsed / winAnimationDuration, 1);

    // Dunkler Hintergrund-Effekt
    ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Wackeleffekt für die gesamte Szene
    ctx.save();
    const shakeAmount = Math.sin(elapsed * 0.02) * 5;
    ctx.translate(shakeAmount, 0);

    // Regentropfen zeichnen
    if (raindrops.length === 0) {
        initializeRaindrops();
    }

    ctx.strokeStyle = 'rgba(70, 130, 180, 0.7)'; // Bläuliche Regentropfen
    ctx.lineWidth = 2;

    for (let i = 0; i < raindrops.length; i++) {
        const drop = raindrops[i];

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();

        // Regentropfen bewegen
        drop.y += drop.speed;

        // Regentropfen zurücksetzen, wenn sie unten rausfallen
        if (drop.y > canvas.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * canvas.width;
        }
    }

    // "Verloren" Text zeichnen
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Text mit Wackeleffekt
    const textShakeX = Math.sin(elapsed * 0.02) * 3;
    const textShakeY = Math.cos(elapsed * 0.02) * 3;

    // Text basierend auf Spielmodus
    let loseText = '';
    if (gameMode === 'singleplayer') {
        loseText = 'Verloren!';
    } else if (gameMode === 'local-multiplayer') {
        loseText = (winningPlayer === 'left') ? 'Spieler 2 verliert!' : 'Spieler 1 verliert!';
    } else if (gameMode === 'online-multiplayer') {
        loseText = 'Verloren!';
    }

    // Schatten für bessere Lesbarkeit
    ctx.shadowColor = "black";
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(220, 20, 60, 0.8)'; // Rötlicher Text für Verlierer
    ctx.fillText(loseText, canvas.width / 2 + textShakeX, canvas.height / 2 + textShakeY);

    // "Game Over" Text mit Fade-In-Effekt
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = `rgba(150, 150, 150, ${progress * 0.8})`;
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 + 60);

    ctx.restore();
}

// Überarbeitete checkWinner Funktion mit Animation
function checkWinner() {
    if (leftScore >= WINNING_SCORE || rightScore >= WINNING_SCORE) {
        isGameRunning = false;
        const winner = leftScore > rightScore ? 'left' : 'right';

        // Im Online-Multiplayer: informiere den Gegner über das Spielende
        if (gameMode === 'online-multiplayer' && isHost) {
            console.log('Sende Spielende-Nachricht an Gegner');
            sendData({
                type: 'gameOver',
                winner: winner
            });
        }

        // Bestimme, ob der lokale Spieler gewonnen hat
        if (gameMode === 'singleplayer') {
            isLocalPlayerWinner = (leftScore > rightScore);
        } else if (gameMode === 'local-multiplayer') {
            // Bei lokalem Multiplayer zeigen wir immer die Gewinner-Animation
            isLocalPlayerWinner = true;
        } else if (gameMode === 'online-multiplayer') {
            if (isHost) {
                isLocalPlayerWinner = (leftScore > rightScore);
            } else {
                isLocalPlayerWinner = (rightScore > leftScore);
            }
        }

        // Spiele den Gewinner-Sound ab, wenn der lokale Spieler gewonnen hat
        if (isLocalPlayerWinner) {
            if (relightSound) {
                relightSound.currentTime = 0; // Sound zurücksetzen, falls er bereits gespielt wurde

                // Promise-basierte Wiedergabe mit Fehlerbehandlung
                const playPromise = relightSound.play();

                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('Fehler beim Abspielen des Sounds:', error);
                    });
                }
            }
        }

        // Starte die Gewinner-Animation
        showWinAnimation = true;
        winAnimationStartTime = Date.now();
        winningPlayer = winner;

        // Initialisiere Regentropfen für Verlierer-Animation
        if (!isLocalPlayerWinner) {
            initializeRaindrops();
        }

        // Animation im gameLoop weiterlaufen lassen, aber keine Spiellogik mehr
        // Das Game-Over-Screen wird erst nach der Animation angezeigt
        setTimeout(() => {
            showWinAnimation = false;
            gameOverScreen.style.display = 'flex';

            if (leftScore > rightScore) {
                if (gameMode === 'singleplayer') {
                    winnerText.textContent = 'Du hast gewonnen!';
                } else if (gameMode === 'local-multiplayer') {
                    winnerText.textContent = 'Spieler 1 hat gewonnen!';
                } else if (gameMode === 'online-multiplayer') {
                    winnerText.textContent = isHost ? 'Du hast gewonnen!' : 'Gegner hat gewonnen!';
                }
            } else {
                if (gameMode === 'singleplayer') {
                    winnerText.textContent = 'Computer hat gewonnen!';
                } else if (gameMode === 'local-multiplayer') {
                    winnerText.textContent = 'Spieler 2 hat gewonnen!';
                } else if (gameMode === 'online-multiplayer') {
                    winnerText.textContent = isHost ? 'Gegner hat gewonnen!' : 'Du hast gewonnen!';
                }
            }
        }, winAnimationDuration);
    }
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

// Touch-Steuerung und Mobile-Optimierung für Pong
// Füge diesen Code am Ende der Datei pong.js ein

// Initialisation beim Laden der Seite
document.addEventListener('DOMContentLoaded', initMobileSupport);

// ===============================================
// MOBILE & TOUCH UNTERSTÜTZUNG
// ===============================================

// Touch-Variablen
let touchStartY = 0;
let touchCurrentY = 0;
let isTouching = false;
let activePaddle = null; // Welches Paddel wird durch Touch gesteuert

// Viewport-Optimierung für Mobilgeräte
function setupMobileViewport() {
    // Meta-Tag für Landscape-Modus überprüfen und aktualisieren
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, orientation=landscape';
    }

    // Versuch, die Bildschirmausrichtung zu sperren, falls unterstützt
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.log('Bildschirmausrichtung konnte nicht gesperrt werden:', err);
        });
    }
}

// Fügt Touch-Steuerung zum Spiel hinzu
function setupTouchControls() {
    // Bereits vorhandene Touch-Event-Listener entfernen (falls vorhanden)
    canvas.removeEventListener('touchstart', touchStartHandler);
    canvas.removeEventListener('touchmove', touchMoveHandler);
    canvas.removeEventListener('touchend', touchEndHandler);
    canvas.removeEventListener('touchcancel', touchCancelHandler);

    // Touch-Event-Listener hinzufügen
    canvas.addEventListener('touchstart', touchStartHandler, {passive: false});
    canvas.addEventListener('touchmove', touchMoveHandler, {passive: false});
    canvas.addEventListener('touchend', touchEndHandler, {passive: false});
    canvas.addEventListener('touchcancel', touchCancelHandler, {passive: false});

    console.log('Touch-Steuerung aktiviert');
}

// Touch-Event-Handler
function touchStartHandler(e) {
    e.preventDefault(); // Verhindern von Browser-Standardverhalten (Scrollen)

    const touch = e.touches[0];
    const canvasRect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - canvasRect.left;
    touchStartY = touch.clientY - canvasRect.top;
    touchCurrentY = touchStartY;
    isTouching = true;

    // Bestimme, welches Paddel gesteuert werden soll
    if (gameMode === 'local-multiplayer') {
        // Im lokalen Multiplayer steuert die linke Bildschirmhälfte das linke Paddel,
        // und die rechte Bildschirmhälfte das rechte Paddel
        activePaddle = touchX < canvas.width / 2 ? 'left' : 'right';
    } else if (gameMode === 'online-multiplayer') {
        // Im Online-Modus steuert der Spieler je nach Rolle (Host oder Gast)
        activePaddle = isHost ? 'left' : 'right';
    } else {
        // Im Einzelspieler-Modus steuert man immer das linke Paddel
        activePaddle = 'left';
    }

    console.log(`Touch-Start: x=${touchX}, y=${touchStartY}, Paddel=${activePaddle}`);
}

function touchMoveHandler(e) {
    e.preventDefault();
    if (!isTouching) return;

    const touch = e.touches[0];
    const canvasRect = canvas.getBoundingClientRect();
    touchCurrentY = touch.clientY - canvasRect.top;

    // Berechne Bewegungsdistanz
    const deltaY = touchCurrentY - touchStartY;

    // Bewege das aktive Paddel
    if (activePaddle === 'left') {
        // Multiplikator für sensitivere Bewegung
        leftPaddleY += deltaY * 1.5;
        // Begrenze das Paddel auf Canvas-Größe
        leftPaddleY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, leftPaddleY));
    } else if (activePaddle === 'right') {
        rightPaddleY += deltaY * 1.5;
        rightPaddleY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, rightPaddleY));
    }

    // Setze neuen Startpunkt für die nächste Bewegung
    touchStartY = touchCurrentY;
}

function touchEndHandler(e) {
    e.preventDefault();
    isTouching = false;
    activePaddle = null;
}

function touchCancelHandler(e) {
    e.preventDefault();
    isTouching = false;
    activePaddle = null;
}

// Aktualisiert die Spielinformationen für mobile Geräte
function updateControlsInfo() {
    const controlsInfo = document.getElementById('controls-info');
    if (!controlsInfo) return;

    // Steuerungshinweise für Touch-Geräte aktualisieren
    controlsInfo.innerHTML = `
        <p>Smartphone: Wische über den Bildschirm, um das Paddel zu bewegen</p>
        <p>Einzelspieler: Steuere das linke Paddel durch Wischen</p>
        <p>Multiplayer (Lokal): Linke/rechte Bildschirmhälfte für jeweiliges Paddel</p>
        <p>Multiplayer (Online): Steuere dein Paddel durch Wischen</p>
    `;
}

// Vollbildmodus aktivieren (für besseres mobiles Erlebnis)
function setupFullscreenButton() {
    // Prüfe, ob bereits ein Vollbild-Button existiert
    if (document.getElementById('fullscreen-btn')) return;

    // Erstelle Vollbild-Button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.id = 'fullscreen-btn';
    fullscreenBtn.textContent = 'Vollbild';
    fullscreenBtn.className = 'fullscreen-btn';
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Füge Button zum Startbildschirm hinzu
    const buttonGroup = document.querySelector('.button-group');
    if (buttonGroup) {
        buttonGroup.appendChild(fullscreenBtn);
    } else {
        startScreen.appendChild(fullscreenBtn);
    }
}

// Vollbildmodus umschalten
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Mobile-optimierte CSS-Stile hinzufügen
function addMobileStyles() {
    // Prüfe, ob bereits ein Style-Element für mobile Optimierung existiert
    if (document.getElementById('mobile-styles')) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'mobile-styles';
    styleElement.textContent = `
        @media (max-width: 1024px) {
            body {
                overflow: hidden;
                touch-action: none;
                background-color: #2C2E3B;
            }
            
            #game-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            #game-canvas {
                max-width: 100%;
                max-height: 100%;
                touch-action: none;
            }
            
            #score-display {
                font-size: 18px;
                padding-top: 5px;
            }
            
            .fullscreen-btn {
                background-color: #2C2E3B;
                color: white;
                border: 2px solid white;
                padding: 12px 20px;
                font-size: 16px;
                border-radius: 5px;
                margin: 10px;
                cursor: pointer;
            }
            
            .button-group {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .button-group > div {
                display: flex;
                flex-direction: column;
            }
            
            #start-screen button, 
            #game-over button,
            #online-connection button {
                padding: 15px 25px;
                font-size: 18px;
                margin: 8px;
                min-width: 200px;
            }
            
            #connection-input {
                padding: 12px;
                font-size: 16px;
                width: 80%;
                max-width: 250px;
            }
            
            /* Portrait-Modus-Hinweis */
            @media (orientation: portrait) {
                body::after {
                    content: "Bitte Gerät drehen";
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(44, 46, 59, 0.9);
                    color: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 24px;
                    z-index: 9999;
                }
            }
        }
    `;

    document.head.appendChild(styleElement);
}

// Canvas-Größe an Bildschirmgröße anpassen
function resizeCanvas() {
    // Verfügbare Bildschirmgröße ermitteln
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    // Deutlich größere Sicherheitsränder für S24 Ultra
    const safeMargin = Math.min(availableWidth, availableHeight) * 0.1; // 10% Rand

    // Berechne maximale nutzbare Fläche
    const maxUsableWidth = availableWidth - (safeMargin * 2);
    const maxUsableHeight = availableHeight - (safeMargin * 2);

    // Original-Seitenverhältnis
    const originalAspectRatio = 800 / 500;

    // Neue Größe unter Beibehaltung des Seitenverhältnisses berechnen
    let newWidth, newHeight;

    if (maxUsableWidth / maxUsableHeight > originalAspectRatio) {
        // Wenn Bildschirm breiter ist als nötig, beschränke durch Höhe
        newHeight = maxUsableHeight;
        newWidth = newHeight * originalAspectRatio;
    } else {
        // Wenn Bildschirm schmaler ist, beschränke durch Breite
        newWidth = maxUsableWidth;
        newHeight = newWidth / originalAspectRatio;
    }

    // Zusätzliche starke Skalierung für sehr große Bildschirme wie S24 Ultra
    const screenSize = Math.sqrt(availableWidth * availableWidth + availableHeight * availableHeight);

    // Spezielle Anpassung für S24 Ultra (größere Pixel-Dichte und Bildschirmgröße)
    if (screenSize > 2200 || window.devicePixelRatio > 2.5) {
        // Stärkere Skalierung für sehr große/hochauflösende Bildschirme
        const scaleFactor = 0.65; // Nur 65% der berechneten Größe
        newWidth *= scaleFactor;
        newHeight *= scaleFactor;
        console.log("S24 Ultra oder ähnliches Gerät erkannt - starke Skalierung angewendet");
    } else if (screenSize > 1800) {
        // Mittelgroße Bildschirme
        const scaleFactor = 0.75;
        newWidth *= scaleFactor;
        newHeight *= scaleFactor;
    }

    // Größen auf ganze Zahlen runden
    newWidth = Math.floor(newWidth);
    newHeight = Math.floor(newHeight);

    // Canvas-Größe anpassen
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Container-Größe anpassen
    const container = document.getElementById('game-container');
    if (container) {
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;

        // Zentriere den Container horizontal und vertikal
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
    }

    // Spielelemente an neue Größe anpassen
    adjustGameElements(newWidth, newHeight);

    // CSS-Anpassungen für extrem große Bildschirme
    if (screenSize > 2200 || window.devicePixelRatio > 2.5) {
        document.body.classList.add('ultra-large-screen');
    }

    console.log(`Canvas resized to ${newWidth}x${newHeight} (Screen size: ${screenSize})`);
}

function adjustGameElements(newWidth, newHeight) {
    // Berechne Skalierungsfaktoren
    const widthRatio = newWidth / 800;
    const heightRatio = newHeight / 500;

    // Globale Spielvariablen anpassen
    window.PADDLE_HEIGHT = Math.round(100 * heightRatio);
    window.PADDLE_WIDTH = Math.round(15 * widthRatio);
    window.BALL_RADIUS = Math.round(10 * Math.min(widthRatio, heightRatio));

    // Paddel-Positionen zurücksetzen
    if (typeof leftPaddleY !== 'undefined' && typeof rightPaddleY !== 'undefined') {
        leftPaddleY = (newHeight / 2) - (PADDLE_HEIGHT / 2);
        rightPaddleY = (newHeight / 2) - (PADDLE_HEIGHT / 2);
    }

    // Ball-Position zurücksetzen
    if (typeof ballX !== 'undefined' && typeof ballY !== 'undefined') {
        ballX = newWidth / 2;
        ballY = newHeight / 2;
    }

    // Schriftgrößen anpassen
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) {
        scoreDisplay.style.fontSize = `${Math.max(16, Math.round(24 * widthRatio))}px`;
    }

    // Geschwindigkeiten anpassen
    if (typeof ballSpeedX !== 'undefined' && typeof ballSpeedY !== 'undefined') {
        if (ballSpeedX !== 0 || ballSpeedY !== 0) {
            const speedFactor = Math.min(widthRatio, heightRatio);
            ballSpeedX = ballSpeedX * speedFactor;
            ballSpeedY = ballSpeedY * speedFactor;
        }
    }
}

function addLargeScreenStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'ultra-large-screen-styles';
    styleElement.textContent = `
        .ultra-large-screen #game-container {
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .ultra-large-screen #start-screen, 
        .ultra-large-screen #game-over, 
        .ultra-large-screen #online-connection {
            transform: scale(0.75);
        }
        
        .ultra-large-screen #score-display {
            font-size: 16px !important;
            top: 5px;
        }
        
        .ultra-large-screen #start-screen h1 {
            font-size: 36px;
        }
        
        .ultra-large-screen #controls-info {
            font-size: 14px;
            margin-top: -10px;
        }
        
        .ultra-large-screen #start-screen button, 
        .ultra-large-screen #game-over button, 
        .ultra-large-screen #online-connection button {
            padding: 10px 20px;
            font-size: 16px;
            margin: 8px;
        }
        
        .ultra-large-screen .button-group {
            margin-top: -20px;
        }
        
        /* Sicherstellen, dass die Canvas-Ränder gut sichtbar sind */
        #game-canvas {
            background-color: #000;
            border: 1px solid #333;
        }
    `;
    document.head.appendChild(styleElement);
}

function showDebugInfo() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-overlay';
    debugDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px;
        font-size: 10px;
        z-index: 9999;
        pointer-events: none;
    `;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;

    debugDiv.textContent = `Screen: ${screenW}x${screenH}, Pixel Ratio: ${ratio}`;
    document.body.appendChild(debugDiv);
}

// Initialisierung mit verbesserter Fehlerbehandlung
function initMobileSupport() {
    try {
        setupMobileViewport();
        setupTouchControls();
        updateControlsInfo();
        setupFullscreenButton();
        addMobileStyles();
        addLargeScreenStyles();

        // Debug-Info für Fehlerbehebung anzeigen
        showDebugInfo();

        // Verzögerte Größenanpassung für zuverlässigere Initialisierung
        setTimeout(resizeCanvas, 100);

        // Event-Listener für Orientierungs- und Größenänderungen
        window.addEventListener('resize', () => {
            setTimeout(resizeCanvas, 100);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 300);
        });

        console.log('Mobile Unterstützung initialisiert');
    } catch (error) {
        console.error('Fehler bei Mobile-Initialisierung:', error);
    }
}