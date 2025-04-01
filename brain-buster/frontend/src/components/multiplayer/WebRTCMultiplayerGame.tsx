// src/components/multiplayer/WebRTCMultiplayerGame.tsx
import {useEffect, useState} from 'react';
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

    useEffect(() => {
        // Wenn wir keine Fragen haben, aber initComplete ist noch false
        if (questions.length === 0 && !initComplete) {
            // Prüfen, ob die Fragen im lokalen Speicher sind
            const savedQuestions = localStorage.getItem('lastGameQuestions');
            if (savedQuestions) {
                try {
                    const parsedQuestions = JSON.parse(savedQuestions);

                    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                        console.log("🛟 Fragen aus dem lokalen Speicher geladen:", parsedQuestions.length);
                        setQuestions(parsedQuestions);
                        setCurrentQuestionIndex(0);
                        setInitComplete(true);
                        startGameContext('multiplayer', parsedQuestions);
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
                console.log(`Empfangene Fragen: ${gameState.questions.length}`);

                // Defensives Validieren mit besserem Feedback
                if (!gameState || !gameState.questions || !Array.isArray(gameState.questions) || gameState.questions.length === 0) {
                    console.error("❌ Ungültige Daten im game-started Event:", gameState);
                    setErrorMsg("Ungültige Spielstart-Daten empfangen. Versuche Neustart...");
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

                // Initialisiere Spiel im Kontext
                startGameContext('multiplayer', gameState.questions);
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
                    if (isHost) {
                        // Das Spielende wird durch onGameEnded verarbeitet
                    }
                }
            },

            onNextQuestion: (nextIndex) => {
                console.log("Wechsel zur nächsten Frage:", nextIndex);
                setCurrentQuestionIndex(nextIndex);
                setWaitingForOthers(false);
            },

            onQuestionTimerEnded: (questionIndex) => {
                console.log("Timer für Frage abgelaufen:", questionIndex);
                // Zeit ist abgelaufen, aber noch nicht geantwortet
                if (waitingForOthers === false) {
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
    }, [webRTC, players, isHost, questions.length, endGame, startGameContext, playerId, waitingForOthers]);

    // Frage beantworten
    const handleAnswerQuestion = (answer: number) => {
        if (!webRTC || !initComplete) return;

        console.log("Sende Antwort:", {
            roomId,
            playerId,
            questionIndex: currentQuestionIndex,
            answer
        });
        answerQuestionWebRTC(currentQuestionIndex, answer);

        setWaitingForOthers(true);
    };

    // Zur nächsten Frage (nur für Host)
    const handleNextQuestion = () => {
        if (!webRTC || !isHost || !initComplete) return;

        console.log("Host wechselt zur nächsten Frage von Index", currentQuestionIndex);
        nextQuestionWebRTC();
    };

    // Spiel verlassen
    const handleLeaveGame = () => {
        leaveRoom();
        onLeave();
    };

    // Status-Aktualisierung erzwingen
    const handleForceRefresh = () => {
        if (!webRTC) return;

        setErrorMsg("Verbindung wird neu aufgebaut...");

        // Kurze Pause, dann die Seite neu laden
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    // Berechne Punktzahl des aktuellen Spielers
    const currentPlayerScore = playerScores.find(p => p.id === playerId)?.score || 0;

    // Berechne Punktzahlen der Gegner
    const opponentScores = playerScores.filter(p => p.id !== playerId);

    // Berechne aktuellen Spielzustand für Logging
    const gameStatus = {
        initComplete,
        questionsLength: questions.length,
        currentQuestionIndex,
        waitingForOthers,
        gameEnded
    };

    if (debugMode) {
        console.log("Spielzustand:", gameStatus);
    }

    return (
        <div>
            {!gameEnded ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Card className="w-full p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm text-violet-300">Raum</span>
                                    <h3 className="font-medium">{roomId}</h3>
                                </div>

                                <div className="flex items-center space-x-2">
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
                                    questionsLength: questions.length,
                                    currentIndex: currentQuestionIndex,
                                    waitingForOthers,
                                    isHost,
                                    webRTCConnected: isConnected,
                                    firstQuestion: questions[0] ?
                                        {id: questions[0].id, question: questions[0].question} :
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

                                    <Button variant="secondary" onClick={handleForceRefresh}>
                                        Status aktualisieren
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold mb-4">Alle Fragen
                                        beantwortet!</h3>
                                    <p className="mb-6">Warte auf die anderen Spieler...</p>
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