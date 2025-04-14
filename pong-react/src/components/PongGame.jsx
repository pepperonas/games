// components/PongGame.jsx - Komplette Version mit allen Verbesserungen
import React, {useEffect, useRef, useState} from 'react';
import './PongGame.css';
import './TouchControls.css';
import TouchControls from './TouchControls';
import {socketManager} from '../socket-connection';

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 15;
const BALL_RADIUS = 10;
const WINNING_SCORE = 5;

// ICE-Server-Konfiguration für WebRTC
const ICE_SERVERS = [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.google.com:19302'},
    {urls: 'stun:stun2.google.com:19302'}
];

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
                      onMainMenu,
                      socket, // WICHTIG: Socket als Prop übergeben
                      roomId  // WICHTIG: Raum-ID als Prop übergeben
                  }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const socketRef = useRef(null); // Socket-Referenz initialisieren
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);
    const pendingCandidatesRef = useRef([]); // Speicher für ICE-Kandidaten
    const lastSendTimeRef = useRef(0); // Für Ratenbegrenzung
    const isHostRef = useRef(initialIsHost); // Ref für sofortigen Zugriff auf Host-Status
    const remoteDescriptionSetRef = useRef(false); // Flag für Remote-Description-Status
    const peerConnectionEstablishedRef = useRef(false); // Flag für erfolgreiche Verbindung
    const currentRoomIdRef = useRef(null); // Raum-ID speichern
    const lastFrameTimeRef = useRef(Date.now()); // Für FPS-Berechnung

    // isHost als State statt als props
    const [isHostState, setIsHostState] = useState(initialIsHost);
    const [scores, setScores] = useState({left: 0, right: 0});
    const [connectionStatus, setConnectionStatus] = useState('-');
    const [ping, setPing] = useState('-');
    const [gameRunning, setGameRunning] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Spielstatus mit Unterstützung für Shift-Taste
    const gameStateRef = useRef({
        ballX: 400,
        ballY: 250,
        ballSpeedX: 5,
        ballSpeedY: 2,
        leftPaddleY: 200,
        rightPaddleY: 200,
        // Vorherige Paddel-Positionen für Bewegungserkennung
        prevLeftPaddleY: 200,
        prevRightPaddleY: 200,
        scores: {left: 0, right: 0},
        keys: {
            wPressed: false,
            sPressed: false,
            upPressed: false,
            downPressed: false,
            shiftPressed: false
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
        lastBallX: 400,
        lastBallSpeedX: 5
    });

    // Audio Element
    const audioRef = useRef(null);

    const songs = [
        'assets/relight.m4a',
        'assets/power_of_love.mp3',
        'assets/welcome-to-st-tropez.wav',
        'assets/buscame.mp3',
        'assets/i-want-your-soul.wav'
    ];

    // Initialisieren von Socket und RoomId, entweder aus Props oder aus dem SocketManager
    useEffect(() => {
        // Socket initialisieren, entweder aus props oder aus socketManager
        if (socket) {
            socketRef.current = socket;
        } else if (gameMode === 'online-multiplayer') {
            try {
                socketRef.current = socketManager.getSocket();
            } catch (err) {
                console.error('Fehler beim Abrufen des Sockets:', err);
            }
        }

        // RoomId initialisieren
        if (roomId) {
            currentRoomIdRef.current = roomId;
        } else if (gameMode === 'online-multiplayer' && socketManager.roomId) {
            currentRoomIdRef.current = socketManager.roomId;
        }

        console.log('🔌 Socket und RoomId initialisiert:',
            socketRef.current?.id || 'kein Socket',
            currentRoomIdRef.current || 'keine RoomId');

    }, [gameMode, socket, roomId]);

    // Effekt für Game Reset
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

    // WebRTC-Setup für Online-Modus
    useEffect(() => {
        if (gameMode === 'online-multiplayer') {
            console.log('🎮 Initialisiere Online-Multiplayer mit initialIsHost =', initialIsHost);
            isHostRef.current = initialIsHost;
            setIsHostState(initialIsHost);

            // Verzögerung für sicherere Initialisierung
            setTimeout(() => {
                setupWebRTC();
            }, 100);
        }

        return () => {
            // Aufräumen, wenn die Komponente unmountet wird
            if (gameMode === 'online-multiplayer') {
                cleanupWebRTC();
            }
        };
    }, [gameMode, initialIsHost]);

    // Haupt-Setup Effekt
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

        // Tastatur-Event-Listener mit Shift-Taste
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
            } else if (e.key === 'Shift') {
                gameState.keys.shiftPressed = true;
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
            } else if (e.key === 'Shift') {
                gameState.keys.shiftPressed = false;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // Spielschleife starten
        resetBall();
        gameLoop();

        // Aufräumen beim Unmount
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resizeCanvas);

            // Animation-Frame abbrechen
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, []);

    // Hilfsfunktion zum Senden von Daten über den Datenkanal
    const sendData = (data) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            // Nicht einmal versuchen zu senden, wenn der Kanal nicht offen ist
            return false;
        }

        try {
            // Nur bestimmte Nachrichtentypen loggen, um die Konsole nicht zu überfluten
            if (data.type !== 'gameState' && data.type !== 'ping' && data.type !== 'pong') {
                console.log(`📤 Sende ${data.type}-Nachricht:`, data);
            }

            const jsonData = JSON.stringify(data);
            dataChannelRef.current.send(jsonData);
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Senden von Daten:', error);
            return false;
        }
    };

    // Funktion zur Ping-Messung starten
    const startPingMeasurement = () => {
        console.log('📊 Starte Ping-Messung');

        // Ping alle 2 Sekunden senden
        const pingIntervalId = setInterval(() => {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                try {
                    const pingId = Date.now();
                    sendData({type: 'ping', id: pingId});
                } catch (e) {
                    console.error('Fehler beim Senden des Pings:', e);
                }
            } else {
                // Wenn der Datenkanal geschlossen wurde, Interval beenden
                clearInterval(pingIntervalId);
            }
        }, 2000);

        // Beim Aufräumen den Interval löschen
        return () => clearInterval(pingIntervalId);
    };

    // Setup für den Datenkanal
    const setupDataChannel = () => {
        if (!dataChannelRef.current) {
            console.error('❌ Kein Datenkanal zum Einrichten vorhanden');
            return;
        }

        console.log('📢 Richte Datenkanal ein. Aktueller Status:', dataChannelRef.current.readyState, 'Label:', dataChannelRef.current.label);

        // Event-Listener registrieren
        dataChannelRef.current.onopen = () => {
            console.log('🎉 Datenkanal geöffnet! ReadyState:', dataChannelRef.current.readyState);
            setConnectionStatus('connected');

            // Ping-Messung starten
            startPingMeasurement();

            // Test-Nachricht senden
            try {
                const testMsg = {
                    type: 'hello',
                    message: 'Verbindung hergestellt!',
                    timestamp: Date.now()
                };
                console.log('Sende Test-Nachricht:', testMsg);
                dataChannelRef.current.send(JSON.stringify(testMsg));
            } catch (e) {
                console.error('❌ Fehler beim Senden der Test-Nachricht:', e);
            }
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

                // Nicht alle Nachrichtentypen loggen (reduziert Spam)
                if (data.type !== 'gameState' && data.type !== 'ping' && data.type !== 'pong') {
                    console.log('📩 Nachricht empfangen:', data);
                }

                switch (data.type) {
                    case 'gameState':
                        processGameStateUpdate(data);
                        break;
                    case 'ping':
                        // Ping-Anfrage - sende sofort Antwort zurück
                        sendData({type: 'pong', id: data.id});
                        break;
                    case 'pong':
                        // Ping-Antwort - berechne Latenz
                        const latency = Date.now() - data.id;
                        setPing(latency.toString());
                        break;
                    case 'hello':
                        console.log('👋 Begrüßungsnachricht vom Peer:', data.message);
                        break;
                    case 'syncCheck':
                        console.log('🔄 Synchronisierungscheck vom Peer:', data);
                        // Antworte mit deinem aktuellen Spielstatus
                        sendData({
                            type: 'syncResponse',
                            ballX: gameStateRef.current.ballX,
                            ballY: gameStateRef.current.ballY,
                            leftPaddleY: gameStateRef.current.leftPaddleY,
                            rightPaddleY: gameStateRef.current.rightPaddleY,
                            scores: gameStateRef.current.scores,
                            timestamp: Date.now()
                        });
                        break;
                    case 'syncResponse':
                        console.log('🔄 Synchronisierungsantwort vom Peer:', data);
                        // Zeige die Differenz zwischen lokalem und Remote-Status
                        const localBall = {
                            x: gameStateRef.current.ballX,
                            y: gameStateRef.current.ballY
                        };
                        console.log('Differenz: Ball lokal:', localBall, 'Ball remote:', {
                            x: data.ballX,
                            y: data.ballY
                        });
                        break;
                    case 'gameOver':
                        processGameOverMessage(data);
                        break;
                    default:
                        console.log('❓ Unbekannter Nachrichtentyp:', data.type);
                }
            } catch (error) {
                console.error('❌ Fehler beim Verarbeiten der Nachricht:', error, 'Raw data:', event.data);
            }
        };
    };

    // Funktion zum Erstellen eines WebRTC-Angebots
    const createOffer = async () => {
        try {
            console.log('📤 Erstelle SDP-Angebot');
            if (!peerConnectionRef.current) {
                console.error('Keine PeerConnection vorhanden für createOffer');
                return;
            }

            const offer = await peerConnectionRef.current.createOffer();
            console.log('📤 SDP-Angebot erstellt');

            await peerConnectionRef.current.setLocalDescription(offer);
            console.log('📤 Lokale Beschreibung gesetzt, sende an Signaling-Server');

            // Kurze Verzögerung, um sicherzustellen, dass alles gesetzt ist
            setTimeout(() => {
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('offer', peerConnectionRef.current.localDescription);
                } else {
                    console.error('Socket nicht verbunden - Angebot konnte nicht gesendet werden');
                }
            }, 500);
        } catch (error) {
            console.error('📤 Fehler beim Erstellen des Angebots:', error);
        }
    };

    // Debug-Hilfsfunktion zur Prüfung der Datenkanal-Verbindung
    const checkDataChannelState = () => {
        if (!dataChannelRef.current) {
            console.log('❌ Datenkanal existiert nicht');
            return;
        }

        console.log(`Datenkanal-Status: ${dataChannelRef.current.readyState}`);
        console.log(`Datenkanal-Label: ${dataChannelRef.current.label}`);
        console.log(`Datenkanal-ID: ${dataChannelRef.current.id}`);
        console.log(`Buffered Amount: ${dataChannelRef.current.bufferedAmount}`);

        // Test-Nachricht senden
        if (dataChannelRef.current.readyState === 'open') {
            sendData({
                type: 'test',
                message: 'Test-Nachricht',
                timestamp: Date.now()
            });
        }
    };

    // Gepufferte ICE-Kandidaten hinzufügen
    const addPendingIceCandidates = async () => {
        if (!peerConnectionRef.current) return;

        const candidates = pendingCandidatesRef.current;
        if (candidates.length > 0) {
            console.log(`🧊 Füge ${candidates.length} gepufferte ICE-Kandidaten hinzu`);

            for (const candidate of candidates) {
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('🧊 ICE-Kandidat erfolgreich hinzugefügt');
                } catch (error) {
                    console.error('🧊 Fehler beim Hinzufügen des ICE-Kandidaten:', error);
                }
            }
            // Liste leeren
            pendingCandidatesRef.current = [];
        }
    };

    // Hilfsfunktionen für WebRTC-Verbindung
    const setupWebRTC = () => {
        console.log('🎮 Starte Online-Multiplayer Setup');

        // Überprüfen, ob wir einen Socket haben oder bekommen können
        if (!socketRef.current) {
            try {
                socketRef.current = socketManager.getSocket();
            } catch (err) {
                console.error('⚠️ Kein Socket verfügbar!', err);
                return;
            }
        }

        // Überprüfe Socket-Status
        if (socketRef.current && !socketRef.current.connected) {
            console.warn('⚠️ Socket ist nicht verbunden. Versuchen Sie neu zu verbinden...');
            try {
                socketRef.current.connect();
            } catch (err) {
                console.error('⚠️ Socket-Verbindung fehlgeschlagen:', err);
            }
        }

        console.log('🔌 Verwende Socket mit ID:', socketRef.current?.id || 'unbekannt');
        console.log('🏠 Raumverbindung:', currentRoomIdRef.current || 'keine');

        // Bestehende Event-Handler entfernen, um Duplikate zu vermeiden
        if (socketRef.current) {
            try {
                socketRef.current.off('offer');
                socketRef.current.off('answer');
                socketRef.current.off('iceCandidate');
                socketRef.current.off('error');
                socketRef.current.off('peerDisconnected');
            } catch (err) {
                console.warn('⚠️ Fehler beim Entfernen von Event-Listenern:', err);
            }
        }

        // Weitere Socket.io Event-Handler für WebRTC-Signalisierung
        setupWebRTCEventHandlers();

        // PeerConnection mit Verzögerung initialisieren
        setTimeout(() => {
            try {
                initializePeerConnection(isHostRef.current);
            } catch (err) {
                console.error('⚠️ Fehler bei PeerConnection-Initialisierung:', err);
            }
        }, 500);
    };

    const setupWebRTCEventHandlers = () => {
        // Sicherstellen, dass socketRef.current existiert
        if (!socketRef.current) {
            console.error('⚠️ Socket-Referenz fehlt bei Event-Handler-Setup');
            return;
        }

        socketRef.current.on('offer', async (data) => {
            console.log('📩 SDP-Angebot empfangen:', data);

            try {
                // Überprüfen, ob die PeerConnection bereits existiert
                if (!peerConnectionRef.current) {
                    console.log('⚠️ PeerConnection noch nicht initialisiert, erstelle sie jetzt');
                    isHostRef.current = false; // Wenn wir ein Angebot erhalten, sind wir der Gast
                    setIsHostState(false);

                    // PeerConnection initialisieren
                    initializePeerConnection(false);

                    // Kurze Verzögerung, um sicherzustellen, dass die PeerConnection initialisiert ist
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                // Sicherheitsprüfung
                if (!peerConnectionRef.current) {
                    throw new Error('PeerConnection konnte nicht initialisiert werden');
                }

                // Jetzt können wir das Remote-Angebot setzen
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
                console.log('📩 Remote-Beschreibung gesetzt, erstelle Antwort');
                remoteDescriptionSetRef.current = true;

                // Gepufferte ICE-Kandidaten hinzufügen
                await addPendingIceCandidates();

                const answer = await peerConnectionRef.current.createAnswer();
                console.log('📩 SDP-Antwort erstellt');

                await peerConnectionRef.current.setLocalDescription(answer);
                console.log('📩 Lokale Beschreibung gesetzt, sende Antwort');

                // Kurze Verzögerung für stabileres Signaling
                setTimeout(() => {
                    if (socketRef.current && socketRef.current.connected) {
                        socketRef.current.emit('answer', peerConnectionRef.current.localDescription);
                    } else {
                        console.error('⚠️ Socket nicht verbunden - Antwort konnte nicht gesendet werden');
                    }
                }, 300);
            } catch (error) {
                console.error('📩 Fehler beim Verarbeiten des Angebots:', error);
            }
        });

        socketRef.current.on('answer', async (data) => {
            console.log('📩 SDP-Antwort empfangen:', data);
            try {
                // Überprüfen, ob die PeerConnection bereits existiert
                if (!peerConnectionRef.current) {
                    console.error('⚠️ Keine PeerConnection für die Antwort vorhanden');
                    return;
                }

                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
                remoteDescriptionSetRef.current = true;
                console.log('📩 Remote-Beschreibung gesetzt');

                // Gepufferte ICE-Kandidaten hinzufügen
                await addPendingIceCandidates();
            } catch (error) {
                console.error('📩 Fehler beim Verarbeiten der Antwort:', error);
            }
        });

        socketRef.current.on('iceCandidate', async (data) => {
            console.log('🧊 ICE-Kandidat empfangen:', data);

            // Kandidat zur Liste hinzufügen
            pendingCandidatesRef.current.push(data);

            // Nur hinzufügen, wenn RemoteDescription gesetzt ist
            if (peerConnectionRef.current && remoteDescriptionSetRef.current) {
                await addPendingIceCandidates();
            } else {
                console.log('⚠️ ICE-Kandidat für später gespeichert, warte auf Remote Description');
            }
        });

        socketRef.current.on('error', ({message}) => {
            console.error('❌ Server-Fehler:', message);
        });

        socketRef.current.on('peerDisconnected', () => {
            console.log('👋 Gegner hat Verbindung getrennt');
        });
    };

    const initializePeerConnection = (isHost) => {
        console.log(`🔄 Initialisiere Peer Connection als ${isHost ? 'Host' : 'Gast'}`);

        // Remote Description Status zurücksetzen
        remoteDescriptionSetRef.current = false;

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

        // Versuche, eine neue PeerConnection zu erstellen
        try {
            // Verwende eine lokale Variable für die neue PeerConnection
            const peerConnection = new RTCPeerConnection({iceServers: ICE_SERVERS});
            console.log('✅ PeerConnection erfolgreich erstellt');

            // Erst nach erfolgreicher Erstellung die Referenz setzen
            peerConnectionRef.current = peerConnection;

            // Event Handler mit robusterer Fehlerbehandlung
            peerConnection.onicecandidate = (event) => {
                if (!event || !socketRef.current) return;

                if (event.candidate) {
                    console.log('🧊 Neuer ICE-Kandidat gefunden:', event.candidate);
                    // Überprüfe, ob socketRef.current existiert und verbunden ist
                    if (socketRef.current && socketRef.current.connected) {
                        socketRef.current.emit('iceCandidate', event.candidate);
                    } else {
                        console.warn('⚠️ Socket nicht verfügbar - ICE-Kandidat kann nicht gesendet werden');
                        // Kandidaten zur Liste hinzufügen, um sie später zu senden
                        pendingCandidatesRef.current.push(event.candidate);
                    }
                } else {
                    console.log('🧊 ICE-Kandidatensammlung abgeschlossen');
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                if (!peerConnectionRef.current) return;

                const state = peerConnectionRef.current.iceConnectionState;
                console.log('🧊 ICE-Status geändert:', state);
                setConnectionStatus(state);

                // Bei erfolgreicher Verbindung den Status setzen
                if (state === 'connected' || state === 'completed') {
                    peerConnectionEstablishedRef.current = true;
                }

                // Zusätzliche Informationen für Fehlersuche
                if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                    peerConnectionEstablishedRef.current = false;
                    console.warn('⚠️ ICE-Verbindung problematisch:', state);
                }
            };

            peerConnection.onconnectionstatechange = () => {
                if (!peerConnectionRef.current) return;

                const state = peerConnectionRef.current.connectionState;
                console.log('🔄 Verbindungsstatus geändert:', state);

                if (state === 'connected') {
                    console.log('✅ WebRTC-Verbindung erfolgreich hergestellt!');
                    peerConnectionEstablishedRef.current = true;
                } else if (state === 'failed') {
                    console.error('❌ WebRTC-Verbindung fehlgeschlagen!');
                    peerConnectionEstablishedRef.current = false;
                }
            };

            // Zusätzliches Ereignis für Fehlersuche
            peerConnection.onicecandidateerror = (event) => {
                console.error('🧊 ICE-Kandidat Fehler:', event);
            };

            // Datenkanal einrichten mit verbesserter Fehlerbehandlung
            try {
                // KRITISCH: Beide Seiten erstellen einen eigenen Datenkanal mit gleicher ID
                console.log(`📢 Erstelle Datenkanal mit negotiated: true und ID: 0`);

                const dataChannel = peerConnection.createDataChannel('gameData', {
                    ordered: true,
                    negotiated: true, // WICHTIG: Direkt ausgehandelter Kanal
                    id: 0 // Feste ID für beide Seiten
                });

                // Referenz erst nach erfolgreicher Erstellung setzen
                dataChannelRef.current = dataChannel;

                setupDataChannel();

                // Nur der Host erstellt das Angebot
                if (isHost) {
                    // WICHTIG: Zeitverzögerung für das Angebot
                    setTimeout(() => {
                        createOffer();
                    }, 1000);
                }
            } catch (error) {
                console.error('📢 Fehler beim Einrichten des Datenkanals:', error);
            }
        } catch (error) {
            console.error('Fehler beim Erstellen der RTCPeerConnection:', error);
            peerConnectionRef.current = null;
        }
    };

    const cleanupWebRTC = () => {
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

        // Event-Listener entfernen, aber Socket nicht trennen
        if (socketRef.current) {
            console.log('🧹 Entferne Socket-Event-Listener');
            try {
                socketRef.current.off('offer');
                socketRef.current.off('answer');
                socketRef.current.off('iceCandidate');
                socketRef.current.off('error');
                socketRef.current.off('peerDisconnected');
            } catch (e) {
                console.error('Fehler beim Entfernen der Socket-Event-Listener:', e);
            }
        }
    };

    // Verbesserte resetBall Funktion mit besserer Zufallsverteilung
    const resetBall = () => {
        const gameState = gameStateRef.current;
        if (gameState.gameOver) {
            return;
        }

        // Positioniere den Ball in der Mitte
        gameState.ballX = 400;
        gameState.ballY = 250;
        gameState.ballInResetState = true;
        gameState.ballResetStartTime = Date.now();
        gameState.ballSpeedX = 0;
        gameState.ballSpeedY = 0;

        // Die Aktualisierung der Ballgeschwindigkeit erfolgt in updateBallResetState
    };

    // Verbesserte updateBallResetState Funktion für bessere Zufallswerte
    const updateBallResetState = () => {
        const gameState = gameStateRef.current;
        if (gameState.gameOver) {
            gameState.ballInResetState = false;
            return;
        }

        if (gameState.ballInResetState) {
            if (Date.now() - gameState.ballResetStartTime >= gameState.ballResetDuration) {
                gameState.ballInResetState = false;

                // Wähle zufällig eine Richtung (links oder rechts)
                const directionX = Math.random() > 0.5 ? 1 : -1;

                // Setze eine bessere vertikale Komponente für vielfältigere Trajektorien
                // Zwischen -3 und 3, aber niemals 0
                let speedY = (Math.random() * 6 - 3);
                if (Math.abs(speedY) < 0.5) speedY = (speedY >= 0) ? 0.5 : -0.5;

                gameState.ballSpeedX = 5 * directionX;
                gameState.ballSpeedY = speedY;

                // Speichere aktuelle Richtung für Ballwechsel-Tracking
                gameState.lastBallSpeedX = gameState.ballSpeedX;

                console.log('🚀 Ball-Reset beendet, neue Geschwindigkeit:', gameState.ballSpeedX, gameState.ballSpeedY);
            }
        }
    };

    // Verbesserte Paddle-Steuerung mit Shift-Taste und isolierter Computergeschwindigkeit
    const updatePaddles = () => {
        const gameState = gameStateRef.current;
        const {keys, touchControls} = gameState;
        let newLeftPaddleY = gameState.leftPaddleY;
        let newRightPaddleY = gameState.rightPaddleY;

        // Bewegungsgeschwindigkeit für Spieler: normal oder halb, wenn Shift gedrückt ist
        const playerPaddleSpeed = keys.shiftPressed ? 4 : 8;

        // WICHTIG: Lokale Kopie der Difficulty für den Computer erstellen
        // So wird sichergestellt, dass die Schwierigkeit nicht durch andere Logik geändert wird
        const computerDifficulty = difficulty; // Verwendung einer isolierten Variable

        if (gameMode === 'singleplayer') {
            // Spieler: Linker Schläger (Tasten oder Touch)
            if ((keys.upPressed || keys.wPressed || touchControls.leftUp) && newLeftPaddleY > 0) {
                newLeftPaddleY -= playerPaddleSpeed;
            } else if ((keys.downPressed || keys.sPressed || touchControls.leftDown) && newLeftPaddleY < 500 - PADDLE_HEIGHT) {
                newLeftPaddleY += playerPaddleSpeed;
            }

            // Computer: Rechter Schläger KI - FESTE GESCHWINDIGKEIT
            const computerPaddleCenter = newRightPaddleY + PADDLE_HEIGHT / 2;
            const distanceToMove = gameState.ballY - computerPaddleCenter;

            if (Math.abs(distanceToMove) > PADDLE_HEIGHT / 4) {
                if (distanceToMove > 0) {
                    // Computer bewegt sich nach unten
                    newRightPaddleY += computerDifficulty; // Verwendung der isolierten Variable
                } else {
                    // Computer bewegt sich nach oben
                    newRightPaddleY -= computerDifficulty; // Verwendung der isolierten Variable
                }
            }
        } else if (gameMode === 'local-multiplayer') {
            // Spieler 1: Linker Schläger mit W/S oder Touch
            if ((keys.wPressed || touchControls.leftUp) && newLeftPaddleY > 0) {
                newLeftPaddleY -= playerPaddleSpeed;
            } else if ((keys.sPressed || touchControls.leftDown) && newLeftPaddleY < 500 - PADDLE_HEIGHT) {
                newLeftPaddleY += playerPaddleSpeed;
            }

            // Spieler 2: Rechter Schläger mit Pfeiltasten oder Touch
            if ((keys.upPressed || touchControls.rightUp) && newRightPaddleY > 0) {
                newRightPaddleY -= playerPaddleSpeed;
            } else if ((keys.downPressed || touchControls.rightDown) && newRightPaddleY < 500 - PADDLE_HEIGHT) {
                newRightPaddleY += playerPaddleSpeed;
            }
        } else if (gameMode === 'online-multiplayer') {
            // Verwende isHostRef für sofortigen Zugriff
            if (isHostRef.current) {
                // Host steuert den linken Schläger mit beliebigen Tasten oder Touch
                if ((keys.wPressed || keys.upPressed || touchControls.leftUp) && newLeftPaddleY > 0) {
                    newLeftPaddleY -= playerPaddleSpeed;
                } else if ((keys.sPressed || keys.downPressed || touchControls.leftDown) && newLeftPaddleY < 500 - PADDLE_HEIGHT) {
                    newLeftPaddleY += playerPaddleSpeed;
                }
            } else {
                // Gast steuert den rechten Schläger mit beliebigen Tasten oder Touch
                if ((keys.wPressed || keys.upPressed || touchControls.rightUp) && newRightPaddleY > 0) {
                    newRightPaddleY -= playerPaddleSpeed;
                } else if ((keys.sPressed || keys.downPressed || touchControls.rightDown) && newRightPaddleY < 500 - PADDLE_HEIGHT) {
                    newRightPaddleY += playerPaddleSpeed;
                }
            }
        }

        // Begrenzung der Schläger
        gameState.leftPaddleY = Math.max(0, Math.min(newLeftPaddleY, 500 - PADDLE_HEIGHT));
        gameState.rightPaddleY = Math.max(0, Math.min(newRightPaddleY, 500 - PADDLE_HEIGHT));
    };

    // Verbesserte Ball-Bewegung mit Sicherheitsmechanismen gegen horizontale Endlos-Zustände
    const updateBall = () => {
        const gameState = gameStateRef.current;

        // Speichern der vorherigen Position für Ballwechsel-Tracking
        gameState.lastBallX = gameState.ballX;

        // Im Online-Modus aktualisiert nur der Host den Ball
        if (gameMode === 'online-multiplayer' && !isHostRef.current) {
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

        // Speichere die aktuelle Position für die Kollisionsprüfung
        const prevBallX = gameState.ballX;
        const prevBallY = gameState.ballY;

        // Ball bewegen
        gameState.ballX += gameState.ballSpeedX;
        gameState.ballY += gameState.ballSpeedY;

        // Verbesserte Kollision mit oberer/unterer Wand
        // Sicherstellen, dass der Ball nicht am Rand "stecken" bleibt
        if (gameState.ballY - BALL_RADIUS <= 0) {
            // Ball berührt obere Wand
            gameState.ballY = BALL_RADIUS; // Reposition to avoid sticking
            gameState.ballSpeedY = Math.abs(gameState.ballSpeedY); // Immer nach unten abprallen

            // Leicht variieren, damit er nicht in einer horizontalen Linie bleibt
            gameState.ballSpeedY += Math.random() * 0.5;
        } else if (gameState.ballY + BALL_RADIUS >= 500) {
            // Ball berührt untere Wand
            gameState.ballY = 500 - BALL_RADIUS; // Reposition to avoid sticking
            gameState.ballSpeedY = -Math.abs(gameState.ballSpeedY); // Immer nach oben abprallen

            // Leicht variieren, damit er nicht in einer horizontalen Linie bleibt
            gameState.ballSpeedY -= Math.random() * 0.5;
        }
    };

    // Verbesserte Kollisionserkennung mit Unterstützung für Paddle-Ecken
    const checkCollisions = () => {
        const gameState = gameStateRef.current;

        // Speichere die vorherigen Paddel-Positionen für Bewegungserkennung
        const prevLeftPaddleY = gameState.prevLeftPaddleY || gameState.leftPaddleY;
        const prevRightPaddleY = gameState.prevRightPaddleY || gameState.rightPaddleY;

        // Berechne die Paddelbewegung (positiv = nach unten, negativ = nach oben)
        const leftPaddleMovement = gameState.leftPaddleY - prevLeftPaddleY;
        const rightPaddleMovement = gameState.rightPaddleY - prevRightPaddleY;

        // Aktualisiere die vorherigen Positionen für den nächsten Frame
        gameState.prevLeftPaddleY = gameState.leftPaddleY;
        gameState.prevRightPaddleY = gameState.rightPaddleY;

        // Im Online-Modus prüft nur der Host auf Kollisionen
        if (gameMode === 'online-multiplayer' && !isHostRef.current) {
            return;
        }

        // Ball-Position und Radius für die Kollisionsberechnung
        const ballX = gameState.ballX;
        const ballY = gameState.ballY;
        const ballRadius = BALL_RADIUS;

        // Kollisionserkennung für linken Schläger
        if (ballX - ballRadius <= PADDLE_WIDTH) {
            // Erweiterter Kollisionsbereich
            const paddleTop = gameState.leftPaddleY - ballRadius * 0.5;
            const paddleBottom = gameState.leftPaddleY + PADDLE_HEIGHT + ballRadius * 0.5;

            if (ballY >= paddleTop && ballY <= paddleBottom) {
                // Prüfe, ob sich der Ball auf den Schläger zubewegt (Richtung links)
                if (gameState.ballSpeedX < 0) {
                    // Ball abprallen lassen
                    gameState.ballX = PADDLE_WIDTH + ballRadius;
                    gameState.ballSpeedX = -gameState.ballSpeedX;

                    // Abprallwinkel basierend auf Trefferpunkt auf dem Schläger
                    const hitPosition = (ballY - (gameState.leftPaddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
                    gameState.ballSpeedY = hitPosition * 7;

                    // EFFET: Wenn Shift gedrückt ist und das Paddel sich bewegt, Effet hinzufügen
                    if (gameState.keys.shiftPressed && Math.abs(leftPaddleMovement) > 0) {
                        // Paddel-Bewegungsrichtung bestimmt den Effet (additiver Y-Geschwindigkeitseffekt)
                        // Wir verstärken den Effet relativ zur Bewegungsgeschwindigkeit des Paddels
                        // const effetStrength = Math.min(Math.abs(leftPaddleMovement) * 0.5, 3);
                        const effetStrength = Math.min(Math.abs(leftPaddleMovement) * 1.5, 6);

                        // Richtung des Effets entspricht der Bewegungsrichtung des Paddels
                        if (leftPaddleMovement > 0) {
                            // Paddel bewegt sich nach unten = Ball erhält zusätzliche Geschwindigkeit nach unten
                            gameState.ballSpeedY += effetStrength;
                        } else {
                            // Paddel bewegt sich nach oben = Ball erhält zusätzliche Geschwindigkeit nach oben
                            gameState.ballSpeedY -= effetStrength;
                        }

                        // Visuelles Feedback für den Effet (könnte später hinzugefügt werden)
                        // z.B. Partikeleffekte oder kurzzeitige Farbänderung des Balls
                    }

                    // Erhöhung der Geschwindigkeit
                    gameState.ballSpeedX *= 1.05;
                    // Begrenze die maximale Geschwindigkeit
                    if (Math.abs(gameState.ballSpeedX) > 12) {
                        gameState.ballSpeedX = gameState.ballSpeedX > 0 ? 12 : -12;
                    }

                    // Ballwechsel zählen
                    if (onBallExchange) {
                        onBallExchange();
                    }
                }
            }
        }

        // Kollisionserkennung für rechten Schläger
        if (ballX + ballRadius >= 800 - PADDLE_WIDTH) {
            // Erweiterter Kollisionsbereich
            const paddleTop = gameState.rightPaddleY - ballRadius * 0.5;
            const paddleBottom = gameState.rightPaddleY + PADDLE_HEIGHT + ballRadius * 0.5;

            if (ballY >= paddleTop && ballY <= paddleBottom) {
                // Prüfe, ob sich der Ball auf den Schläger zubewegt
                if (gameState.ballSpeedX > 0) {
                    // Ball abprallen lassen
                    gameState.ballX = 800 - PADDLE_WIDTH - ballRadius;
                    gameState.ballSpeedX = -gameState.ballSpeedX;

                    // Abprallwinkel basierend auf Trefferpunkt
                    const hitPosition = (ballY - (gameState.rightPaddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
                    gameState.ballSpeedY = hitPosition * 7;

                    // EFFET: Wenn Shift gedrückt ist und das Paddel sich bewegt, Effet hinzufügen
                    if (gameState.keys.shiftPressed && Math.abs(rightPaddleMovement) > 0) {
                        // Paddel-Bewegungsrichtung bestimmt den Effet (additiver Y-Geschwindigkeitseffekt)
                        const effetStrength = Math.min(Math.abs(rightPaddleMovement) * 0.5, 3);

                        // Richtung des Effets entspricht der Bewegungsrichtung des Paddels
                        if (rightPaddleMovement > 0) {
                            // Paddel bewegt sich nach unten = Ball erhält zusätzliche Geschwindigkeit nach unten
                            gameState.ballSpeedY += effetStrength;
                        } else {
                            // Paddel bewegt sich nach oben = Ball erhält zusätzliche Geschwindigkeit nach oben
                            gameState.ballSpeedY -= effetStrength;
                        }
                    }

                    // Erhöhung der Geschwindigkeit
                    gameState.ballSpeedX *= 1.05;
                    // Begrenze die maximale Geschwindigkeit
                    if (Math.abs(gameState.ballSpeedX) > 12) {
                        gameState.ballSpeedX = gameState.ballSpeedX > 0 ? 12 : -12;
                    }

                    // Ballwechsel zählen
                    if (onBallExchange) {
                        onBallExchange();
                    }
                }
            }
        }

        // Zusätzliche Sicherheit: Verhindere, dass der Ball genau horizontal fliegt
        if (Math.abs(gameState.ballSpeedY) < 0.2) {
            // Kleine zufällige Komponente hinzufügen, wenn die vertikale Geschwindigkeit zu klein ist
            gameState.ballSpeedY += (Math.random() * 2 - 1) * 0.5;
        }
    };

    // Punktestand überprüfen
    const checkScore = () => {
        const gameState = gameStateRef.current;

        // Im Online-Modus aktualisiert nur der Host den Punktestand
        if (gameMode === 'online-multiplayer' && !isHostRef.current) {
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
            console.log('🏆 Punkt für rechts! Neuer Punktestand:', gameState.scores.left, ':', gameState.scores.right);

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
            console.log('🏆 Punkt für links! Neuer Punktestand:', gameState.scores.left, ':', gameState.scores.right);

            // Überprüfe, ob nun ein Gewinner feststeht
            if (gameState.scores.left >= WINNING_SCORE) {
                checkWinner(gameState.scores);
            } else {
                // Nur zurücksetzen, wenn noch kein Gewinner feststeht
                resetBall();
            }
        }
    };

    // Spieldaten synchronisieren - Korrigierte Version
    const sendGameState = () => {
        const gameState = gameStateRef.current;

        // Vorzeitig beenden, wenn der Datenkanal nicht bereit ist
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            return;
        }

        // Basisinformationen für alle Spieler - Explizite Benennung!
        const state = {
            type: 'gameState',
            leftPaddleY: isHostRef.current ? gameState.leftPaddleY : null,
            rightPaddleY: !isHostRef.current ? gameState.rightPaddleY : null,
            timestamp: Date.now()
        };

        // Host sendet zusätzliche Informationen
        if (isHostRef.current) {
            state.ballX = gameState.ballX;
            state.ballY = gameState.ballY;
            state.ballSpeedX = gameState.ballSpeedX;
            state.ballSpeedY = gameState.ballSpeedY;
            state.leftScore = gameState.scores.left;
            state.rightScore = gameState.scores.right;
            state.ballInResetState = gameState.ballInResetState;
            state.ballResetStartTime = gameState.ballResetStartTime;
        }

        // Senden mit Fehlerbehandlung
        try {
            dataChannelRef.current.send(JSON.stringify(state));
        } catch (error) {
            console.error('Fehler beim Senden des Spielstatus:', error);
        }
    };

    // Verarbeite Spielstatus-Updates - Korrigierte Version
    const processGameStateUpdate = (data) => {
        // Beide Paddle-Positionen aktualisieren, wenn sie empfangen wurden
        if (data.leftPaddleY !== null) {
            gameStateRef.current.leftPaddleY = data.leftPaddleY;
        }

        if (data.rightPaddleY !== null) {
            gameStateRef.current.rightPaddleY = data.rightPaddleY;
        }

        // Als Gast die Ballposition und Spielstand-Updates vom Host übernehmen
        if (!isHostRef.current && data.ballX !== undefined) {
            // Ball-Position und -Geschwindigkeit übernehmen
            gameStateRef.current.ballX = data.ballX;
            gameStateRef.current.ballY = data.ballY;
            gameStateRef.current.ballSpeedX = data.ballSpeedX;
            gameStateRef.current.ballSpeedY = data.ballSpeedY;

            // Spielstand aktualisieren
            if (data.leftScore !== undefined && data.rightScore !== undefined &&
                (gameStateRef.current.scores.left !== data.leftScore ||
                    gameStateRef.current.scores.right !== data.rightScore)) {

                console.log('Punktestand aktualisiert:', data.leftScore, ':', data.rightScore);
                gameStateRef.current.scores.left = data.leftScore;
                gameStateRef.current.scores.right = data.rightScore;

                // React-State für die UI aktualisieren
                setScores({
                    left: data.leftScore,
                    right: data.rightScore
                });
            }

            // Ball-Reset-Status synchronisieren
            gameStateRef.current.ballInResetState = data.ballInResetState;
            gameStateRef.current.ballResetStartTime = data.ballResetStartTime;
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

    // Verarbeite Spielende-Nachricht - Korrigierte Version
    const processGameOverMessage = (data) => {
        console.log('🏁 Spielende-Nachricht empfangen:', data);

        const gameState = gameStateRef.current;
        gameState.gameOver = true; // Markiere das Spiel als beendet
        setGameRunning(false);

        // Korrigierte Sieger-Ermittlung
        gameState.isLocalPlayerWinner = (isHostRef.current && data.winner === 'left') ||
            (!isHostRef.current && data.winner === 'right');

        // Sieger-Animation starten
        gameState.showWinAnimation = true;
        gameState.winAnimationStartTime = Date.now();
        gameState.winningPlayer = data.winner;

        // Initialisiere Regentropfen für Verlierer-Animation
        if (!gameState.isLocalPlayerWinner) {
            initializeRaindrops();
        }

        // Nach der Animation zum Game-Over-Screen
        setTimeout(() => {
            if (gameState) { // Sicherstellen, dass der Zustand noch existiert
                gameState.showWinAnimation = false;
                onGameOver(data.winner, gameState.isLocalPlayerWinner);
            }
        }, gameState.winAnimationDuration);
    };

    // Gewinner überprüfen
    const checkWinner = (currentScores) => {
        if (currentScores.left >= WINNING_SCORE || currentScores.right >= WINNING_SCORE) {
            const gameState = gameStateRef.current;
            gameState.gameOver = true; // Markiere das Spiel als beendet
            setGameRunning(false);

            const winner = currentScores.left > currentScores.right ? 'left' : 'right';
            console.log('🏁 Spiel beendet! Gewinner:', winner);

            // Im Online-Multiplayer: informiere den Gegner über das Spielende
            if (gameMode === 'online-multiplayer' && isHostRef.current && dataChannelRef.current?.readyState === 'open') {
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
                if (isHostRef.current) {
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
                winText = isHostRef.current ? 'Du hast gewonnen!' : 'Gegner gewinnt!';
                ctx.fillStyle = isHostRef.current
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
                winText = isHostRef.current ? 'Gegner gewinnt!' : 'Du hast gewonnen!';
                ctx.fillStyle = isHostRef.current
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

        // FPS-Berechnung aktualisieren
        lastFrameTimeRef.current = Date.now();

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

        // Ball zeichnen mit optionalem Effet-Effekt
        const ballHasEffet = gameState.keys.shiftPressed &&
            (Math.abs(gameState.leftPaddleY - gameState.prevLeftPaddleY) > 0 ||
                Math.abs(gameState.rightPaddleY - gameState.prevRightPaddleY) > 0);

        ctx.beginPath();

        // Ball mit normaler Farbe oder Effet-Farbe zeichnen
        if (ballHasEffet) {
            // Farbverlauf für Effet-Ball
            const gradient = ctx.createRadialGradient(
                gameState.ballX, gameState.ballY, 0,
                gameState.ballX, gameState.ballY, BALL_RADIUS
            );
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(1, '#4CAF50'); // Grünlicher Farbton für den Effet
            ctx.fillStyle = gradient;

            // Bei Effet einen leicht größeren Ball zeichnen
            ctx.arc(gameState.ballX, gameState.ballY, BALL_RADIUS * 1.1, 0, Math.PI * 2);

            // Optional: Bewegungs-Trail hinter dem Ball
            if (Math.abs(gameState.ballSpeedY) > 3) {
                ctx.globalAlpha = 0.3;
                for (let i = 1; i <= 3; i++) {
                    const trailX = gameState.ballX - (gameState.ballSpeedX * i * 0.1);
                    const trailY = gameState.ballY - (gameState.ballSpeedY * i * 0.1);
                    const trailRadius = BALL_RADIUS * (1 - i * 0.15);

                    ctx.beginPath();
                    ctx.arc(trailX, trailY, trailRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }
        } else {
            // Normaler Ball
            ctx.fillStyle = "white";
            ctx.arc(gameState.ballX, gameState.ballY, BALL_RADIUS, 0, Math.PI * 2);
        }

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

        // Effet-Hilfestellung anzeigen, wenn Shift-Taste gedrückt ist
        if (gameState.keys.shiftPressed) {
            ctx.font = "14px Arial";
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.textAlign = "center";
            ctx.fillText("Effet-Modus aktiv", canvas.width / 2, 20);
        }
    };

    const resetGameState = () => {
        const gameState = gameStateRef.current;
        gameState.gameOver = false;
        gameState.showWinAnimation = false;
        gameState.scores.left = 0;
        gameState.scores.right = 0;
        setScores({left: 0, right: 0}); // React-State aktualisieren
        resetBall();
        console.log('🔄 Spielstatus zurückgesetzt');
    };

    // Synchronisations-Check für das Debuggen
    const checkGameSync = () => {
        if (gameMode === 'online-multiplayer' && dataChannelRef.current?.readyState === 'open') {
            console.log('🔄 Starte Synchronisationscheck...');
            sendData({
                type: 'syncCheck',
                ballX: gameStateRef.current.ballX,
                ballY: gameStateRef.current.ballY,
                leftPaddleY: gameStateRef.current.leftPaddleY,
                rightPaddleY: gameStateRef.current.rightPaddleY,
                scores: gameStateRef.current.scores,
                isHost: isHostRef.current,
                ballInResetState: gameStateRef.current.ballInResetState,
                timestamp: Date.now()
            });
        } else {
            console.log('⚠️ Synchronisationscheck nicht möglich - keine Verbindung');
            // Zusätzliche Datenkanal-Infos anzeigen
            checkDataChannelState();
        }
    };

    // WebRTC-Verbindung Rekonnection-Versuch
    const retryWebRtcConnection = () => {
        if (gameMode !== 'online-multiplayer') return;

        console.log('🔄 Versuche WebRTC-Verbindung wiederherzustellen...');

        // PeerConnection neu initialisieren
        initializePeerConnection(isHostRef.current);
    };

    // Spielschleife
    const gameLoop = () => {
        if (gameRunning || gameStateRef.current.showWinAnimation) {
            if (gameRunning) {
                // Nur Host oder lokale Spieler aktualisieren den Ball-Reset-Zustand
                if (gameMode !== 'online-multiplayer' || isHostRef.current) {
                    updateBallResetState();
                }

                updatePaddles();
                updateBall();
                checkCollisions();

                // Im Online-Modus aktualisiert nur der Host den Punktestand
                if (gameMode !== 'online-multiplayer' || isHostRef.current) {
                    checkScore();
                }

                // Im Online-Modus senden wir den Spielstatus mit Ratenbegrenzung
                if (gameMode === 'online-multiplayer' && dataChannelRef.current?.readyState === 'open') {
                    const now = Date.now();
                    if (now - lastSendTimeRef.current > 30) { // ~33fps
                        sendGameState();
                        lastSendTimeRef.current = now;
                    }
                }
            }

            // Zeichnen immer ausführen
            drawEverything();

            // Explizites requestAnimationFrame für bessere Leistung
            requestRef.current = window.requestAnimationFrame(gameLoop);
        }
    };

    // Punktestand-Anzeige
    let scoreText = '';
    if (gameMode === 'singleplayer') {
        scoreText = `${playerName}: ${scores.left} | Computer: ${scores.right}`;
    } else if (gameMode === 'local-multiplayer') {
        scoreText = `${playerName}: ${scores.left} | Spieler 2: ${scores.right}`;
    } else if (gameMode === 'online-multiplayer') {
        if (isHostRef.current) {
            scoreText = `${playerName} (links): ${scores.left} | Gegner: ${scores.right}`;
        } else {
            scoreText = `Gegner: ${scores.left} | ${playerName} (rechts): ${scores.right}`;
        }
    }

    return (
        <div className="game-container">
            <canvas ref={canvasRef} width={800} height={500}/>

            {/* Zurück-Button */}
            <button
                className="back-to-menu-btn"
                onClick={() => setShowConfirmDialog(true)}
                title="Zurück zum Hauptmenü"
            >
                ⮜ Menü
            </button>

            {/* Debug-Buttons wurden entfernt */}

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
                    <div className="host-display" style={{
                        position: 'absolute',
                        top: 100,
                        right: 20,
                        color: 'white',
                        fontSize: '14px',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: '2px 5px',
                        borderRadius: '3px'
                    }}>
                        {isHostRef.current ? 'Host (Links)' : 'Gast (Rechts)'}
                    </div>
                </>
            )}

            {/* Vereinfachte Touch-Steuerung für alle Modi */}
            {isMobileDevice && (
                <TouchControls
                    onMoveUp={() => {
                        if (gameMode === 'singleplayer' ||
                            (gameMode === 'online-multiplayer' && isHostRef.current) ||
                            gameMode === 'local-multiplayer') {
                            gameStateRef.current.touchControls.leftUp = true;
                            gameStateRef.current.touchControls.leftDown = false;
                        }

                        if (gameMode === 'local-multiplayer' ||
                            (gameMode === 'online-multiplayer' && !isHostRef.current)) {
                            gameStateRef.current.touchControls.rightUp = true;
                            gameStateRef.current.touchControls.rightDown = false;
                        }
                    }}
                    onMoveDown={() => {
                        if (gameMode === 'singleplayer' ||
                            (gameMode === 'online-multiplayer' && isHostRef.current) ||
                            gameMode === 'local-multiplayer') {
                            gameStateRef.current.touchControls.leftDown = true;
                            gameStateRef.current.touchControls.leftUp = false;
                        }

                        if (gameMode === 'local-multiplayer' ||
                            (gameMode === 'online-multiplayer' && !isHostRef.current)) {
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