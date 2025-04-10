// components/PongGame.jsx
import React, {useEffect, useRef, useState} from 'react';
import io from 'socket.io-client';
import './PongGame.css';
import './TouchControls.css';
import TouchControls from './TouchControls';

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 15;
const BALL_RADIUS = 10;
const WINNING_SCORE = 5;
const SIGNALING_SERVER = 'https://mrx3k1.de';

const PongGame = ({
                      gameMode,
                      difficulty,
                      isHost: initialIsHost, // Umbenennen, um Verwechslung zu vermeiden
                      onGameOver,
                      onBallExchange,
                      isMobile,
                      isLandscape,
                      resetCount,
                      playerName,
                      onMainMenu
                  }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);
    const lastSendTimeRef = useRef(0); // Für Ratenbegrenzung

    // isHost als State statt als props
    const [isHostState, setIsHostState] = useState(initialIsHost);
    const [scores, setScores] = useState({left: 0, right: 0});
    const [connectionStatus, setConnectionStatus] = useState('-');
    const [ping, setPing] = useState('-');
    const [gameRunning, setGameRunning] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Spielstatus
    const gameStateRef = useRef({
        ballX: 400,
        ballY: 250,
        ballSpeedX: 5,
        ballSpeedY: 2,
        leftPaddleY: 200,
        rightPaddleY: 200,
        scores: {left: 0, right: 0},
        keys: {
            wPressed: false,
            sPressed: false,
            upPressed: false,
            downPressed: false
        },
        touchControls: {
            leftUp: false,
            leftDown: false,
            rightUp: false,
            rightDown: false
        },
        ballInResetState: false,
        ballResetStartTime: 0,
        ballResetDuration: 2000,
        showWinAnimation: false,
        winAnimationStartTime: 0,
        winAnimationDuration: 3000,
        winningPlayer: '',
        isLocalPlayerWinner: false,
        gameOver: false,
        raindrops: [],
        lastBallX: 400, // Für Ballwechsel-Tracking
        lastBallSpeedX: 5 // Für Ballwechsel-Tracking
    });

    // Audio Element
    const audioRef = useRef(null);

    useEffect(() => {
        if (resetCount > 0) {
            // Spiel zurücksetzen
            resetGameState();
            setGameRunning(true);
        }
    }, [resetCount]);

    // Erkennen, ob es sich um ein mobiles Gerät handelt
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileDevice(window.innerWidth <= 768 ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0));
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Touch-End-Event-Handler
    useEffect(() => {
        // Touch-End-Event-Handler
        const handleTouchEnd = () => {
            // Alle Touch-Controls zurücksetzen
            const gameState = gameStateRef.current;
            gameState.touchControls.leftUp = false;
            gameState.touchControls.leftDown = false;
            gameState.touchControls.rightUp = false;
            gameState.touchControls.rightDown = false;
        };

        // Event-Listener für das Ende des Touchs hinzufügen
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const songs = [
        'assets/relight.m4a',
        'assets/old-thing.wav',
        'assets/welcome-to-st-tropez.wav',
        'assets/i-want-your-soul.wav'
    ];

    useEffect(() => {
        // Audio initialisieren
        const randomIndex = Math.floor(Math.random() * songs.length);

        // Neues Audio-Objekt mit zufälligem Lied erstellen
        audioRef.current = new Audio(songs[randomIndex]);

        // Canvas Context holen
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Canvas für Touch Events responsive machen
        const resizeCanvas = () => {
            if (canvas) {
                const container = canvas.parentElement;
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                const originalRatio = 800 / 500; // Original canvas ratio

                // Setze die Größe des Canvas für CSS-Darstellung
                if (window.innerWidth <= 915 || window.innerHeight <= 450) {
                    if (window.matchMedia("(orientation: landscape)").matches) {
                        // Landscape-Modus: Anpassen an die Höhe mit Berücksichtigung der Seitenverhältnisse
                        const maxHeight = Math.min(containerHeight, window.innerHeight * 0.85);
                        canvas.style.height = `${maxHeight}px`;
                        canvas.style.width = `${maxHeight * originalRatio}px`;

                        // Sicherstellen, dass die Breite nicht größer als die verfügbare Breite ist
                        if (parseFloat(canvas.style.width) > containerWidth) {
                            canvas.style.width = `${containerWidth}px`;
                            canvas.style.height = `${containerWidth / originalRatio}px`;
                        }
                    } else {
                        // Portrait-Modus: Anpassen an die Breite
                        canvas.style.width = `${containerWidth}px`;
                        canvas.style.height = `${containerWidth / originalRatio}px`;
                    }

                    // Sicherstellen, dass das Canvas im sichtbaren Bereich bleibt
                    canvas.style.maxHeight = `${window.innerHeight * 0.85}px`;
                    canvas.style.maxWidth = `${window.innerWidth * 0.95}px`;
                } else {
                    canvas.style.width = '';
                    canvas.style.height = '';
                }
            }
        };

        // Initialisiere Canvas-Größe
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Orientierungsänderung überwachen
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 100); // Verzögerung für verlässlicheres Neuskalieren
        });

        // Tastatur-Event-Listener
        const handleKeyDown = (e) => {
            const gameState = gameStateRef.current;
            if (e.key === 'ArrowUp' || e.key === 'Up') {
                gameState.keys.upPressed = true;
            } else if (e.key === 'ArrowDown' || e.key === 'Down') {
                gameState.keys.downPressed = true;
            } else if (e.key === 'w' || e.key === 'W') {
                gameState.keys.wPressed = true;
            } else if (e.key === 's' || e.key === 'S') {
                gameState.keys.sPressed = true;
            }
        };

        const handleKeyUp = (e) => {
            const gameState = gameStateRef.current;
            if (e.key === 'ArrowUp' || e.key === 'Up') {
                gameState.keys.upPressed = false;
            } else if (e.key === 'ArrowDown' || e.key === 'Down') {
                gameState.keys.downPressed = false;
            } else if (e.key === 'w' || e.key === 'W') {
                gameState.keys.wPressed = false;
            } else if (e.key === 's' || e.key === 'S') {
                gameState.keys.sPressed = false;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // WebRTC-Setup für Online-Modus
        if (gameMode === 'online-multiplayer') {
            setupWebRTC();
        }

        // Hilfsfunktionen für WebRTC-Verbindung
        function setupWebRTC() {
            console.log('🎮 Starte Online-Multiplayer Setup');

            // Socket.io-Verbindung initialisieren
            socketRef.current = io(SIGNALING_SERVER, {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });

            // Socket.io Event-Handler
            socketRef.current.on('connect', () => {
                console.log('🔌 Mit dem Signaling-Server verbunden. Socket ID: ' + socketRef.current.id);
                // Raum erstellen, sobald verbunden
                createRoom();
            });

            socketRef.current.on('roomCreated', ({roomId}) => {
                console.log(`🏠 Raum erstellt: ${roomId}`);
            });

            socketRef.current.on('gameReady', (data) => {
                console.log('⭐ Spiel ist bereit! ' + JSON.stringify(data));
            });

            socketRef.current.on('playerRole', ({isHost: role}) => {
                console.log(`👑 Spielerrolle erhalten: ${role ? 'Host' : 'Gast'}`);
                // Setze isHostState mit dem state updater
                setIsHostState(role);
            });

            // Weitere Socket.io Event-Handler für WebRTC-Signalisierung
            setupWebRTCEventHandlers();
        }

        function setupWebRTCEventHandlers() {
            socketRef.current.on('offer', async (data) => {
                console.log('📩 SDP-Angebot empfangen');
                if (!peerConnectionRef.current) initializePeerConnection();

                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
                    console.log('📩 Remote-Beschreibung gesetzt, erstelle Antwort');

                    const answer = await peerConnectionRef.current.createAnswer();
                    console.log('📩 SDP-Antwort erstellt');

                    await peerConnectionRef.current.setLocalDescription(answer);
                    console.log('📩 Lokale Beschreibung gesetzt, sende Antwort');

                    socketRef.current.emit('answer', peerConnectionRef.current.localDescription);
                } catch (error) {
                    console.error('📩 Fehler beim Verarbeiten des Angebots:', error);
                }
            });

            socketRef.current.on('answer', async (data) => {
                console.log('📩 SDP-Antwort empfangen');
                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
                    console.log('📩 Remote-Beschreibung gesetzt');
                } catch (error) {
                    console.error('📩 Fehler beim Verarbeiten der Antwort:', error);
                }
            });

            socketRef.current.on('iceCandidate', (data) => {
                console.log('🧊 ICE-Kandidat empfangen');
                try {
                    peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data))
                        .then(() => console.log('🧊 ICE-Kandidat hinzugefügt'))
                        .catch(e => console.error('🧊 Fehler beim Hinzufügen des ICE-Kandidaten:', e));
                } catch (error) {
                    console.error('🧊 Fehler beim Hinzufügen des ICE-Kandidaten:', error);
                }
            });

            socketRef.current.on('error', ({message}) => {
                console.error('❌ Server-Fehler:', message);
            });

            socketRef.current.on('peerDisconnected', () => {
                console.log('👋 Gegner hat Verbindung getrennt');
            });
        }

        function createRoom() {
            console.log('🏠 Erstelle neuen Spielraum');
            socketRef.current.emit('createRoom');
        }

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
            if (peerConnectionRef.current) {
                console.log('🧹 Bestehende Peer-Verbindung wird geschlossen');
                try {
                    peerConnectionRef.current.close();
                } catch (e) {
                    console.error('Fehler beim Schließen der bestehenden Verbindung', e);
                }
                peerConnectionRef.current = null;
            }

            try {
                peerConnectionRef.current = new RTCPeerConnection(configuration);
            } catch (e) {
                console.error('Fehler beim Erstellen der RTCPeerConnection:', e);
                return;
            }

            // Event Handler
            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('🧊 Neuer ICE-Kandidat gefunden');
                    socketRef.current.emit('iceCandidate', event.candidate);
                } else {
                    console.log('🧊 ICE-Kandidatensammlung abgeschlossen');
                }
            };

            peerConnectionRef.current.oniceconnectionstatechange = () => {
                console.log('🧊 ICE-Status geändert:', peerConnectionRef.current.iceConnectionState);
                setConnectionStatus(peerConnectionRef.current.iceConnectionState);
            };

            peerConnectionRef.current.onconnectionstatechange = () => {
                console.log('🔄 Verbindungsstatus geändert:', peerConnectionRef.current.connectionState);
            };

            // Datenkanal einrichten mit Fehlerbehandlung
            try {
                if (isHostState) {
                    console.log('📢 Erstelle Datenkanal (Host)');
                    dataChannelRef.current = peerConnectionRef.current.createDataChannel('gameData', {
                        ordered: true
                    });
                    setupDataChannel();
                } else {
                    console.log('📢 Warte auf Datenkanal (Gast)');
                    peerConnectionRef.current.ondatachannel = (event) => {
                        console.log('📢 Datenkanal empfangen');
                        dataChannelRef.current = event.channel;
                        setupDataChannel();
                    };
                }
            } catch (error) {
                console.error('📢 Fehler beim Einrichten des Datenkanals:', error);
            }

            // Wenn Host, SDP-Angebot senden
            if (isHostState) {
                createOffer();
            }
        }

        function setupDataChannel() {
            console.log('📢 Richte Datenkanal ein. Status:', dataChannelRef.current.readyState);

            dataChannelRef.current.onopen = () => {
                console.log('📢 Datenkanal geöffnet!');
                setConnectionStatus('connected');

                // Ping-Messung starten
                startPingMeasurement();
            };

            dataChannelRef.current.onclose = () => {
                console.log('📢 Datenkanal geschlossen');
                setConnectionStatus('disconnected');
                setPing('-');
            };

            dataChannelRef.current.onerror = (error) => {
                console.error('📢 Datenkanal-Fehler:', error);
            };

            dataChannelRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log(`🔍 Empfangen (${isHostState ? 'Host' : 'Gast'}):`, data);

                    if (data.type === 'ping') {
                        // Ping-Anfrage - sende sofort Antwort zurück
                        sendData({type: 'pong', id: data.id});
                    } else if (data.type === 'pong') {
                        // Ping-Antwort - berechne Latenz
                        const latency = Date.now() - data.id;
                        setPing(latency.toString());
                    } else if (data.type === 'gameState') {
                        // Spielzustand vom anderen Spieler
                        // Update der Gegnerposition
                        if (isHostState) {
                            gameStateRef.current.rightPaddleY = data.paddleY;
                        } else {
                            gameStateRef.current.leftPaddleY = data.paddleY;
                        }

                        // Wenn Gast, synchronisiere Ball und Punkte
                        if (!isHostState && data.ballX !== undefined) {
                            gameStateRef.current.ballX = data.ballX;
                            gameStateRef.current.ballY = data.ballY;
                            gameStateRef.current.ballSpeedX = data.ballSpeedX;
                            gameStateRef.current.ballSpeedY = data.ballSpeedY;

                            // Aktualisiere Punktestand im gameStateRef und im React-State
                            if (data.leftScore !== undefined && data.rightScore !== undefined) {
                                console.log('🏆 Punkteaktualisierung empfangen:', data.leftScore, data.rightScore);
                                gameStateRef.current.scores.left = data.leftScore;
                                gameStateRef.current.scores.right = data.rightScore;
                                setScores({
                                    left: data.leftScore,
                                    right: data.rightScore
                                });
                            }

                            // Reset-Status synchronisieren
                            gameStateRef.current.ballInResetState = data.ballInResetState;
                            gameStateRef.current.ballResetStartTime = data.ballResetStartTime;
                        }
                    } else if (data.type === 'gameOver') {
                        // Spiel ist vorbei, Animation starten
                        console.log('Spielende-Nachricht empfangen', data);
                        setGameRunning(false);

                        gameStateRef.current.showWinAnimation = true;
                        gameStateRef.current.winAnimationStartTime = Date.now();
                        gameStateRef.current.winningPlayer = data.winner;
                        gameStateRef.current.isLocalPlayerWinner = (!isHostState && data.winner === 'right');

                        // Initialisiere Regentropfen für Verlierer-Animation
                        if (!gameStateRef.current.isLocalPlayerWinner) {
                            initializeRaindrops();
                        }

                        // Animation im gameLoop weiterlaufen lassen, aber nach der Animation zum Game-Over-Screen
                        setTimeout(() => {
                            gameStateRef.current.showWinAnimation = false;
                            onGameOver(data.winner, gameStateRef.current.isLocalPlayerWinner);
                        }, gameStateRef.current.winAnimationDuration);
                    }
                } catch (error) {
                    console.error('📢 Fehler beim Verarbeiten der Nachricht:', error, 'Rohdaten:', event.data);
                }
            };
        }

        function startPingMeasurement() {
            console.log('📊 Starte Ping-Messung');

            // Ping alle 2 Sekunden senden
            const pingIntervalId = setInterval(() => {
                const pingId = Date.now();
                sendData({type: 'ping', id: pingId});
            }, 2000);

            // Beim Aufräumen den Interval löschen
            return () => clearInterval(pingIntervalId);
        }

        async function createOffer() {
            try {
                console.log('📤 Erstelle SDP-Angebot');
                const offer = await peerConnectionRef.current.createOffer();
                console.log('📤 SDP-Angebot erstellt');

                await peerConnectionRef.current.setLocalDescription(offer);
                console.log('📤 Lokale Beschreibung gesetzt, sende an Signaling-Server');

                socketRef.current.emit('offer', peerConnectionRef.current.localDescription);
            } catch (error) {
                console.error('📤 Fehler beim Erstellen des Angebots:', error);
            }
        }

        function sendData(data) {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                try {
                    console.log(`📤 Senden (${isHostState ? 'Host' : 'Gast'}):`, data);
                    dataChannelRef.current.send(JSON.stringify(data));
                } catch (error) {
                    console.error('📤 Fehler beim Senden von Daten:', error);
                }
            } else {
                console.warn('Datenkanal nicht bereit:',
                    dataChannelRef.current ? dataChannelRef.current.readyState : 'nicht vorhanden');
            }
        }

        function cleanupWebRTC() {
            console.log('🧹 Räume WebRTC-Ressourcen auf');

            // Datenkanal schließen
            if (dataChannelRef.current) {
                console.log('🧹 Schließe Datenkanal');
                try {
                    dataChannelRef.current.close();
                } catch (e) {
                    console.error('Fehler beim Schließen des Datenkanals:', e);
                }
                dataChannelRef.current = null;
            }

            // Peer Connection schließen
            if (peerConnectionRef.current) {
                console.log('🧹 Schließe Peer-Verbindung');
                try {
                    peerConnectionRef.current.close();
                } catch (e) {
                    console.error('Fehler beim Schließen der Peer-Verbindung:', e);
                }
                peerConnectionRef.current = null;
            }

            // Socket.io-Verbindung trennen
            if (socketRef.current) {
                console.log('🧹 Trenne Socket.io-Verbindung');
                try {
                    socketRef.current.disconnect();
                } catch (e) {
                    console.error('Fehler beim Trennen der Socket.io-Verbindung:', e);
                }
                socketRef.current = null;
            }
        }

        // Spielschleife starten
        resetBall();
        gameLoop();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(requestRef.current);

            // WebRTC aufräumen
            if (gameMode === 'online-multiplayer') {
                cleanupWebRTC();
            }
        };
    }, []);

    // Funktion zum Zurücksetzen des Balls
    const resetBall = () => {
        const gameState = gameStateRef.current;
        if (gameState.gameOver) {
            return;
        }
        gameState.ballX = 400;
        gameState.ballY = 250;
        gameState.ballInResetState = true;
        gameState.ballResetStartTime = Date.now();
        gameState.ballSpeedX = 0;
        gameState.ballSpeedY = 0;
    };

    // Ball-Reset-Zustand aktualisieren
    const updateBallResetState = () => {
        const gameState = gameStateRef.current;
        if (gameState.gameOver) {
            gameState.ballInResetState = false;
            return;
        }
        if (gameState.ballInResetState) {
            if (Date.now() - gameState.ballResetStartTime >= gameState.ballResetDuration) {
                gameState.ballInResetState = false;
                gameState.ballSpeedX = Math.random() > 0.5 ? 5 : -5;
                gameState.ballSpeedY = Math.random() * 4 - 2;

                // Speichere aktuelle Richtung für Ballwechsel-Tracking
                gameState.lastBallSpeedX = gameState.ballSpeedX;
            }
        }
    };

    // Schläger aktualisieren
    const updatePaddles = () => {
        const gameState = gameStateRef.current;
        const {keys, touchControls} = gameState;
        let newLeftPaddleY = gameState.leftPaddleY;
        let newRightPaddleY = gameState.rightPaddleY;

        // Touch-Steuerung wird jetzt gleichwertig zur Tastatur behandelt
        if (gameMode === 'singleplayer') {
            // Spieler: Linker Schläger (Tasten oder Touch)
            if ((keys.upPressed || keys.wPressed || touchControls.leftUp) && newLeftPaddleY > 0) {
                newLeftPaddleY -= 8;
            } else if ((keys.downPressed || keys.sPressed || touchControls.leftDown) && newLeftPaddleY < 500 - PADDLE_HEIGHT) {
                newLeftPaddleY += 8;
            }

            // Computer: Rechter Schläger KI
            const computerPaddleCenter = newRightPaddleY + PADDLE_HEIGHT / 2;
            const distanceToMove = gameState.ballY - computerPaddleCenter;

            if (Math.abs(distanceToMove) > PADDLE_HEIGHT / 4) {
                if (distanceToMove > 0) {
                    newRightPaddleY += difficulty;
                } else {
                    newRightPaddleY -= difficulty;
                }
            }
        } else if (gameMode === 'local-multiplayer') {
            // Spieler 1: Linker Schläger mit W/S oder Touch
            if ((keys.wPressed || touchControls.leftUp) && newLeftPaddleY > 0) {
                newLeftPaddleY -= 8;
            } else if ((keys.sPressed || touchControls.leftDown) && newLeftPaddleY < 500 - PADDLE_HEIGHT) {
                newLeftPaddleY += 8;
            }

            // Spieler 2: Rechter Schläger mit Pfeiltasten oder Touch
            if ((keys.upPressed || touchControls.rightUp) && newRightPaddleY > 0) {
                newRightPaddleY -= 8;
            } else if ((keys.downPressed || touchControls.rightDown) && newRightPaddleY < 500 - PADDLE_HEIGHT) {
                newRightPaddleY += 8;
            }
        } else if (gameMode === 'online-multiplayer') {
            if (isHostState) {
                // Host steuert den linken Schläger mit beliebigen Tasten oder Touch
                if ((keys.wPressed || keys.upPressed || touchControls.leftUp) && newLeftPaddleY > 0) {
                    newLeftPaddleY -= 8;
                } else if ((keys.sPressed || keys.downPressed || touchControls.leftDown) && newLeftPaddleY < 500 - PADDLE_HEIGHT) {
                    newLeftPaddleY += 8;
                }
            } else {
                // Gast steuert den rechten Schläger mit beliebigen Tasten oder Touch
                if ((keys.wPressed || keys.upPressed || touchControls.rightUp) && newRightPaddleY > 0) {
                    newRightPaddleY -= 8;
                } else if ((keys.sPressed || keys.downPressed || touchControls.rightDown) && newRightPaddleY < 500 - PADDLE_HEIGHT) {
                    newRightPaddleY += 8;
                }
            }
        }

        // Begrenzung der Schläger
        gameState.leftPaddleY = Math.max(0, Math.min(newLeftPaddleY, 500 - PADDLE_HEIGHT));
        gameState.rightPaddleY = Math.max(0, Math.min(newRightPaddleY, 500 - PADDLE_HEIGHT));
    };

    // Ball aktualisieren
    const updateBall = () => {
        const gameState = gameStateRef.current;

        // Speichern der vorherigen Position für Ballwechsel-Tracking
        gameState.lastBallX = gameState.ballX;

        // Im Online-Modus aktualisiert nur der Host den Ball
        if (gameMode === 'online-multiplayer' && !isHostState) {
            return;
        }

        if (gameState.gameOver) {
            return;
        }

        // Ball nicht bewegen, wenn ein Gewinner feststeht
        if (gameState.scores.left >= WINNING_SCORE || gameState.scores.right >= WINNING_SCORE) {
            return;
        }

        // Nicht bewegen, wenn im Reset-Zustand
        if (gameState.ballInResetState) {
            return;
        }

        gameState.ballX += gameState.ballSpeedX;
        gameState.ballY += gameState.ballSpeedY;

        // Kollision mit oberer/unterer Wand
        if (gameState.ballY < BALL_RADIUS || gameState.ballY > 500 - BALL_RADIUS) {
            gameState.ballSpeedY = -gameState.ballSpeedY;
        }
    };

    // Kollisionsprüfung
    const checkCollisions = () => {
        const gameState = gameStateRef.current;

        // Im Online-Modus prüft nur der Host auf Kollisionen
        if (gameMode === 'online-multiplayer' && !isHostState) {
            return;
        }

        // Kollision mit linkem Schläger
        if (gameState.ballX < PADDLE_WIDTH + BALL_RADIUS) {
            if (gameState.ballY > gameState.leftPaddleY &&
                gameState.ballY < gameState.leftPaddleY + PADDLE_HEIGHT) {
                // Prüfe, ob sich die Richtung des Balls ändert (für Ballwechsel-Zählung)
                const directionChanged = gameState.ballSpeedX < 0;

                gameState.ballSpeedX = -gameState.ballSpeedX;

                // Abprallwinkel basierend auf Trefferpunkt
                const deltaY = gameState.ballY - (gameState.leftPaddleY + PADDLE_HEIGHT / 2);
                gameState.ballSpeedY = deltaY * 0.2;

                // Erhöhung der Geschwindigkeit
                gameState.ballSpeedX *= 1.05;
                if (Math.abs(gameState.ballSpeedX) > 12) {
                    gameState.ballSpeedX = gameState.ballSpeedX > 0 ? 12 : -12;
                }

                // Wenn die Richtung geändert wurde, zähle einen Ballwechsel
                if (directionChanged && onBallExchange) {
                    onBallExchange();
                }
            }
        }

        // Kollision mit rechtem Schläger
        if (gameState.ballX > 800 - PADDLE_WIDTH - BALL_RADIUS) {
            if (gameState.ballY > gameState.rightPaddleY &&
                gameState.ballY < gameState.rightPaddleY + PADDLE_HEIGHT) {
                // Prüfe, ob sich die Richtung des Balls ändert (für Ballwechsel-Zählung)
                const directionChanged = gameState.ballSpeedX > 0;

                gameState.ballSpeedX = -gameState.ballSpeedX;

                // Abprallwinkel basierend auf Trefferpunkt
                const deltaY = gameState.ballY - (gameState.rightPaddleY + PADDLE_HEIGHT / 2);
                gameState.ballSpeedY = deltaY * 0.2;

                // Erhöhung der Geschwindigkeit
                gameState.ballSpeedX *= 1.05;
                if (Math.abs(gameState.ballSpeedX) > 12) {
                    gameState.ballSpeedX = gameState.ballSpeedX > 0 ? 12 : -12;
                }

                // Wenn die Richtung geändert wurde, zähle einen Ballwechsel
                if (directionChanged && onBallExchange) {
                    onBallExchange();
                }
            }
        }
    };

    // Punktestand überprüfen
    const checkScore = () => {
        const gameState = gameStateRef.current;

        // Im Online-Modus aktualisiert nur der Host den Punktestand
        if (gameMode === 'online-multiplayer' && !isHostState) {
            return;
        }

        if (gameState.gameOver) {
            return;
        }

        // Prüfe auf Gewinner, bevor der Ball zurückgesetzt wird
        if (gameState.scores.left >= WINNING_SCORE || gameState.scores.right >= WINNING_SCORE) {
            // Wenn bereits ein Gewinner feststeht, den Ball nicht neu starten
            return;
        }

        if (gameState.ballX < 0) {
            // Aktualisiere den Score im gameStateRef
            gameState.scores.right += 1;
            // Aktualisiere den React-State für die Anzeige
            setScores({...gameState.scores});

            // Überprüfe, ob nun ein Gewinner feststeht
            if (gameState.scores.right >= WINNING_SCORE) {
                checkWinner(gameState.scores);
            } else {
                // Nur zurücksetzen, wenn noch kein Gewinner feststeht
                resetBall();
            }
        } else if (gameState.ballX > 800) {
            // Aktualisiere den Score im gameStateRef
            gameState.scores.left += 1;
            // Aktualisiere den React-State für die Anzeige
            setScores({...gameState.scores});

            // Überprüfe, ob nun ein Gewinner feststeht
            if (gameState.scores.left >= WINNING_SCORE) {
                checkWinner(gameState.scores);
            } else {
                // Nur zurücksetzen, wenn noch kein Gewinner feststeht
                resetBall();
            }
        }
    };

    // Gewinner überprüfen
    const checkWinner = (currentScores) => {
        if (currentScores.left >= WINNING_SCORE || currentScores.right >= WINNING_SCORE) {
            const gameState = gameStateRef.current;
            gameState.gameOver = true; // Markiere das Spiel als beendet
            setGameRunning(false);

            const winner = currentScores.left > currentScores.right ? 'left' : 'right';

            // Im Online-Multiplayer: informiere den Gegner über das Spielende
            if (gameMode === 'online-multiplayer' && isHostState && dataChannelRef.current?.readyState === 'open') {
                sendData({
                    type: 'gameOver',
                    winner: winner
                });
            }

            // Bestimme, ob der lokale Spieler gewonnen hat
            let isLocalPlayerWinner = false;
            if (gameMode === 'singleplayer') {
                isLocalPlayerWinner = (currentScores.left > currentScores.right);
            } else if (gameMode === 'local-multiplayer') {
                isLocalPlayerWinner = true;
            } else if (gameMode === 'online-multiplayer') {
                if (isHostState) {
                    isLocalPlayerWinner = (currentScores.left > currentScores.right);
                } else {
                    isLocalPlayerWinner = (currentScores.right > currentScores.left);
                }
            }

            // Spiele den Gewinner-Sound ab
            if (isLocalPlayerWinner && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(err => console.error('Fehler beim Abspielen des Sounds:', err));
            }

            // Stoppe den Ball in der Mitte
            gameState.ballX = 400;
            gameState.ballY = 250;
            gameState.ballSpeedX = 0;
            gameState.ballSpeedY = 0;
            gameState.ballInResetState = false; // Wichtig: Ball nicht im Reset-Zustand halten

            // Starte Animation
            gameState.showWinAnimation = true;
            gameState.winAnimationStartTime = Date.now();
            gameState.winningPlayer = winner;
            gameState.isLocalPlayerWinner = isLocalPlayerWinner;

            // Initialisiere Regentropfen für Verlierer-Animation
            if (!isLocalPlayerWinner) {
                initializeRaindrops();
            }

            // Nach der Animation zum Game-Over-Screen
            setTimeout(() => {
                if (gameState) { // Sicherstellen, dass der Zustand noch existiert (Komponente nicht unmounted)
                    gameState.showWinAnimation = false;
                    onGameOver(winner, isLocalPlayerWinner);
                }
            }, gameState.winAnimationDuration);
        }
    };

    // Regentropfen initialisieren
    const initializeRaindrops = () => {
        const raindrops = [];
        const RAINDROP_COUNT = 100;

        for (let i = 0; i < RAINDROP_COUNT; i++) {
            raindrops.push({
                x: Math.random() * 800,
                y: Math.random() * 500 - 500, // Start über dem Canvas
                length: 10 + Math.random() * 20,
                speed: 5 + Math.random() * 10
            });
        }

        gameStateRef.current.raindrops = raindrops;
    };

    // Gewinner-Animation zeichnen
    const drawWinAnimation = (ctx) => {
        const gameState = gameStateRef.current;
        if (!gameState.showWinAnimation) return;

        const elapsed = Date.now() - gameState.winAnimationStartTime;
        const progress = Math.min(elapsed / gameState.winAnimationDuration, 1);

        // Hintergrund-Flash-Effekt
        const flashIntensity = (Math.sin(elapsed * 0.01) + 1) / 2;
        ctx.fillStyle = `rgba(100, 100, 255, ${flashIntensity * 0.3})`;
        ctx.fillRect(0, 0, 800, 500);

        // Textanimation
        ctx.save();
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Pulsierender Effekt für den Text
        const scale = 1 + Math.sin(elapsed * 0.01) * 0.1;
        ctx.translate(800 / 2, 500 / 2);
        ctx.scale(scale, scale);

        // Text basierend auf Spielmodus und Gewinner
        let winText = '';
        if (gameState.winningPlayer === 'left') {
            if (gameMode === 'singleplayer') {
                winText = 'Du hast gewonnen!';
                ctx.fillStyle = `rgba(50, 255, 50, ${0.7 + flashIntensity * 0.3})`;
            } else if (gameMode === 'local-multiplayer') {
                winText = 'Spieler 1 gewinnt!';
                ctx.fillStyle = `rgba(50, 255, 50, ${0.7 + flashIntensity * 0.3})`;
            } else if (gameMode === 'online-multiplayer') {
                winText = isHostState ? 'Du hast gewonnen!' : 'Gegner gewinnt!';
                ctx.fillStyle = isHostState
                    ? `rgba(50, 255, 50, ${0.7 + flashIntensity * 0.3})`
                    : `rgba(255, 50, 50, ${0.7 + flashIntensity * 0.3})`;
            }
        } else {
            if (gameMode === 'singleplayer') {
                winText = 'Computer gewinnt!';
                ctx.fillStyle = `rgba(255, 50, 50, ${0.7 + flashIntensity * 0.3})`;
            } else if (gameMode === 'local-multiplayer') {
                winText = 'Spieler 2 gewinnt!';
                ctx.fillStyle = `rgba(50, 50, 255, ${0.7 + flashIntensity * 0.3})`;
            } else if (gameMode === 'online-multiplayer') {
                winText = isHostState ? 'Gegner gewinnt!' : 'Du hast gewonnen!';
                ctx.fillStyle = isHostState
                    ? `rgba(255, 50, 50, ${0.7 + flashIntensity * 0.3})`
                    : `rgba(50, 255, 50, ${0.7 + flashIntensity * 0.3})`;
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
    };

    // Verlierer-Animation zeichnen
    const drawLoserAnimation = (ctx) => {
        const gameState = gameStateRef.current;
        if (!gameState.showWinAnimation) return;

        const elapsed = Date.now() - gameState.winAnimationStartTime;
        const progress = Math.min(elapsed / gameState.winAnimationDuration, 1);

        // Dunkler Hintergrund-Effekt
        ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
        ctx.fillRect(0, 0, 800, 500);

        // Wackeleffekt für die gesamte Szene
        ctx.save();
        const shakeAmount = Math.sin(elapsed * 0.02) * 5;
        ctx.translate(shakeAmount, 0);

        // Regentropfen zeichnen
        if (gameState.raindrops.length === 0) {
            initializeRaindrops();
        }

        ctx.strokeStyle = 'rgba(70, 130, 180, 0.7)'; // Bläuliche Regentropfen
        ctx.lineWidth = 2;

        for (let i = 0; i < gameState.raindrops.length; i++) {
            const drop = gameState.raindrops[i];

            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
            ctx.stroke();

            // Regentropfen bewegen
            drop.y += drop.speed;

            // Regentropfen zurücksetzen, wenn sie unten rausfallen
            if (drop.y > 500) {
                drop.y = -drop.length;
                drop.x = Math.random() * 800;
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
            loseText = (gameState.winningPlayer === 'left') ? 'Spieler 2 verliert!' : 'Spieler 1 verliert!';
        } else if (gameMode === 'online-multiplayer') {
            loseText = 'Verloren!';
        }

        // Schatten für bessere Lesbarkeit
        ctx.shadowColor = "black";
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(220, 20, 60, 0.8)'; // Rötlicher Text für Verlierer
        ctx.fillText(loseText, 800 / 2 + textShakeX, 500 / 2 + textShakeY);

        // "Game Over" Text mit Fade-In-Effekt
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = `rgba(150, 150, 150, ${progress * 0.8})`;
        ctx.fillText('Game Over', 800 / 2, 500 / 2 + 60);

        ctx.restore();
    };

    // Alles zeichnen
    const drawEverything = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const gameState = gameStateRef.current;

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

        // Linker Schläger zeichnen
        ctx.fillStyle = "white";
        ctx.fillRect(0, gameState.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Rechter Schläger zeichnen
        ctx.fillRect(canvas.width - PADDLE_WIDTH, gameState.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Ball zeichnen
        ctx.beginPath();
        ctx.arc(gameState.ballX, gameState.ballY, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();

        // Countdown während Reset-Zustand anzeigen
        if (gameState.ballInResetState) {
            ctx.font = "30px Arial";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";

            // Berechne verbleibende Zeit
            const timeElapsed = Date.now() - gameState.ballResetStartTime;
            const timeLeft = Math.ceil((gameState.ballResetDuration - timeElapsed) / 1000);

            // Zeige Countdown nur, wenn noch Zeit übrig ist
            if (timeLeft > 0) {
                ctx.fillText(`${timeLeft}`, canvas.width / 2, canvas.height / 2 - 50);
            }
        }

        // Wenn die Animation aktiv ist, zeichne die entsprechende Animation
        if (gameState.showWinAnimation) {
            if (gameState.isLocalPlayerWinner) {
                drawWinAnimation(ctx);
            } else {
                drawLoserAnimation(ctx);
            }
        }
    };

    // Spielschleife
    const gameLoop = () => {
        if (gameRunning || gameStateRef.current.showWinAnimation) {
            if (gameRunning) {
                // Nur Host oder lokale Spieler aktualisieren den Ball-Reset-Zustand
                if (gameMode !== 'online-multiplayer' || isHostState) {
                    updateBallResetState();
                }

                updatePaddles();
                updateBall();
                checkCollisions();

                // Im Online-Modus aktualisiert nur der Host den Punktestand
                if (gameMode !== 'online-multiplayer' || isHostState) {
                    checkScore();
                }

                // Im Online-Modus senden wir den Spielstatus mit Ratenbegrenzung
                if (gameMode === 'online-multiplayer' && dataChannelRef.current?.readyState === 'open') {
                    const now = Date.now();
                    if (now - lastSendTimeRef.current > 30) { // Max ~33fps
                        sendGameState();
                        lastSendTimeRef.current = now;
                    }
                }
            }

            // Zeichnen immer ausführen
            drawEverything();

            // Nächsten Frame anfordern
            requestRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const resetGameState = () => {
        const gameState = gameStateRef.current;
        gameState.gameOver = false;
        gameState.showWinAnimation = false;
        gameState.scores.left = 0;
        gameState.scores.right = 0;
        resetBall();
    };

    // Hilfsfunktion zum Senden von Daten über den Datenkanal
    const sendData = (data) => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
            try {
                console.log(`📤 Senden (${isHostState ? 'Host' : 'Gast'}):`, data);
                dataChannelRef.current.send(JSON.stringify(data));
            } catch (error) {
                console.error('Fehler beim Senden von Daten:', error);
            }
        } else {
            console.warn('Datenkanal nicht bereit:',
                dataChannelRef.current ? dataChannelRef.current.readyState : 'nicht vorhanden');
        }
    };

    // Spieldaten synchronisieren
    const sendGameState = () => {
        const gameState = gameStateRef.current;
        const state = {
            type: 'gameState',
            paddleY: isHostState ? gameState.leftPaddleY : gameState.rightPaddleY,
            timestamp: Date.now() // Timestamp für bessere Synchronisierung
        };

        // Host sendet zusätzlich Ball- und Punktestand-Daten
        if (isHostState) {
            state.ballX = gameState.ballX;
            state.ballY = gameState.ballY;
            state.ballSpeedX = gameState.ballSpeedX;
            state.ballSpeedY = gameState.ballSpeedY;
            state.leftScore = gameState.scores.left;
            state.rightScore = gameState.scores.right;
            state.ballInResetState = gameState.ballInResetState;
            state.ballResetStartTime = gameState.ballResetStartTime;
        }

        sendData(state);
    };

    // Punktestand-Anzeige
    let scoreText = '';
    if (gameMode === 'singleplayer') {
        scoreText = `${playerName}: ${scores.left} | Computer: ${scores.right}`;
    } else if (gameMode === 'local-multiplayer') {
        scoreText = `${playerName}: ${scores.left} | Spieler 2: ${scores.right}`;
    } else if (gameMode === 'online-multiplayer') {
        if (isHostState) {
            scoreText = `${playerName} (links): ${scores.left} | Gegner: ${scores.right}`;
        } else {
            scoreText = `Gegner: ${scores.left} | ${playerName} (rechts): ${scores.right}`;
        }
    }

    return (
        <div className="game-container">
            <canvas ref={canvasRef} width={800} height={500}/>

            {/* Neuer Zurück-Button */}
            <button
                className="back-to-menu-btn"
                onClick={() => setShowConfirmDialog(true)}
                title="Zurück zum Hauptmenü"
            >
                ⮜ Menü
            </button>

            {showConfirmDialog && (
                <div className="confirm-dialog">
                    <div className="confirm-dialog-content">
                        <p>Spiel wirklich beenden?</p>
                        <div className="confirm-buttons">
                            <button
                                className="confirm-yes"
                                onClick={onMainMenu}
                            >
                                Ja
                            </button>
                            <button
                                className="confirm-no"
                                onClick={() => setShowConfirmDialog(false)}
                            >
                                Nein
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="score-display">
                {scoreText}
            </div>

            {gameMode === 'online-multiplayer' && (
                <>
                    <div className="connection-info">
                        Verbindung: <span
                        style={{color: connectionStatus === 'connected' ? '#4CAF50' : '#f44336'}}>
                        {connectionStatus}
                    </span>
                    </div>
                    <div className="ping-display">
                        Ping: <span>{ping}</span> ms
                    </div>
                </>
            )}

            {/* Vereinfachte Touch-Steuerung für alle Modi */}
            {isMobileDevice && (
                <TouchControls
                    onMoveUp={() => {
                        if (gameMode === 'singleplayer' ||
                            (gameMode === 'online-multiplayer' && isHostState) ||
                            gameMode === 'local-multiplayer') {
                            gameStateRef.current.touchControls.leftUp = true;
                            gameStateRef.current.touchControls.leftDown = false;
                        }

                        if (gameMode === 'local-multiplayer' ||
                            (gameMode === 'online-multiplayer' && !isHostState)) {
                            gameStateRef.current.touchControls.rightUp = true;
                            gameStateRef.current.touchControls.rightDown = false;
                        }
                    }}
                    onMoveDown={() => {
                        if (gameMode === 'singleplayer' ||
                            (gameMode === 'online-multiplayer' && isHostState) ||
                            gameMode === 'local-multiplayer') {
                            gameStateRef.current.touchControls.leftDown = true;
                            gameStateRef.current.touchControls.leftUp = false;
                        }

                        if (gameMode === 'local-multiplayer' ||
                            (gameMode === 'online-multiplayer' && !isHostState)) {
                            gameStateRef.current.touchControls.rightDown = true;
                            gameStateRef.current.touchControls.rightUp = false;
                        }
                    }}
                />
            )}
        </div>
    );
};

export default PongGame;