// src/services/webRTCService.ts
import {v4 as uuidv4} from 'uuid';
import {Question} from '../types';

// Erweiterte Konfiguration für WebRTC
const iceServers = {
    iceServers: [
        // Google STUN Server
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun1.l.google.com:19302'},
        {urls: 'stun:stun2.l.google.com:19302'},
        {urls: 'stun:stun3.l.google.com:19302'},
        {urls: 'stun:stun4.l.google.com:19302'},

        // Kostenlose TURN-Server für bessere Verbindungschancen
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },

        // Zusätzliche öffentliche STUN Server
        {urls: 'stun:stun.stunprotocol.org:3478'},
        {urls: 'stun:stun.voip.blackberry.com:3478'},

        // Zusätzliche kostenlose TURN-Server für erhöhte Erfolgsrate
        {
            urls: 'turn:relay.metered.ca:80',
            username: 'e8dd65f53c0711eea950a727ccd50f73',
            credential: 'kIH7AI8t25zHkVUp'
        },
        {
            urls: 'turn:relay.metered.ca:443',
            username: 'e8dd65f53c0711eea950a727ccd50f73',
            credential: 'kIH7AI8t25zHkVUp'
        },
        {
            urls: 'turn:relay.metered.ca:443?transport=tcp',
            username: 'e8dd65f53c0711eea950a727ccd50f73',
            credential: 'kIH7AI8t25zHkVUp'
        }
    ],
    iceCandidatePoolSize: 10
};

export interface RTCMessage {
    type: string;
    sender: string;
    roomId: string;
    content?: any;
}

export interface PlayerInfo {
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    score: number;
}

export interface GameState {
    questions: Question[];
    currentQuestionIndex: number;
    players: PlayerInfo[];
    answers: Record<string, number[]>; // playerId -> answers array
    timePerQuestion: number;
    startTime?: number;
}

export interface WebRTCCallbacks {
    onConnectionStateChange?: (state: string) => void;
    onPlayerJoined?: (player: PlayerInfo) => void;
    onPlayerLeft?: (playerId: string) => void;
    onPlayersUpdate?: (players: PlayerInfo[]) => void;
    onGameStarted?: (gameState: GameState) => void;
    onSyncMessage?: (syncData: any) => void; // Callback für Synchronisierungsnachrichten
    onQuestionTimerEnded?: (questionIndex: number) => void;
    onAllPlayersAnswered?: (questionIndex: number, playerScores: Record<string, number>) => void;
    onNextQuestion?: (nextIndex: number, duration?: number, startTime?: number) => void;
    onGameEnded?: (results: any) => void;
    onError?: (message: string) => void;
    onReconnect?: () => void;
    onDcClose?: () => void;
    onPlayerAnswer?: (data: any) => void;
}

