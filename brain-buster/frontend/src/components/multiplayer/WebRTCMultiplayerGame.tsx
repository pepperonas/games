// src/components/multiplayer/WebRTCMultiplayerGame.tsx
import {useCallback, useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import QuestionCard from '../game/QuestionCard';
import {useGame} from '../../store/GameContext';
import {useWebRTC} from '../../store/WebRTCContext';
import {Question} from '../../types';

interface PlayerScore {
    id: string;
    name: string;
    score: number;
}

interface WebRTCMultiplayerGameProps {
    playerName: string;
    roomId: string;
    playerId: string;
    isHost: boolean;
    onBackToLobby: () => void;
    onLeave: () => void;
}

const WebRTCMultiplayerGame = ({
                                   playerName,
                                   roomId,
                                   playerId,
                                   isHost,
                                   onBackToLobby,
                                   onLeave
                               }: WebRTCMultiplayerGameProps) => {
    const {startGame: startGameContext, endGame} = useGame();
    const {
        webRTC,
        players,
        isConnected,
        answerQuestion: answerQuestionWebRTC,
        nextQuestion: nextQuestionWebRTC,
        leaveRoom
    } = useWebRTC();

    const [gameEnded, setGameEnded] = useState(false);
    const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [waitingForOthers, setWaitingForOthers] = useState(false);
    const [gameResult, setGameResult] = useState<{
        winners: PlayerScore[],
        isDraw: boolean
    } | null>(null);
    const [initComplete, setInitComplete] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [debugMode, setDebugMode] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
    const [countdownStarted, setCountdownStarted] = useState(false);
    const [syncAttempt, setSyncAttempt] = useState(0);

    // Timer-Funktion für die verbleibende Zeit pro Frage
    const startQuestionTimer = useCallback((duration: number) => {
        setQuestionStartTime(Date.now());
        setTimeLeft(duration);

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = questionStartTime ? (now - questionStartTime) / 1000 : 0;
            const remaining = Math.max(0, duration - elapsed);

            setTimeLeft(Math.round(remaining));

            if (remaining <= 0) {
                clearInterval(interval);
                // Wenn die Zeit abgelaufen ist und noch keine Antwort gegeben wurde
                if (!waitingForOthers) {
                    handleAnswerQuestion(-1); // Automatisch "keine Antwort" senden
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [questionStartTime, waitingForOthers]);

    // Spielsynchronisierung - wird vom Host verwendet, um das Spiel mit allen Clients zu synchronisieren
    const forceGameSync = useCallback(() => {
        if (!isHost || !webRTC) {
            console.log("Nur der Host kann das Spiel synchronisieren");
            return;
        }

        // Fragen aus dem lokalen Speicher laden
        const savedQuestions = localStorage.getItem('lastGameQuestions');
        if (savedQuestions) {
            try {
                const parsedQuestions = JSON.parse(savedQuestions);
                console.log("Sende erneute Spielsynchronisation mit Fragen:", parsedQuestions.length);

                // Sichere Fragen erneut für mögliche Wiederherstellung
                localStorage.setItem('lastGameQuestions', JSON.stringify(parsedQuestions));
                localStorage.setItem('lastGameTimestamp', Date.now().toString());

                // Inkrementiere den Synchronisierungsversuch für Debugging
                setSyncAttempt(prev => prev + 1);

                // Manuelle Nachricht an alle Clients senden
                webRTC.sendSyncMessage({
                    type: 'game-started',
                    content: {
                        questions: parsedQuestions,
                        timePerQuestion: 20,
                        startTime: Date.now(),
                        syncAttempt: syncAttempt + 1
                    }
                });

                setErrorMsg("Spielsynchronisierung an Clients gesendet...");
                setTimeout(() => setErrorMsg(null), 3000);
            } catch (error) {
                console.error("Fehler beim Synchronisieren:", error);
                setErrorMsg("Fehler beim Synchronisieren: " + error);
            }
        } else {
            setErrorMsg("Keine Fragen zum Synchronisieren gefunden");
        }
    }, [isHost, webRTC, syncAttempt]);

    // In WebRTCMultiplayerGame.tsx, ändere die startCountdown-Funktion:
    const startCountdown = useCallback(() => {
        // Wenn bereits eine Initialisierung läuft, abbrechen
        if (initComplete || questions.length > 0) {
            console.log("Spiel bereits initialisiert, Countdown nicht neu gestartet");
            return;
        }

        // Setze Debug-Modus für bessere Fehleranalyse
        setDebugMode(true);
        setCountdown(3);

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev !== null && prev > 1) {
                    return prev - 1;
                } else {
                    clearInterval(interval);

                    // Ausführlicheres Logging nach Countdown-Ende
                    console.log("Countdown beendet, Spielstatus:", {
                        initComplete,
                        questionsLength: questions.length,
                        isConnected,
                        savedQuestionsExist: Boolean(localStorage.getItem('lastGameQuestions'))
                    });

                    // Verzögerung vor dem Fortfahren, um WebRTC-Verbindung Zeit zu geben
                    setTimeout(() => {
                        // Wenn wir nach dem Countdown noch keine Fragen haben, versuche sie aus dem lokalen Speicher zu laden
                        if (!initComplete && questions.length === 0) {
                            const savedQuestions = localStorage.getItem('lastGameQuestions');
                            if (savedQuestions) {
                                try {
                                    const parsedQuestions = JSON.parse(savedQuestions);
                                    const questionsTimestamp = localStorage.getItem('lastGameTimestamp');
                                    const timestamp = questionsTimestamp ? parseInt(questionsTimestamp) : 0;

                                    // Prüfe, ob die Fragen nicht älter als 30 Minuten sind (erhöhte Toleranz)
                                    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

                                    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0 && timestamp > thirtyMinutesAgo) {
                                        console.log("🚨 Fragen aus lokalem Speicher nach Countdown geladen:", parsedQuestions.length);
                                        setQuestions(parsedQuestions);
                                        setCurrentQuestionIndex(0);
                                        setInitComplete(true);
                                        startGameContext('multiplayer', parsedQuestions);

                                        // Starte Timer für die erste Frage
                                        startQuestionTimer(20);
                                        setErrorMsg(null);
                                    } else {
                                        setErrorMsg("Keine aktuellen Fragedaten gefunden. Bitte zurück zur Lobby und erneut starten.");
                                    }
                                } catch (error) {
                                    console.error("Fehler beim Laden der Fragen nach Countdown:", error);
                                    setErrorMsg("Fehler beim Laden der Fragen. Bitte neu starten.");
                                }
                            } else {
                                // Keine gespeicherten Fragen gefunden
                                setErrorMsg("Verbindungsproblem: Keine Fragedaten empfangen. Zurück zur Lobby.");
                            }
                        }
                    }, 1000); // Eine Sekunde Verzögerung

                    return null;
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [initComplete, questions.length, isConnected, startGameContext, startQuestionTimer]);

    // Implementiere regelmäßige automatische Synchronisierung (nur Host)
    useEffect(() => {
        let syncInterval: ReturnType<typeof setInterval> | null = null;

        // Nur für den Host und wenn das Spiel noch nicht initialisiert ist
        if (isHost && isConnected && !initComplete && countdown === null) {
            syncInterval = setInterval(() => {
                const savedQuestions = localStorage.getItem('lastGameQuestions');
                if (savedQuestions) {
                    console.log("Automatische Spielsynchronisierung...");
                    forceGameSync();
                }
            }, 3000); // Alle 3 Sekunden versuchen, falls das Spiel noch nicht gestartet hat
        }

        return () => {
            if (syncInterval) {
                clearInterval(syncInterval);
            }
        };
    }, [isHost, isConnected, initComplete, countdown, forceGameSync]);

    // Versuche Fragen aus dem localStorage zu laden bei Start
    useEffect(() => {
        if (questions.length === 0 && !initComplete) {
            const savedQuestions = localStorage.getItem('lastGameQuestions');
            if (savedQuestions) {
                try {
                    const parsedQuestions = JSON.parse(savedQuestions);
                    const questionsTimestamp = localStorage.getItem('lastGameTimestamp');
                    const timestamp = questionsTimestamp ? parseInt(questionsTimestamp) : 0;

                    // Prüfe, ob die Fragen nicht älter als 10 Minuten sind
                    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

                    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0 && timestamp > tenMinutesAgo) {
                        console.log("🛟 Fragen aus dem lokalen Speicher geladen:", parsedQuestions.length);
                        setQuestions(parsedQuestions);
                        setCurrentQuestionIndex(0);
                        setInitComplete(true);
                        startGameContext('multiplayer', parsedQuestions);
                    } else {
                        console.log("Gespeicherte Fragen sind zu alt oder ungültig");
                        localStorage.removeItem('lastGameQuestions');
                        localStorage.removeItem('lastGameTimestamp');
                    }
                } catch (error) {
                    console.error("Fehler beim Analysieren gespeicherter Fragen:", error);
                }
            }
        }
    }, [questions.length, initComplete, startGameContext]);

    // Registriere Callbacks für WebRTC-Spielereignisse
    useEffect(() => {
        if (!webRTC) {
            console.error("Keine WebRTC Verbindung verfügbar");
            setErrorMsg("Keine Verbindung zum Peer verfügbar.");
            return;
        }

        console.log("Richte Spielereignis-Listener in WebRTCMultiplayerGame ein");

        // Starte den Countdown nach dem Laden der Komponente
        if (!countdown && !countdownStarted) {
            setCountdownStarted(true);
            startCountdown();
        }

        // Lese Punktzahlen aus den Spielern
        const updatePlayerScores = () => {
            const scores = players.map(player => ({
                id: player.id,
                name: player.name,
                score: player.score
            }));
            setPlayerScores(scores);
        };

        // Aktualisiere Punktzahlen bei Spielerlisten-Änderungen
        updatePlayerScores();

        // Registriere Callbacks
        webRTC.registerCallbacks({
            onGameStarted: (gameState) => {
                console.log("Spiel gestartet Event empfangen:", gameState);

                // Detaillierteres Logging
                console.log(`Empfangene Fragen: ${gameState?.questions?.length || 0}`);

                // Defensives Validieren mit besserem Feedback
                if (!gameState || !gameState.questions || !Array.isArray(gameState.questions) || gameState.questions.length === 0) {
                    console.error("❌ Ungültige Daten im game-started Event:", gameState);
                    setErrorMsg("Ungültige Spielstart-Daten empfangen. Versuche es erneut...");
                    return;
                }

                // Verhindere doppelte Initialisierungen
                if (initComplete && questions.length > 0) {
                    console.log("⚠️ Spiel bereits initialisiert, ignoriere doppeltes game-started Event");
                    return;
                }

                console.log(`✅ Erfolgreich ${gameState.questions.length} Fragen empfangen`);

                // Sichere Fragen für mögliche Wiederherstellung
                localStorage.setItem('lastGameQuestions', JSON.stringify(gameState.questions));
                localStorage.setItem('lastGameTimestamp', Date.now().toString());

                // Setze Spielstatus - Reihenfolge ist wichtig!
                setQuestions(gameState.questions);
                setCurrentQuestionIndex(0);
                setInitComplete(true);
                setErrorMsg(null);

                // Starte Timer für die erste Frage
                startQuestionTimer(gameState.timePerQuestion || 20);

                // Initialisiere Spiel im Kontext
                startGameContext('multiplayer', gameState.questions);
            },

            onSyncMessage: (syncData) => {
                console.log("Synchronisierungsnachricht empfangen:", syncData);

                // Nur relevant für Clients, nicht für den Host
                if (isHost) {
                    console.log("Host ignoriert Sync-Nachricht");
                    return;
                }

                if (syncData.type === 'game-started') {
                    // Behandle die Synchronisierung wie ein normales game-started Event
                    if (!syncData.content || !syncData.content.questions || !Array.isArray(syncData.content.questions)) {
                        console.error("❌ Ungültige Sync-Daten erhalten:", syncData);
                        return;
                    }

                    console.log(`📥 Sync: Empfange ${syncData.content.questions.length} Fragen (Versuch ${syncData.content.syncAttempt || 'unbekannt'})`);

                    // Sichere Fragen für mögliche Wiederherstellung
                    localStorage.setItem('lastGameQuestions', JSON.stringify(syncData.content.questions));
                    localStorage.setItem('lastGameTimestamp', Date.now().toString());

                    // Setze Spielstatus
                    if (!initComplete || questions.length === 0) {
                        setQuestions(syncData.content.questions);
                        setCurrentQuestionIndex(0);
                        setInitComplete(true);
                        setErrorMsg(null);

                        // Initialisiere Spiel im Kontext
                        startGameContext('multiplayer', syncData.content.questions);

                        // Starte Timer für die erste Frage
                        startQuestionTimer(syncData.content.timePerQuestion || 20);
                    }
                }
            },

            onPlayerAnswer: (data) => {
                console.log("Spieler hat geantwortet:", data);
                updatePlayerScores();
            },

            onAllPlayersAnswered: (questionIndex, _playerScores) => {
                console.log("Alle Spieler haben Frage beantwortet", questionIndex);
                updatePlayerScores();
                setWaitingForOthers(false);

                // Wenn dies die letzte Frage war, beende das Spiel
                if (questionIndex >= questions.length - 1) {
                    console.log("Letzte Frage beantwortet, bereite Spielende vor");
                }
            },

            onNextQuestion: (nextIndex) => {
                console.log("Wechsel zur nächsten Frage:", nextIndex);
                setCurrentQuestionIndex(nextIndex);
                setWaitingForOthers(false);

                // Starte den Timer für die nächste Frage
                if (questions.length > 0) {
                    startQuestionTimer(20); // Standard: 20 Sekunden pro Frage
                }
            },

            onQuestionTimerEnded: (questionIndex) => {
                console.log("Timer für Frage abgelaufen:", questionIndex);
                setTimeLeft(0);

                // Zeit ist abgelaufen, aber noch nicht geantwortet
                if (!waitingForOthers) {
                    // Automatische Antwort senden (-1 für keine Antwort)
                    handleAnswerQuestion(-1);
                }
            },

            onGameEnded: (results) => {
                console.log("Spiel beendet mit Ergebnissen:", results);
                setGameEnded(true);

                if (results) {
                    setPlayerScores(results.playerScores || []);
                    setGameResult({
                        winners: results.winners || [],
                        isDraw: results.isDraw || false
                    });

                    // Bestimme das Ergebnis für den lokalen Spieler
                    const isWinner = results.winners?.some((w: PlayerScore) => w.id === playerId);
                    let result: 'win' | 'loss' | 'draw' = 'draw';

                    if (results.isDraw) {
                        result = 'draw';
                    } else if (isWinner) {
                        result = 'win';
                    } else {
                        result = 'loss';
                    }

                    // Aktualisiere lokalen Spielstand
                    endGame(result);
                }
            },

            onError: (message) => {
                console.error("WebRTC Fehler:", message);
                setErrorMsg(message || "Ein Fehler ist aufgetreten");
            }
        });

        // Bereinigungsfunktion
        return () => {
            // WebRTC-Service behält seine Callbacks intern bei
        };
    }, [webRTC, players, isHost, questions.length, endGame, startGameContext, playerId, waitingForOthers, countdown, startCountdown, countdownStarted, startQuestionTimer]);

    // Frage beantworten
    const handleAnswerQuestion = useCallback((answer: number) => {
        if (!webRTC || !initComplete) return;

        console.log("Sende Antwort:", {
            roomId,
            playerId,
            questionIndex: currentQuestionIndex,
            answer
        });
        answerQuestionWebRTC(currentQuestionIndex, answer);

        setWaitingForOthers(true);
    }, [webRTC, initComplete, roomId, playerId, currentQuestionIndex, answerQuestionWebRTC]);

    // Zur nächsten Frage (nur für Host)
    const handleNextQuestion = useCallback(() => {
        if (!webRTC || !isHost || !initComplete) return;

        console.log("Host wechselt zur nächsten Frage von Index", currentQuestionIndex);
        nextQuestionWebRTC();
    }, [webRTC, isHost, initComplete, currentQuestionIndex, nextQuestionWebRTC]);

    // Spiel verlassen
    const handleLeaveGame = useCallback(() => {
        leaveRoom();
        onLeave();
    }, [leaveRoom, onLeave]);

    // Status-Aktualisierung erzwingen
    const handleForceRefresh = useCallback(() => {
        if (!webRTC) return;

        setErrorMsg("Verbindung wird neu aufgebaut...");

        // Kurze Pause, dann die Seite neu laden
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }, [webRTC]);

    // Berechne Punktzahl des aktuellen Spielers
    const currentPlayerScore = playerScores.find(p => p.id === playerId)?.score || 0;

    // Berechne Punktzahlen der Gegner
    const opponentScores = playerScores.filter(p => p.id !== playerId);

    return (
        <div>
            {countdown !== null ? (
                <Card className="text-center py-12 bg-violet-900/30">
                    <motion.div
                        key={countdown}
                        initial={{scale: 0.5, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        exit={{scale: 1.5, opacity: 0}}
                        transition={{duration: 0.5}}
                        className="text-7xl font-bold text-violet-400"
                    >
                        {countdown}
                    </motion.div>
                    <p className="mt-4 text-lg">Das Spiel startet gleich...</p>
                </Card>
            ) : !gameEnded ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Card className="w-full p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm text-violet-300">Raum</span>
                                    <h3 className="font-medium">{roomId}</h3>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {isHost && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={forceGameSync}
                                        >
                                            Spiel synchronisieren
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDebugMode(!debugMode)}
                                    >
                                        {debugMode ? "Debug aus" : "Debug an"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleLeaveGame}>
                                        Spiel verlassen
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Spielerscores anzeigen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Card className="p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="text-lg mr-2">👤</div>
                                    <div>
                                        <div className="font-medium">{playerName}</div>
                                        <div className="text-sm text-violet-300">
                                            Du {isHost && <span>(Host)</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xl font-bold">
                                    {currentPlayerScore}
                                </div>
                            </div>
                        </Card>

                        {opponentScores.map(opponent => (
                            <Card className="p-4" key={opponent.id}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <div className="text-lg mr-2">👤</div>
                                        <div>
                                            <div className="font-medium">{opponent.name}</div>
                                            <div className="text-sm text-violet-300">Gegner</div>
                                        </div>
                                    </div>

                                    <div className="text-xl font-bold">
                                        {opponent.score}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Debug-Informationen */}
                    {debugMode && (
                        <Card className="bg-gray-800 p-4 text-xs font-mono">
                            <div className="overflow-auto max-h-40">
                                <pre>{JSON.stringify({
                                    initComplete,
                                    syncAttempt,
                                    questionsLength: questions.length,
                                    currentIndex: currentQuestionIndex,
                                    waitingForOthers,
                                    isHost,
                                    webRTCConnected: isConnected,
                                    timeLeft,
                                    countdownStarted,
                                    storageHasQuestions: Boolean(localStorage.getItem('lastGameQuestions')),
                                    firstQuestion: questions[0] ?
                                        {
                                            id: questions[0].id,
                                            question: questions[0].question.substring(0, 30) + "..."
                                        } :
                                        null
                                }, null, 2)}</pre>
                            </div>
                        </Card>
                    )}

                    {/* Fehlermeldung */}
                    {errorMsg && (
                        <Card className="p-4 bg-red-600/20 border border-red-600/40">
                            <div className="flex items-center mb-2">
                                <div className="text-lg mr-2">⚠️</div>
                                <p className="font-medium text-red-300">{errorMsg}</p>
                            </div>
                            <div className="flex space-x-2">
                                <Button variant="primary" size="sm" onClick={handleForceRefresh}>
                                    Spielstatus aktualisieren
                                </Button>
                                <Button variant="secondary" size="sm"
                                        onClick={() => setErrorMsg(null)}>
                                    Schließen
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Verbindungsstatus */}
                    {!isConnected && (
                        <Card className="p-4 bg-yellow-600/20 border border-yellow-600/40">
                            <div className="flex items-center">
                                <div className="text-lg mr-2">🔌</div>
                                <p className="font-medium text-yellow-300">
                                    Verbindung zum Server verloren. Versuche, die Verbindung
                                    wiederherzustellen...
                                </p>
                            </div>
                            <div className="mt-2">
                                <Button variant="primary" size="sm" onClick={handleForceRefresh}>
                                    Neu verbinden
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Hauptspielinhalt */}
                    {initComplete && questions.length > 0 && currentQuestionIndex < questions.length ? (
                        <div>
                            <div className="mb-4 flex justify-between items-center">
                                <div>
                                    <span
                                        className="text-sm font-medium text-violet-300">Frage</span>
                                    <h2 className="text-xl font-bold">
                                        {currentQuestionIndex + 1} / {questions.length}
                                    </h2>
                                </div>

                                {timeLeft !== null && (
                                    <div className="text-right">
                                        <span
                                            className="text-sm font-medium text-violet-300">Zeit</span>
                                        <h2 className="text-xl font-bold">
                                            {timeLeft}s
                                        </h2>
                                    </div>
                                )}
                            </div>

                            <QuestionCard
                                question={questions[currentQuestionIndex]}
                                onAnswer={handleAnswerQuestion}
                                onNext={handleNextQuestion}
                                isMultiplayer={true}
                                isHost={isHost}
                                waitingForOthers={waitingForOthers}
                            />
                        </div>
                    ) : (
                        <Card className="text-center p-6">
                            {!initComplete ? (
                                <>
                                    <h3 className="text-xl font-bold mb-4">Spiel wird
                                        initialisiert...</h3>
                                    <p className="mb-6">
                                        Warte auf Daten vom Peer... {questions.length > 0 ?
                                        `(${questions.length} Fragen empfangen)` : ''}
                                    </p>

                                    <div
                                        className="loader mx-auto w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full border-t-violet-500 animate-spin"></div>

                                    {isHost && (
                                        <Button className="mt-6 mr-2" variant="primary" onClick={forceGameSync}>
                                            Spiel manuell synchronisieren
                                        </Button>
                                    )}
                                    <Button className="mt-6" variant="secondary"
                                            onClick={handleForceRefresh}>
                                        Status aktualisieren
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold mb-4">Alle Fragen
                                        beantwortet!</h3>
                                    <p className="mb-6">Warte auf die anderen Spieler...</p>

                                    <div
                                        className="loader mx-auto w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full border-t-violet-500 animate-spin"></div>
                                </>
                            )}
                        </Card>
                    )}
                </div>
            ) : (
                <Card className="text-center p-6">
                    <h2 className="text-2xl font-bold mb-6">Spielergebnis</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        {playerScores.map(player => (
                            <div
                                key={player.id}
                                className={`bg-white/5 p-4 rounded-lg ${
                                    gameResult?.winners.some(w => w.id === player.id)
                                        ? 'border-2 border-green-500'
                                        : ''
                                }`}
                            >
                                <div className="text-lg mb-1">
                                    {player.name}
                                    {player.id === playerId && (
                                        <span
                                            className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                                            Du
                                        </span>
                                    )}
                                </div>
                                <div className="text-3xl font-bold">{player.score}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-8">
                        {gameResult?.isDraw ? (
                            <motion.div
                                initial={{scale: 0.8, opacity: 0}}
                                animate={{scale: 1, opacity: 1}}
                                transition={{duration: 0.5}}
                            >
                                <div className="text-4xl mb-2">🤝</div>
                                <h3 className="text-xl font-bold text-blue-400">Unentschieden!</h3>
                            </motion.div>
                        ) : gameResult?.winners.some(w => w.id === playerId) ? (
                            <motion.div
                                initial={{scale: 0.8, opacity: 0}}
                                animate={{scale: 1, opacity: 1}}
                                transition={{duration: 0.5}}
                            >
                                <div className="text-4xl mb-2">🏆</div>
                                <h3 className="text-xl font-bold text-green-400">Du hast
                                    gewonnen!</h3>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{scale: 0.8, opacity: 0}}
                                animate={{scale: 1, opacity: 1}}
                                transition={{duration: 0.5}}
                            >
                                <div className="text-4xl mb-2">😢</div>
                                <h3 className="text-xl font-bold text-orange-400">Du hast
                                    verloren</h3>
                            </motion.div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="primary" onClick={onBackToLobby}>
                            Zurück zur Lobby
                        </Button>
                        <Button variant="outline" onClick={handleLeaveGame}>
                            Spiel verlassen
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default WebRTCMultiplayerGame;