class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private signalingServer: WebSocket | null = null;
    private playerId = uuidv4();
    private playerName = '';
    private roomId = '';
    private isHost = false;
    private isConnected = false;
    private pendingCandidates: RTCIceCandidate[] = [];
    private gameState: GameState | null = null;
    private callbacks: WebRTCCallbacks = {};
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private questionTimer: ReturnType<typeof setTimeout> | null = null;
    private wsConnectionTimeout: ReturnType<typeof setTimeout> | null = null;
    private isConnecting = false;

    constructor() {
        // Automatische Wiederverbindung beim Fenster-Neuladen
        window.addEventListener('beforeunload', () => {
            this.sendMessage({
                type: 'leave',
                sender: this.playerId,
                roomId: this.roomId
            });
        });

        console.log('WebRTCService wurde initialisiert mit playerId:', this.playerId);
    }

    /**
     * Verbindet mit dem Signaling-Server mit verbesserter Fehlerbehandlung
     */
    public connectToSignalingServer(serverUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Verhindere mehrfache gleichzeitige Verbindungsversuche
            if (this.isConnecting) {
                console.log('Bereits beim Verbinden, ignoriere doppelten Verbindungsversuch');
                reject('Bereits beim Verbinden');
                return;
            }

            this.isConnecting = true;

            // Prüfe, ob bereits eine Verbindung besteht
            if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
                console.log('Bereits mit dem Signaling-Server verbunden');
                this.isConnecting = false;
                resolve();
                return;
            }

            // Schließe eine eventuell bestehende Verbindung
            if (this.signalingServer) {
                console.log('Schließe bestehende Verbindung, bevor eine neue hergestellt wird');
                this.signalingServer.close();
                this.signalingServer = null;
            }

            // Setze einen Timeout für die Verbindung
            this.wsConnectionTimeout = setTimeout(() => {
                if (this.signalingServer && this.signalingServer.readyState !== WebSocket.OPEN) {
                    console.error('Verbindungs-Timeout');
                    this.signalingServer.close();
                    this.isConnecting = false;
                    reject('Verbindungs-Timeout');
                }
            }, 10000);

            try {
                console.log(`Verbinde zu ${serverUrl}...`);

                // Erstelle eine neue WebSocket-Verbindung
                this.signalingServer = new WebSocket(serverUrl);

                this.signalingServer.onopen = () => {
                    console.log('✓ Verbindung zum Signaling-Server hergestellt - URL:', serverUrl);

                    if (this.wsConnectionTimeout) {
                        clearTimeout(this.wsConnectionTimeout);
                        this.wsConnectionTimeout = null;
                    }

                    this.startPingInterval();
                    this.isConnecting = false;
                    this.isConnected = true; // Wichtig: Setze Connected-Status
                    resolve();
                };

                this.signalingServer.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleSignalingMessage(message);
                    } catch (error) {
                        console.error('Fehler beim Verarbeiten der Signaling-Nachricht:', error);
                    }
                };

                this.signalingServer.onerror = (error) => {
                    console.error('⚠ Signaling-Server Fehler:', error);

                    if (this.wsConnectionTimeout) {
                        clearTimeout(this.wsConnectionTimeout);
                        this.wsConnectionTimeout = null;
                    }

                    this.isConnecting = false;
                    this.isConnected = false; // Wichtig: Setze Disconnected-Status
                    reject(new Error('WebSocket-Verbindungsfehler'));
                };

                this.signalingServer.onclose = (event) => {
                    console.log(`Signaling-Server Verbindung geschlossen: ${event.code} - ${event.reason}`);

                    if (this.wsConnectionTimeout) {
                        clearTimeout(this.wsConnectionTimeout);
                        this.wsConnectionTimeout = null;
                    }

                    this.isConnected = false;
                    this.isConnecting = false;

                    // Versuche eine Wiederverbindung, wenn die Verbindung unerwartet geschlossen wurde
                    if (event.code !== 1000) { // 1000 ist ein normaler Verbindungsschluss
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                console.error('⚠ Fehler beim Verbinden mit dem Signaling-Server:', error);

                if (this.wsConnectionTimeout) {
                    clearTimeout(this.wsConnectionTimeout);
                    this.wsConnectionTimeout = null;
                }

                this.isConnecting = false;
                reject(error);
            }
        });
    }

    /**
     * Erstellt einen neuen Raum als Host
     */
    public createRoom(playerName: string, roomId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.signalingServer || this.signalingServer.readyState !== WebSocket.OPEN) {
                reject(new Error('Keine Verbindung zum Signaling-Server'));
                return;
            }

            // Wichtig: Standardisiere die Raum-ID
            const normalizedRoomId = roomId.toUpperCase().trim();

            this.playerName = playerName;
            this.roomId = normalizedRoomId;
            this.isHost = true;

            console.log(`Erstelle Raum: ${normalizedRoomId}, Spieler: ${playerName}`);

            this.initializePeerConnection();

            // Erstelle einen Datenkanal als Anbieter
            if (this.peerConnection) {
                this.dataChannel = this.peerConnection.createDataChannel('gameChannel', {
                    ordered: true
                });
                this.setupDataChannel();
            } else {
                reject(new Error('Peer-Verbindung konnte nicht initialisiert werden'));
                return;
            }

            // Sende Raumerstellungsnachricht an den Signaling-Server
            this.sendMessage({
                type: 'create-room',
                sender: this.playerId,
                roomId: normalizedRoomId,
                content: {
                    playerName: this.playerName
                }
            });

            // Warte auf Bestätigung vom Server
            const messageHandler = (event: MessageEvent) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'room-created' && message.content && message.content.roomId === normalizedRoomId) {
                        console.log('Raumbestätigung erhalten:', message);
                        this.signalingServer?.removeEventListener('message', messageHandler);
                        resolve(normalizedRoomId);
                    } else if (message.type === 'error') {
                        console.error('Fehler bei Raumerstellung:', message.content?.message);
                        this.signalingServer?.removeEventListener('message', messageHandler);
                        reject(new Error(message.content?.message || 'Unbekannter Fehler bei der Raumerstellung'));
                    }
                } catch (error) {
                    console.error('Fehler beim Verarbeiten der Nachricht:', error);
                }
            };

            // Setze einen Timeout für die Raumerstellung
            const createRoomTimeout = setTimeout(() => {
                this.signalingServer?.removeEventListener('message', messageHandler);
                reject(new Error('Timeout bei der Raumerstellung'));
            }, 10000);

            // Höre auf die Antwort
            this.signalingServer.addEventListener('message', messageHandler);

            // Bereinige den Timeout, wenn die Raumerstellung erfolgreich war
            setTimeout(() => {
                clearTimeout(createRoomTimeout);
            }, 10000);
        });
    }

    /**
     * Tritt einem existierenden Raum bei
     */
    public joinRoom(playerName: string, roomId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.signalingServer || this.signalingServer.readyState !== WebSocket.OPEN) {
                reject(new Error('Keine Verbindung zum Signaling-Server'));
                return;
            }

            // Wichtig: Standardisiere die Raum-ID
            const normalizedRoomId = roomId.toUpperCase().trim();

            this.playerName = playerName;
            this.roomId = normalizedRoomId;
            this.isHost = false;

            console.log(`Trete Raum bei: ${normalizedRoomId}, Spieler: ${playerName}`);

            this.initializePeerConnection();

            // Sende Raumbetrittsnachricht an den Signaling-Server
            this.sendMessage({
                type: 'join-room',
                sender: this.playerId,
                roomId: normalizedRoomId,
                content: {
                    playerName: this.playerName
                }
            });

            // Warte auf Bestätigung vom Server
            const messageHandler = (event: MessageEvent) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'room-joined' && message.content && message.content.roomId === normalizedRoomId) {
                        console.log('Raumbeitritt bestätigt:', message);
                        this.signalingServer?.removeEventListener('message', messageHandler);
                        resolve();
                    } else if (message.type === 'error') {
                        console.error('Fehler beim Raumbeitritt:', message.content?.message);
                        this.signalingServer?.removeEventListener('message', messageHandler);
                        reject(new Error(message.content?.message || 'Unbekannter Fehler beim Raumbeitritt'));
                    }
                } catch (error) {
                    console.error('Fehler beim Verarbeiten der Nachricht:', error);
                }
            };

            // Setze einen Timeout für den Raumbeitritt
            const joinRoomTimeout = setTimeout(() => {
                this.signalingServer?.removeEventListener('message', messageHandler);
                reject(new Error('Timeout beim Raumbeitritt'));
            }, 10000);

            // Höre auf die Antwort
            this.signalingServer.addEventListener('message', messageHandler);

            // Bereinige den Timeout, wenn der Raumbeitritt erfolgreich war
            setTimeout(() => {
                clearTimeout(joinRoomTimeout);
            }, 10000);
        });
    }

    /**
     * Setzt den Bereit-Status des Spielers
     */
    public setReady(isReady: boolean): void {
        this.sendMessage({
            type: 'player-ready',
            sender: this.playerId,
            roomId: this.roomId,
            content: {
                isReady: isReady
            }
        });
    }

    /**
     * Startet das Spiel (nur für den Host)
     */
    public startGame(questions: Question[]): void {
        if (!this.isHost) {
            console.error('Nur der Host kann das Spiel starten');

            if (this.callbacks.onError) {
                this.callbacks.onError('Nur der Host kann das Spiel starten');
            }

            return;
        }

        if (!this.isConnected) {
            console.error('Keine Verbindung zum Peer');

            if (this.callbacks.onError) {
                this.callbacks.onError('Keine Verbindung zum Peer');
            }

            return;
        }

        // Begrenze auf 10 Fragen für bessere Performance
        const gameQuestions = questions.slice(0, 10);

        // Initialisiere den Spielstatus
        this.gameState = {
            questions: gameQuestions,
            currentQuestionIndex: 0,
            players: [], // Wird vom Signaling-Server befüllt
            answers: {},
            timePerQuestion: 20, // 20 Sekunden pro Frage
            startTime: Date.now()
        };

        console.log(`Spiel wird gestartet mit ${gameQuestions.length} Fragen`);

        // Sende Spielstart-Nachricht an alle Spieler
        this.sendGameMessage({
            type: 'game-started',
            content: {
                questions: gameQuestions,
                timePerQuestion: this.gameState.timePerQuestion,
                startTime: this.gameState.startTime
            }
        });

        // Starte den Timer für die erste Frage
        this.startQuestionTimer();
    }

    /**
     * Beantwortet eine Frage
     */
    public answerQuestion(questionIndex: number, answer: number): void {
        if (!this.gameState) {
            console.error('Spiel wurde noch nicht gestartet');
            return;
        }

        // Speichere die Antwort lokal
        if (!this.gameState.answers[this.playerId]) {
            this.gameState.answers[this.playerId] = [];
        }
        this.gameState.answers[this.playerId][questionIndex] = answer;

        // Sende die Antwort an den Host
        this.sendGameMessage({
            type: 'player-answer',
            content: {
                questionIndex: questionIndex,
                answer: answer,
                playerId: this.playerId,
                playerName: this.playerName
            }
        });
    }

    /**
     * Wechselt zur nächsten Frage (nur für den Host)
     */
    public nextQuestion(): void {
        if (!this.isHost || !this.gameState) {
            return;
        }

        // Stoppe den aktuellen Timer
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }

        const nextIndex = this.gameState.currentQuestionIndex + 1;

        // Prüfe, ob das Spiel beendet ist
        if (nextIndex >= this.gameState.questions.length) {
            this.endGame();
            return;
        }

        // Aktualisiere den Index
        this.gameState.currentQuestionIndex = nextIndex;

        // Informiere alle Spieler über die nächste Frage
        this.sendGameMessage({
            type: 'next-question',
            content: {
                nextQuestionIndex: this.gameState.currentQuestionIndex,
                newTimerDuration: 20, // Standard: 20 Sekunden pro Frage
                startTime: Date.now() // Aktueller Zeitstempel für Synchronisation
            }
        });

        // Starte den Timer für die nächste Frage
        this.startQuestionTimer();
    }

    /**
     * Beendet das Spiel und berechnet die Ergebnisse
     */
    private endGame(): void {
        if (!this.isHost || !this.gameState) {
            return;
        }

        console.log('Spiel wird beendet, berechne Ergebnisse...');

        // Berechne die Punktzahlen für alle Spieler
        const playerScores: Record<string, number> = {};
        const playerResults: any[] = [];

        this.gameState.players.forEach(player => {
            const answers = this.gameState!.answers[player.id] || [];
            let correctCount = 0;

            // Zähle korrekte Antworten
            answers.forEach((answer, index) => {
                if (index < this.gameState!.questions.length) {
                    const isCorrect = answer === this.gameState!.questions[index].correctAnswer;
                    if (isCorrect) correctCount++;
                }
            });

            playerScores[player.id] = correctCount;
            playerResults.push({
                id: player.id,
                name: player.name,
                score: correctCount,
                isHost: player.isHost
            });
        });

        // Bestimme den Gewinner oder Unentschieden
        const maxScore = Math.max(...Object.values(playerScores));
        const winners = playerResults.filter(player => player.score === maxScore);
        const isDraw = winners.length > 1;

        // Sende Spielende-Nachricht an alle Spieler
        this.sendGameMessage({
            type: 'game-ended',
            content: {
                results: {
                    playerScores: playerResults,
                    winners: winners,
                    isDraw: isDraw
                }
            }
        });

        // Setze den Spielstatus zurück
        this.gameState = null;
    }

    /**
     * Verlässt den aktuellen Raum
     */
    public leaveRoom(): void {
        // Informiere andere Spieler
        this.sendMessage({
            type: 'leave',
            sender: this.playerId,
            roomId: this.roomId
        });

        // Bereinige den lokalen Zustand
        this.cleanup();
    }

    /**
     * Registriert Callback-Funktionen für verschiedene Ereignisse
     */
    public registerCallbacks(callbacks: WebRTCCallbacks): void {
        this.callbacks = {...this.callbacks, ...callbacks};
    }

    /**
     * Initialisiert die Peer-Verbindung
     */
    private initializePeerConnection(): void {
        // Bereinige zuerst eventuell vorhandene Verbindungen
        if (this.peerConnection) {
            console.log('Schließe bestehende RTCPeerConnection');
            this.peerConnection.close();
        }

        console.log('Initialisiere neue RTCPeerConnection mit erweiterten Optionen');

        try {
            // Erweiterte Konfiguration mit allen nötigen STUN/TURN-Servern
            this.peerConnection = new RTCPeerConnection({
                ...iceServers,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
                iceTransportPolicy: 'all' // Versuche sowohl UDP als auch TCP
            });

            // Verbesserte Fehlerbehandlung für mehrere Phasen des Verbindungsprozesses
            this.peerConnection.addEventListener('negotiationneeded', async () => {
                console.log('Neuverhandlung der Verbindung erforderlich');
                if (this.isHost) {
                    try {
                        await this.createOffer();
                    } catch (error) {
                        console.error('Fehler während der Neuverhandlung:', error);
                        if (this.callbacks.onError) {
                            this.callbacks.onError(`Verbindungsfehler: ${error}`);
                        }
                    }
                }
            });

            // Log aller ICE-Kandidaten für besseres Debugging
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`ICE-Kandidat gefunden: ${event.candidate.candidate.slice(0, 50)}...`);

                    // Prüfe, ob die Raum-ID richtig gesetzt ist, bevor Kandidaten gesendet werden
                    if (!this.roomId) {
                        console.error('Raum-ID ist nicht gesetzt! Kann Ice-Kandidat nicht senden.');
                        return;
                    }

                    this.sendMessage({
                        type: 'ice-candidate',
                        sender: this.playerId,
                        roomId: this.roomId,
                        content: event.candidate
                    });
                } else {
                    console.log('ICE-Kandidatensammlung abgeschlossen');
                }
            };

            // Detailliertes Logging für ICE-Verbindungsstatus mit verbesserten Diagnosen
            this.peerConnection.oniceconnectionstatechange = () => {
                const state = this.peerConnection?.iceConnectionState;
                console.log(`ICE-Verbindungsstatus geändert: ${state}`);

                if (state === 'connected' || state === 'completed') {
                    console.log('⭐ ICE-Verbindung erfolgreich hergestellt!');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;

                    // Zusätzliche Informationen zur Verbindungsqualität sammeln
                    this.peerConnection?.getStats().then(stats => {
                        stats.forEach(report => {
                            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                console.log(`Aktive Verbindung: ${report.localCandidateId} -> ${report.remoteCandidateId}`);
                            }
                        });
                    }).catch(error => console.error('Fehler beim Sammeln von Verbindungsstatistiken:', error));

                } else if (state === 'failed' || state === 'disconnected') {
                    console.warn(`❌ ICE-Verbindung ${state} - Versuche aggressive Wiederherstellung...`);
                    this.isConnected = false;

                    // Bei Verbindungsverlust aggressivere Neuverbindungsstrategien anwenden
                    if (this.peerConnection) {
                        try {
                            console.log('Setze ICE-Neustart-Flag...');
                            this.peerConnection.restartIce();

                            // Zusätzlich: Wenn ICE-Neustart nicht funktioniert, versuche es mit einer neuen Verbindung
                            setTimeout(() => {
                                if (this.peerConnection?.iceConnectionState === 'failed') {
                                    console.log('ICE-Restart war nicht erfolgreich, starte komplett neu');
                                    this.initializePeerConnection();

                                    // Bei Host: Neues Angebot erstellen
                                    if (this.isHost) {
                                        this.createOffer().catch(err =>
                                            console.error('Fehler beim Erstellen eines neuen Angebots nach Verbindungsfehler:', err));
                                    }
                                }
                            }, 3000);
                        } catch (error) {
                            console.error('Fehler beim ICE-Restart:', error);
                        }
                    }
                }

                if (this.callbacks.onConnectionStateChange) {
                    this.callbacks.onConnectionStateChange(state || 'unknown');
                }
            };

            // Überwache Verbindungsänderungen mit verbesserten Fehlerdiagnosen
            this.peerConnection.onconnectionstatechange = () => {
                const state = this.peerConnection?.connectionState || 'unknown';
                console.log('WebRTC Verbindungsstatus:', state);

                if (this.callbacks.onConnectionStateChange) {
                    this.callbacks.onConnectionStateChange(state);
                }

                if (state === 'connected') {
                    console.log('✅ WebRTC-Verbindung erfolgreich hergestellt');

                    // Prüfe auf UDP/TCP und sammle zusätzliche Informationen zur Verbindungsqualität
                    if (this.peerConnection?.getStats) {
                        this.peerConnection.getStats().then(stats => {
                            let tcpFound = false;
                            let udpFound = false;

                            stats.forEach(report => {
                                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                    console.log(`Aktive Verbindung: ${report.localCandidateId} -> ${report.remoteCandidateId}`);

                                    if (report.protocol === 'tcp') tcpFound = true;
                                    if (report.protocol === 'udp') udpFound = true;
                                }
                            });

                            console.log(`Verbindungsprotokolle: UDP=${udpFound}, TCP=${tcpFound}`);
                        });
                    }

                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                } else if (state === 'disconnected' || state === 'failed') {
                    console.warn(`❌ WebRTC-Verbindung ${state} - Leite Wiederherstellung ein`);
                    this.isConnected = false;
                    this.attemptReconnect();
                }
            };

            // Datenkanal-Handler (als Empfänger) mit verbesserten Diagnosemöglichkeiten
            this.peerConnection.ondatachannel = (event) => {
                console.log('Datenkanal vom Peer empfangen:', event.channel.label);
                this.dataChannel = event.channel;
                this.setupDataChannel();

                // Zusätzliche Prüfungen zum Kanal
                console.log(`Datenkanal-Status: ${event.channel.readyState}`);
                console.log(`Datenkanal negotiated: ${event.channel.negotiated}`);
                console.log(`Datenkanal ID: ${event.channel.id}`);
                console.log(`Datenkanal ordered: ${event.channel.ordered}`);
            };

            // Regelmäßige Überwachung der Verbindungsstatistiken
            const statsInterval = setInterval(() => {
                if (this.peerConnection && this.isConnected) {
                    this.peerConnection.getStats()
                        .then(stats => {
                            let activePairs = 0;

                            stats.forEach(report => {
                                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                    activePairs++;
                                }
                            });

                            if (activePairs === 0 && this.isConnected) {
                                console.warn('Keine aktiven Kandidatenpaare gefunden, obwohl Verbindung besteht!');

                                // Starte eine Neuverbindung, wenn keine aktiven Kandidatenpaare, aber angeblich verbunden
                                if (this.dataChannel?.readyState !== 'open') {
                                    console.error('Datenkanal nicht geöffnet, obwohl Verbindung besteht. Starte Neuverbindung...');
                                    this.attemptReconnect();
                                }
                            }
                        })
                        .catch(err => console.error('Fehler beim Sammeln von Statistiken:', err));
                } else {
                    clearInterval(statsInterval);
                }
            }, 15000);

        } catch (error) {
            console.error('Fehler bei RTCPeerConnection-Initialisierung:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(`Fehler bei WebRTC-Initialisierung: ${error}`);
            }
        }
    }

    /**
     * Richtet den Datenkanal ein
     */
    private setupDataChannel(): void {
        if (!this.dataChannel) {
            console.error('Kein Datenkanal zum Einrichten vorhanden');
            return;
        }

        console.log('Richte Datenkanal ein:', this.dataChannel.label);

        // Detailliertere Statusprüfungen und Fehlerbehandlung
        this.dataChannel.onopen = () => {
            console.log('✓ Datenkanal geöffnet - Status:', this.dataChannel?.readyState);
            this.isConnected = true;

            // Sende ausstehende ICE-Kandidaten
            while (this.pendingCandidates.length > 0) {
                const candidate = this.pendingCandidates.shift();
                if (candidate) {
                    console.log('Sende verzögerten ICE-Kandidaten...');
                    this.sendMessage({
                        type: 'ice-candidate',
                        sender: this.playerId,
                        roomId: this.roomId,
                        content: candidate
                    });
                }
            }

            // Test-Nachricht senden, um die Verbindung zu prüfen - mit Sicherheitsprüfung
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
                try {
                    console.log('Sende Test-Nachricht über Datenkanal...');
                    const testMessage = {
                        type: 'ping',
                        sender: this.playerId,
                        timestamp: Date.now()
                    };
                    this.dataChannel.send(JSON.stringify(testMessage));
                } catch (error) {
                    console.error('Fehler beim Senden der Test-Nachricht:', error);
                }
            } else {
                console.warn('Datenkanal nicht bereit für Test-Nachricht');
            }

            // Informiere über erfolgreiche Verbindung
            if (this.callbacks.onReconnect) {
                this.callbacks.onReconnect();
            }
        };

        this.dataChannel.onclose = () => {
            console.log('Datenkanal geschlossen - Status:', this.dataChannel?.readyState);
            this.isConnected = false;

            if (this.callbacks.onDcClose) {
                this.callbacks.onDcClose();
            }

            // Automatische Wiederverbindung, wenn der Kanal unerwartet geschlossen wurde
            this.attemptReconnect();
        };

        this.dataChannel.onerror = (event) => {
            // Bessere Typung für das Ereignisobjekt
            const error = (event as RTCErrorEvent).error;
            console.error('Datenkanal Fehler:', error?.message || 'Unbekannter Fehler');

            if (this.callbacks.onError) {
                this.callbacks.onError(`Datenkanal-Fehler: ${error?.message || 'Unbekannter Fehler'}`);
            }
        };

        this.dataChannel.onmessage = (event) => {
            try {
                const dataString = typeof event.data === 'string' ? event.data : '';
                console.log('Nachricht über Datenkanal empfangen:',
                    dataString.length > 50 ? dataString.slice(0, 50) + '...' : dataString);

                if (dataString) {
                    const message = JSON.parse(dataString);
                    this.handleDataChannelMessage(message);
                } else {
                    console.warn('Leere oder nicht-Text-Nachricht empfangen');
                }
            } catch (error) {
                console.error('Fehler beim Verarbeiten der Datenkanal-Nachricht:', error);
            }
        };

        // Stelle sicher, dass der Datenkanal richtig konfiguriert ist
        console.log('Datenkanal-Konfiguration:', {
            label: this.dataChannel.label,
            ordered: this.dataChannel.ordered,
            protocol: this.dataChannel.protocol,
            negotiated: this.dataChannel.negotiated,
            id: this.dataChannel.id,
            maxPacketLifeTime: this.dataChannel.maxPacketLifeTime,
            maxRetransmits: this.dataChannel.maxRetransmits,
            state: this.dataChannel.readyState
        });
    }

    /**
     * Verarbeitet eingehende Signaling-Nachrichten
     */
    private handleSignalingMessage(message: RTCMessage): void {
        console.log('Signaling-Nachricht empfangen:', message.type);

        // Stellen Sie sicher, dass die Raum-ID konsistent ist
        if (message.roomId) {
            message.roomId = message.roomId.toUpperCase().trim();
        }

        switch (message.type) {
            case 'room-created':
                console.log('Raum erstellt:', message.content);

                // Aktualisiere die lokale Raum-ID mit der vom Server bestätigten ID
                if (message.content && message.content.roomId) {
                    this.roomId = message.content.roomId;
                }

                // Erstelle das Angebot
                this.createOffer();
                break;

            case 'offer':
                // Verarbeite das Angebot und erstelle eine Antwort
                this.handleOffer(message.content);
                break;

            case 'answer':
                // Verarbeite die Antwort - Dieser Aufruf fehlte
                this.handleAnswer(message.content);
                break;

            case 'ice-candidate':
                // Füge den ICE-Kandidaten hinzu
                this.addIceCandidate(message.content);
                break;

            case 'room-joined':
                // Aktualisiere die lokale Raum-ID mit der vom Server bestätigten ID
                if (message.content && message.content.roomId) {
                    this.roomId = message.content.roomId;
                }
                break;

            case 'player-joined':
                // Ein neuer Spieler ist dem Raum beigetreten
                if (this.callbacks.onPlayerJoined) {
                    this.callbacks.onPlayerJoined(message.content);
                }
                break;

            case 'player-left':
                // Ein Spieler hat den Raum verlassen
                if (this.callbacks.onPlayerLeft) {
                    this.callbacks.onPlayerLeft(message.content.playerId);
                }
                break;

            case 'player-list-updated':
                // Aktualisiere die lokale Raum-ID, falls sie in der Nachricht enthalten ist
                if (message.content && message.content.roomId) {
                    this.roomId = message.content.roomId;
                }

                // Die Spielerliste wurde aktualisiert
                if (this.callbacks.onPlayersUpdate) {
                    this.callbacks.onPlayersUpdate(message.content.players);
                }

                // Aktualisiere lokale Spielerliste, wenn ein Spiel läuft
                if (this.gameState) {
                    this.gameState.players = message.content.players;
                }
                break;

            case 'error':
                // Ein Fehler ist aufgetreten
                console.error('Fehler vom Signaling-Server:', message.content.message);

                if (this.callbacks.onError) {
                    this.callbacks.onError(message.content.message);
                }
                break;

            case 'pong':
                // Ping-Antwort vom Server
                break;

            default:
                console.warn('Unbekannter Nachrichtentyp:', message.type);
        }
    }

    /**
     * Verarbeitet eingehende Datenkanal-Nachrichten
     */
    private handleDataChannelMessage(message: any): void {
        console.log('Datenkanal-Nachricht empfangen:', message.type);

        // Zuerst prüfen, ob es eine Synchronisierungsnachricht ist
        if (message.isSyncMessage === true) {
            console.log('Synchronisierungsnachricht erkannt:', message.type);
            if (this.callbacks.onSyncMessage) {
                this.callbacks.onSyncMessage(message);
                return; // Wichtig: Return hier, um nicht in den normalen Switch zu fallen
            }
        }

        // Normaler Fluss für normale Nachrichten
        switch (message.type) {
            case 'game-started':
                // Spiel wurde gestartet
                if (!message.content || !message.content.questions || !Array.isArray(message.content.questions)) {
                    console.error('Ungültige game-started Nachricht empfangen:', message);

                    if (this.callbacks.onError) {
                        this.callbacks.onError('Fehlerhafte Spieldaten erhalten');
                    }

                    return;
                }

                console.log(`Spiel gestartet mit ${message.content.questions.length} Fragen`);

                this.gameState = {
                    questions: message.content.questions,
                    currentQuestionIndex: 0,
                    players: this.gameState?.players || [],
                    answers: {},
                    timePerQuestion: message.content.timePerQuestion || 20,
                    startTime: message.content.startTime || Date.now()
                };

                if (this.callbacks.onGameStarted) {
                    this.callbacks.onGameStarted(this.gameState);
                }
                break;

            case 'player-answer':
                // Ein Spieler hat eine Frage beantwortet
                if (this.isHost && this.gameState) {
                    const {playerId, questionIndex, answer} = message.content;

                    // Speichere die Antwort
                    if (!this.gameState.answers[playerId]) {
                        this.gameState.answers[playerId] = [];
                    }
                    this.gameState.answers[playerId][questionIndex] = answer;

                    // Prüfe, ob alle Spieler geantwortet haben
                    this.checkAllPlayersAnswered(questionIndex);
                }

                // Leite die Antwort an Callbacks weiter
                if (this.callbacks.onPlayerAnswer) {
                    this.callbacks.onPlayerAnswer(message.content);
                }
                break;

            case 'all-players-answered':
                // Alle Spieler haben die aktuelle Frage beantwortet
                if (this.callbacks.onAllPlayersAnswered) {
                    this.callbacks.onAllPlayersAnswered(
                        message.content.questionIndex,
                        message.content.playerScores
                    );
                }
                break;

            case 'next-question':
                // Zur nächsten Frage wechseln
                if (this.gameState) {
                    this.gameState.currentQuestionIndex = message.content.nextQuestionIndex;
                }

                if (this.callbacks.onNextQuestion) {
                    this.callbacks.onNextQuestion(message.content.nextQuestionIndex);
                }
                break;

            case 'question-timer-ended':
                // Der Timer für eine Frage ist abgelaufen
                if (this.callbacks.onQuestionTimerEnded) {
                    this.callbacks.onQuestionTimerEnded(message.content.questionIndex);
                }
                break;

            case 'game-ended':
                // Das Spiel wurde beendet
                if (this.callbacks.onGameEnded) {
                    this.callbacks.onGameEnded(message.content.results);
                }

                // Setze den Spielstatus zurück
                this.gameState = null;
                break;

            default:
                console.warn('Unbekannter Datenkanal-Nachrichtentyp:', message.type);
        }
    }

    /**
     * Erstellt ein Angebot zur Verbindung
     */
    private async createOffer(): Promise<void> {
        if (!this.peerConnection) {
            console.error('Keine Peer-Verbindung verfügbar');
            if (this.callbacks.onError) {
                this.callbacks.onError('Keine Peer-Verbindung verfügbar');
            }
            return;
        }

        try {
            console.log('Erstelle Angebot...');

            // Setze SDP-Constraints für bessere Verbindungsqualität
            const offerOptions: RTCOfferOptions = {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
                iceRestart: this.reconnectAttempts > 0 // Bei Wiederverbindung immer ICE-Restart erzwingen
            };

            const offer = await this.peerConnection.createOffer(offerOptions);

            // Verbessere SDP für bessere Kompatibilität
            let modifiedSdp = offer.sdp;

            // Versuche, den UDP-Transport zu priorisieren
            if (modifiedSdp && modifiedSdp.includes('TCP')) {
                console.log('Modifiziere SDP, um UDP zu priorisieren...');
                // Keine tatsächliche Modifikation, nur Information über vorhandene Protokolle
            }

            const modifiedOffer = {
                type: offer.type,
                sdp: modifiedSdp
            } as RTCSessionDescriptionInit;

            console.log('Setze lokale Beschreibung...');
            await this.peerConnection.setLocalDescription(modifiedOffer);

            console.log('Sende Angebot an Peer...');
            this.sendMessage({
                type: 'offer',
                sender: this.playerId,
                roomId: this.roomId,
                content: modifiedOffer
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des Angebots:', error);

            if (this.callbacks.onError) {
                this.callbacks.onError(`Fehler beim Erstellen des Angebots: ${error}`);
            }

            // Bei Fehlern bei Angebotserstellung nach kurzer Pause erneut versuchen
            setTimeout(() => {
                if (this.peerConnection && this.peerConnection.connectionState !== 'connected') {
                    console.log('Versuche erneut, ein Angebot zu erstellen...');
                    this.createOffer().catch(e =>
                        console.error('Auch zweiter Versuch fehlgeschlagen:', e));
                }
            }, 2000);
        }
    }

    /**
     * Verarbeitet ein eingehendes Angebot
     */
    private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            console.error('Keine Peer-Verbindung verfügbar');
            if (this.callbacks.onError) {
                this.callbacks.onError('Kann Angebot nicht verarbeiten: Keine Peer-Verbindung verfügbar');
            }
            return;
        }

        try {
            console.log('Angebot empfangen, verarbeite...');

            // Prüfe, ob das Angebot gültig ist
            if (!offer || !offer.sdp) {
                throw new Error('Ungültiges Angebot ohne SDP empfangen');
            }

            // Ursprüngliche SDP für Debugging protokollieren
            console.log('Empfangenes SDP:', offer.sdp.substring(0, 100) + '...');

            // Verbessere Kompatibilität durch SDP-Anpassungen
            let modifiedSdp = offer.sdp;
            const modifiedOffer = {
                type: offer.type,
                sdp: modifiedSdp
            };

            console.log('Setze Remote-Beschreibung...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(modifiedOffer));
            console.log('Remote-Beschreibung erfolgreich gesetzt');

            // Sammle Verbindungsstatistiken nach Setzen der Remote-Beschreibung
            if (this.peerConnection.getStats) {
                try {
                    console.log('Sammle ICE-Kandidaten-Informationen nach setRemoteDescription...');
                    const stats = await this.peerConnection.getStats();

                    let localCandidates = 0;
                    let remoteCandidates = 0;

                    stats.forEach(report => {
                        if (report.type === 'local-candidate') localCandidates++;
                        if (report.type === 'remote-candidate') remoteCandidates++;
                    });

                    console.log(`ICE-Kandidaten: ${localCandidates} lokal, ${remoteCandidates} remote`);
                } catch (err) {
                    console.warn('Konnte keine Statistiken sammeln:', err);
                }
            }

            console.log('Erstelle Antwort...');
            const answer = await this.peerConnection.createAnswer();

            // Prüfe, ob die Antwort gültig ist
            if (!answer || !answer.sdp) {
                throw new Error('Konnte keine gültige Antwort erstellen');
            }

            console.log('Setze Local-Beschreibung für die Antwort...');
            await this.peerConnection.setLocalDescription(answer);
            console.log('Local-Beschreibung für Antwort erfolgreich gesetzt');

            console.log('Sende Antwort an Peer...');
            this.sendMessage({
                type: 'answer',
                sender: this.playerId,
                roomId: this.roomId,
                content: answer
            });

            // Forciere Sammlung von ICE-Kandidaten nach dem Senden der Antwort
            console.log('Starte aktive ICE-Kandidatensammlung nach Antwort...');
            if (!this.peerConnection.onicecandidate) {
                console.warn('onicecandidate Handler nicht gesetzt!');
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten des Angebots:', error);

            // Unterscheide zwischen verschiedenen Fehlerursachen
            let errorMsg = 'Fehler beim Verarbeiten des Angebots';
            if (error instanceof Error) {
                errorMsg += ': ' + error.message;

                // Spezifische Fehlerbehandlung basierend auf Fehlermeldung
                if (error.message.includes('setRemoteDescription')) {
                    console.error('SDP ist möglicherweise inkompatibel. Versuche ICE-Neustart...');
                    if (this.peerConnection) {
                        this.peerConnection.restartIce();

                        // Nach kurzer Verzögerung einen neuen Verbindungsversuch starten
                        setTimeout(() => {
                            this.initializePeerConnection();
                        }, 2000);
                    }
                }
            }

            if (this.callbacks.onError) {
                this.callbacks.onError(errorMsg);
            }
        }
    }

    /**
     * Verarbeitet eine eingehende Antwort
     */
    private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            console.error('Keine Peer-Verbindung verfügbar');
            if (this.callbacks.onError) {
                this.callbacks.onError('Kann Antwort nicht verarbeiten: Keine Peer-Verbindung verfügbar');
            }
            return;
        }

        try {
            // Prüfe, ob wir bereits eine Remote-Beschreibung haben
            if (this.peerConnection.remoteDescription) {
                console.warn('Remote-Beschreibung bereits gesetzt, möglicherweise Duplikat-Antwort');
                return;
            }

            // Prüfe, ob die Antwort gültig ist
            if (!answer || !answer.sdp) {
                throw new Error('Ungültige Antwort ohne SDP empfangen');
            }

            console.log('Antwort empfangen, setze Remote-Beschreibung...');
            console.log('Antwort SDP:', answer.sdp.substring(0, 100) + '...');

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Remote-Beschreibung erfolgreich gesetzt');

            // Prüfe den Verbindungsstatus nach dem Setzen der Antwort
            console.log('Aktueller Verbindungsstatus nach Antwort:', {
                iceConnectionState: this.peerConnection.iceConnectionState,
                connectionState: this.peerConnection.connectionState,
                signalingState: this.peerConnection.signalingState,
                iceGatheringState: this.peerConnection.iceGatheringState
            });

            // Sammle und sende zusätzliche ICE-Kandidaten, falls die Verbindung noch nicht hergestellt ist
            if (this.peerConnection.iceConnectionState !== 'connected' &&
                this.peerConnection.iceConnectionState !== 'completed') {
                console.log('Verbindung noch nicht hergestellt, sammle aggressiv ICE-Kandidaten...');

                // Forciere ICE-Kandidatensammlung, falls die Verbindung nicht zustande kommt
                setTimeout(() => {
                    if (this.peerConnection &&
                        this.peerConnection.iceConnectionState !== 'connected' &&
                        this.peerConnection.iceConnectionState !== 'completed') {
                        console.log('Verbindung immer noch nicht hergestellt, versuche ICE-Neustart...');
                        this.peerConnection.restartIce();
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten der Antwort:', error);

            // Spezifischere Fehlermeldung
            let errorMsg = 'Fehler beim Verarbeiten der Antwort';
            if (error instanceof Error) {
                errorMsg += ': ' + error.message;

                // Bestimmte Fehlertypen speziell behandeln
                if (error.message.includes('setRemoteDescription')) {
                    console.error('Fehler beim Setzen der Remote-Beschreibung. Versuche Neuinitialisierung...');
                    setTimeout(() => {
                        this.initializePeerConnection();

                        // Bei Host: Neues Angebot erstellen
                        if (this.isHost) {
                            this.createOffer().catch(err =>
                                console.error('Fehler beim Erstellen eines neuen Angebots nach Fehler:', err));
                        }
                    }, 2000);
                }
            }

            if (this.callbacks.onError) {
                this.callbacks.onError(errorMsg);
            }
        }
    }

    /**
     * Fügt einen ICE-Kandidaten hinzu
     */
    private async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) {
            console.error('Keine Peer-Verbindung verfügbar');
            return;
        }

        try {
            // Prüfe, ob der Kandidat gültig ist
            if (!candidate || (candidate.candidate === '')) {
                console.log('Leerer ICE-Kandidat empfangen, ignoriere...');
                return;
            }

            console.log('ICE-Kandidat empfangen:', candidate.candidate ? candidate.candidate.slice(0, 50) + '...' : 'kein candidate');
            console.log('Aktueller Signaling-Status:', this.peerConnection.signalingState);

            if (this.peerConnection.remoteDescription) {
                console.log('Remote-Beschreibung ist gesetzt, füge ICE-Kandidaten hinzu...');
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('ICE-Kandidat erfolgreich hinzugefügt');

                // Prüfe Verbindungsfortschritt nach dem Hinzufügen des Kandidaten
                console.log('Verbindungsstatus nach Kandidat:', this.peerConnection.iceConnectionState);
            } else {
                // Speichere den Kandidaten für später
                console.log('Remote-Beschreibung noch nicht gesetzt, speichere ICE-Kandidaten für später');
                this.pendingCandidates.push(new RTCIceCandidate(candidate));
                console.log(`${this.pendingCandidates.length} ausstehende Kandidaten`);
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen des ICE-Kandidaten:', error);

            // Bestimmte Fehlertypen speziell behandeln
            if (error instanceof Error && error.message.includes('addIceCandidate')) {
                console.warn('Konnte ICE-Kandidat nicht hinzufügen, speichere für später...');
                this.pendingCandidates.push(new RTCIceCandidate(candidate));
            }
        }
    }

    /**
     * Sendet eine Nachricht über den Signaling-Server
     */
    private sendMessage(message: RTCMessage): void {
        if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
            try {
                // Stellen Sie sicher, dass die Raum-ID konsistent formatiert ist
                if (message.roomId) {
                    message.roomId = message.roomId.toUpperCase().trim();
                }

                const messageStr = JSON.stringify(message);
                this.signalingServer.send(messageStr);
                console.log(`Nachricht gesendet: ${message.type}`);
            } catch (error) {
                console.error('Fehler beim Senden der Nachricht:', error);
            }
        } else {
            console.error('Keine Verbindung zum Signaling-Server');

            if (this.callbacks.onError) {
                this.callbacks.onError('Keine Verbindung zum Signaling-Server');
            }

            this.attemptReconnect();
        }
    }

    /**
     * Sendet eine Nachricht über den Datenkanal
     */
    private sendGameMessage(message: any): void {
        if (!this.dataChannel) {
            console.error('Datenkanal ist nicht verfügbar');
            if (this.callbacks.onError) {
                this.callbacks.onError('Datenkanal nicht verfügbar - Nachricht konnte nicht gesendet werden');
            }
            return;
        }

        if (this.dataChannel.readyState !== 'open') {
            console.error('Datenkanal ist nicht geöffnet (Status: ' + this.dataChannel.readyState + ')');
            if (this.callbacks.onError) {
                this.callbacks.onError('Datenkanal nicht geöffnet - Nachricht konnte nicht gesendet werden');
            }

            // Versuche eine Wiederverbindung, wenn der Kanal nicht geöffnet ist
            this.attemptReconnect();
            return;
        }

        try {
            const messageToSend = {
                ...message,
                sender: this.playerId
            };
            const messageStr = JSON.stringify(messageToSend);
            this.dataChannel.send(messageStr);
            console.log(`Spiel-Nachricht gesendet: ${message.type}`);
        } catch (error) {
            console.error('Fehler beim Senden der Datenkanal-Nachricht:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError('Fehler beim Senden der Nachricht: ' + error);
            }

            // Bei Sende-Fehlern auch eine Wiederverbindung versuchen
            this.attemptReconnect();
        }
    }

    /**
     * Sendet eine Synchronisierungsnachricht über den Datenkanal
     * Diese Methode wird verwendet, um Spielstatus explizit zu synchronisieren
     */
    public sendSyncMessage(message: any): void {
        if (!this.dataChannel) {
            console.error('Datenkanal ist nicht verfügbar');
            if (this.callbacks.onError) {
                this.callbacks.onError('Datenkanal nicht verfügbar - Sync-Nachricht konnte nicht gesendet werden');
            }
            return;
        }

        if (this.dataChannel.readyState !== 'open') {
            console.error('Datenkanal ist nicht geöffnet (Status: ' + this.dataChannel.readyState + ')');
            if (this.callbacks.onError) {
                this.callbacks.onError('Datenkanal nicht geöffnet - Sync-Nachricht konnte nicht gesendet werden');
            }
            return;
        }

        try {
            const messageToSend = {
                ...message,
                sender: this.playerId,
                isSyncMessage: true // Kennzeichnung als Synchronisierungsnachricht
            };
            const messageStr = JSON.stringify(messageToSend);
            this.dataChannel.send(messageStr);
            console.log(`Synchronisierungsnachricht gesendet: ${message.type}`);
        } catch (error) {
            console.error('Fehler beim Senden der Synchronisierungsnachricht:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError('Fehler beim Senden der Sync-Nachricht: ' + error);
            }
        }
    }

    /**
     * Prüft, ob alle Spieler eine Frage beantwortet haben
     */
    private checkAllPlayersAnswered(questionIndex: number): void {
        if (!this.gameState || !this.isHost) return;

        // Prüfe, ob alle Spieler geantwortet haben
        const allAnswered = this.gameState.players.every(player => {
            const playerAnswers = this.gameState!.answers[player.id] || [];
            return playerAnswers[questionIndex] !== undefined;
        });

        if (allAnswered) {
            console.log(`Alle Spieler haben Frage ${questionIndex} beantwortet`);

            // Berechne die Punktzahlen für diese Frage
            const playerScores: Record<string, number> = {};

            this.gameState.players.forEach(player => {
                const answers = this.gameState!.answers[player.id] || [];
                const answer = answers[questionIndex];
                const isCorrect = answer === this.gameState!.questions[questionIndex].correctAnswer;

                // Aktualisiere den Spieler-Score
                playerScores[player.id] = (playerScores[player.id] || 0) + (isCorrect ? 1 : 0);
            });

            // Informiere alle Spieler
            this.sendGameMessage({
                type: 'all-players-answered',
                content: {
                    questionIndex,
                    playerScores
                }
            });

            // Stoppe den Timer, da alle geantwortet haben
            if (this.questionTimer) {
                clearTimeout(this.questionTimer);
                this.questionTimer = null;
            }
        }
    }

    /**
     * Startet den Timer für die aktuelle Frage
     */
    private startQuestionTimer(): void {
        if (!this.gameState || !this.isHost) return;

        // Stoppe einen eventuell laufenden Timer
        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
        }

        const currentIndex = this.gameState.currentQuestionIndex;

        console.log(`Starte Timer für Frage ${currentIndex}, ${this.gameState.timePerQuestion} Sekunden`);

        // Starte einen neuen Timer
        this.questionTimer = setTimeout(() => {
            console.log(`Timer für Frage ${currentIndex} abgelaufen`);

            // Informiere alle Spieler
            this.sendGameMessage({
                type: 'question-timer-ended',
                content: {
                    questionIndex: currentIndex
                }
            });

            // Gehe zur nächsten Frage nach kurzer Verzögerung
            setTimeout(() => {
                this.nextQuestion();
            }, 1000);
        }, this.gameState.timePerQuestion * 1000);
    }

    /**
     * Startet einen Ping-Intervall, um die Verbindung aufrechtzuerhalten
     */
    private startPingInterval(): void {
        // Stoppe einen eventuell laufenden Ping-Intervall
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        // Sende alle 30 Sekunden einen Ping an den Server
        this.pingInterval = setInterval(() => {
            if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
                try {
                    this.sendMessage({
                        type: 'ping',
                        sender: this.playerId,
                        roomId: this.roomId
                    });
                } catch (error) {
                    console.error('Fehler beim Senden des Pings:', error);
                }
            }
        }, 30000);
    }

    /**
     * Versucht, die Verbindung wiederherzustellen
     */
    private attemptReconnect(): void {
        // Vermeide mehrfache gleichzeitige Wiederverbindungsversuche
        if (this.reconnectTimer) {
            return;
        }

        // Prüfe, ob die maximale Anzahl von Versuchen erreicht wurde
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Maximale Anzahl von Wiederverbindungsversuchen erreicht');

            if (this.callbacks.onError) {
                this.callbacks.onError('Verbindung konnte nicht wiederhergestellt werden');
            }

            this.cleanup();
            return;
        }

        this.reconnectAttempts++;
        console.log(`Wiederverbindungsversuch ${this.reconnectAttempts} von ${this.maxReconnectAttempts}`);

        // Warte einen Moment, bevor die Wiederverbindung versucht wird
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;

            // Nur wenn ein Raum und ein Name gesetzt sind, versuche die Wiederverbindung
            if (!this.roomId || !this.playerName) {
                console.log('Kein Raum oder Name gesetzt, Wiederverbindung nicht möglich');
                return;
            }

            if (this.isHost) {
                this.createRoom(this.playerName, this.roomId)
                    .then(() => {
                        console.log('Wiederverbindung als Host erfolgreich');

                        if (this.callbacks.onReconnect) {
                            this.callbacks.onReconnect();
                        }
                    })
                    .catch(error => {
                        console.error('Wiederverbindung als Host fehlgeschlagen:', error);
                        this.attemptReconnect();
                    });
            } else {
                this.joinRoom(this.playerName, this.roomId)
                    .then(() => {
                        console.log('Wiederverbindung als Gast erfolgreich');

                        if (this.callbacks.onReconnect) {
                            this.callbacks.onReconnect();
                        }
                    })
                    .catch(error => {
                        console.error('Wiederverbindung als Gast fehlgeschlagen:', error);
                        this.attemptReconnect();
                    });
            }
        }, this.reconnectDelay * Math.min(this.reconnectAttempts, 3)); // Exponentielles Backoff
    }

    /**
     * Bereinigt alle Ressourcen
     */
    private cleanup(): void {
        // Stoppe alle Timer
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.questionTimer) {
            clearTimeout(this.questionTimer);
            this.questionTimer = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.wsConnectionTimeout) {
            clearTimeout(this.wsConnectionTimeout);
            this.wsConnectionTimeout = null;
        }

        // Schließe den Datenkanal
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        // Schließe die Peer-Verbindung
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Schließe die Signaling-Verbindung
        if (this.signalingServer) {
            this.signalingServer.close();
            this.signalingServer = null;
        }

        // Setze den Status zurück
        this.isConnected = false;
        this.gameState = null;
        this.roomId = '';
        this.isHost = false;
        this.reconnectAttempts = 0;
        this.isConnecting = false;

        console.log('Alle Ressourcen bereinigt');
    }

    /**
     * Gibt den aktuellen Spieler-ID zurück
     */
    public getPlayerId(): string {
        return this.playerId;
    }

    /**
     * Gibt zurück, ob der Spieler der Host ist
     */
    public isHostPlayer(): boolean {
        return this.isHost;
    }

    /**
     * Gibt zurück, ob eine Verbindung zum Peer besteht
     */
    public isConnectedToPeer(): boolean {
        return this.isConnected;
    }

    /**
     * Gibt den aktuellen Spielstatus zurück
     */
    public getGameState(): GameState | null {
        return this.gameState;
    }
}

export default WebRTCService;