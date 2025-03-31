import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'
import Button from '../ui/Button'
import QuestionCard from '../game/QuestionCard'
import { useGame } from '../../store/GameContext'
import { useSocket } from '../../store/SocketContext'
import { Question } from '../../types'

interface PlayerScore {
    id: string;
    name: string;
    score: number;
}

interface GameStartedData {
    questions: Question[];
    players: any[];
    startTime: number;
    isReconnect?: boolean;
}

interface AllPlayersAnsweredData {
    questionIndex: number;
    playerScores: PlayerScore[];
    allPlayers: any[];
}

interface GameEndedData {
    results: {
        playerScores: PlayerScore[];
        winners: PlayerScore[];
        isDraw: boolean;
        allPlayers: any[];
    }
}

interface MultiplayerGameProps {
    playerName: string
    roomId: string
    playerId: string
    isHost: boolean
    onBackToLobby: () => void
    onLeave: () => void
}

const MultiplayerGame = ({
                             playerName,
                             roomId,
                             playerId,
                             isHost,
                             onBackToLobby,
                             onLeave
                         }: MultiplayerGameProps) => {
    const { startGame, endGame } = useGame()
    const { socket } = useSocket()
    const [gameEnded, setGameEnded] = useState(false)
    const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [waitingForOthers, setWaitingForOthers] = useState(false)
    const [gameResult, setGameResult] = useState<{ winners: PlayerScore[], isDraw: boolean } | null>(null)
    const [initComplete, setInitComplete] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [debugMode, setDebugMode] = useState(false)

    useEffect(() => {
        // Wenn wir keine Fragen haben, aber initComplete ist noch false
        if (questions.length === 0 && !initComplete) {
            // Prüfen, ob die Fragen im lokalen Speicher sind
            const savedQuestions = localStorage.getItem('lastGameQuestions');
            if (savedQuestions) {
                try {
                    const parsedQuestions = JSON.parse(savedQuestions);

                    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                        console.log("🛟 Loaded questions from local storage:", parsedQuestions.length);
                        setQuestions(parsedQuestions);
                        setCurrentQuestionIndex(0);
                        setInitComplete(true);
                        startGame('multiplayer', parsedQuestions);
                    }
                } catch (error) {
                    console.error("Failed to parse saved questions:", error);
                }
            }
        }
    }, [questions.length, initComplete, startGame]);

    // Primary game initialization effect
    useEffect(() => {
        if (!socket) {
            console.error("No socket connection available");
            setErrorMsg("Keine Verbindung zum Server verfügbar.");
            return;
        }

        console.log("Setting up game event listeners in MultiplayerGame");

        // CRITICALLY IMPORTANT: Handle game_started event
        const handleGameStarted = (data: GameStartedData) => {
            console.log("🎮 Game started event received:", data);

            // Defensive validation
            if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
                console.error("❌ Invalid data in game_started event:", data);

                // Versuche aus dem lokalen Speicher zu laden
                const savedQuestions = localStorage.getItem('lastGameQuestions');
                if (savedQuestions) {
                    try {
                        const parsedQuestions = JSON.parse(savedQuestions);
                        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                            console.log("🆘 Using saved questions as fallback:", parsedQuestions.length);
                            setQuestions(parsedQuestions);
                            setCurrentQuestionIndex(0);
                            setInitComplete(true);
                            setErrorMsg(null);
                            startGame('multiplayer', parsedQuestions);
                            return;
                        }
                    } catch (error) {
                        console.error("Failed to parse saved questions:", error);
                    }
                }

                setErrorMsg("Ungültige Spielstart-Daten empfangen. Bitte Spiel neu starten.");
                return;
            }

            console.log(`✅ Successfully received ${data.questions.length} questions`);

            // Speichere die Fragen im lokalen Speicher für Notfälle
            localStorage.setItem('lastGameQuestions', JSON.stringify(data.questions));

            // Ensure we set these in the correct order
            setQuestions(data.questions);
            setCurrentQuestionIndex(0);
            setInitComplete(true);
            setErrorMsg(null);

            // Start the game in context
            startGame('multiplayer', data.questions);
        };

        // Function for other events
        const setupOtherEventListeners = () => {
            // Handle player answered event
            socket.on('player_answered', (data: any) => {
                console.log("Player answered:", data);
                setPlayerScores(prev => {
                    const updated = [...prev];
                    const playerIndex = updated.findIndex(p => p.id === data.playerId);

                    if (playerIndex >= 0) {
                        updated[playerIndex].score = data.newScore;
                    } else {
                        updated.push({
                            id: data.playerId,
                            name: data.playerName,
                            score: data.newScore
                        });
                    }

                    return updated;
                });
            });

            // Handle all players answered event
            socket.on('all_players_answered', (data: AllPlayersAnsweredData) => {
                console.log("All players answered question", data.questionIndex);
                setPlayerScores(data.playerScores);
                setWaitingForOthers(false);

                // If this was the last question, end the game
                if (data.questionIndex >= questions.length - 1) {
                    console.log("Last question answered, preparing to end game");
                    if (isHost) {
                        setTimeout(() => {
                            console.log("Host ending the game after final question");
                            socket.emit('end_game', { roomId });
                        }, 2000);
                    }
                }
            });

            // Handle move to next question event
            socket.on('move_to_next_question', (data: { nextQuestionIndex: number }) => {
                console.log("Moving to next question:", data.nextQuestionIndex);
                setCurrentQuestionIndex(data.nextQuestionIndex);
                setWaitingForOthers(false);
            });

            // Handle game ended event
            socket.on('game_ended', (data: GameEndedData) => {
                console.log("Game ended with results:", data);
                setGameEnded(true);

                if (data && data.results) {
                    setPlayerScores(data.results.playerScores || []);
                    setGameResult({
                        winners: data.results.winners || [],
                        isDraw: data.results.isDraw || false
                    });

                    // Determine the result for the local player
                    const isWinner = data.results.winners?.some((w: PlayerScore) => w.id === playerId);
                    let result: 'win' | 'loss' | 'draw' = 'draw';

                    if (data.results.isDraw) {
                        result = 'draw';
                    } else if (isWinner) {
                        result = 'win';
                    } else {
                        result = 'loss';
                    }

                    // Update local game state
                    endGame(result);
                }
            });

            // Handle socket errors
            socket.on('error', (data: { message: string }) => {
                console.error("Socket error:", data);
                setErrorMsg(data.message || "Ein Fehler ist aufgetreten");
            });
        };

        // Register all event listeners
        socket.on('game_started', handleGameStarted);
        setupOtherEventListeners();

        // Try to reconnect to an existing game if we're returning to this component
        if (!initComplete && questions.length === 0) {
            console.log("Checking for existing game in room:", roomId);
            socket.emit('check_game_status', { roomId });
        }

        // Cleanup function
        return () => {
            console.log("Cleaning up all game event listeners");
            socket.off('game_started', handleGameStarted);
            socket.off('player_answered');
            socket.off('all_players_answered');
            socket.off('move_to_next_question');
            socket.off('game_ended');
            socket.off('error');
        };
    }, [socket, startGame, endGame, playerId, roomId, isHost, questions.length, initComplete]);

    // Effect to handle auto-timeout for ending the game
    useEffect(() => {
        if (initComplete && questions.length > 0 && currentQuestionIndex >= questions.length - 1 && !gameEnded) {
            const timer = setTimeout(() => {
                if (isHost && socket) {
                    console.log("Auto-ending game after timeout");
                    socket.emit('end_game', { roomId });
                }
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [questions.length, currentQuestionIndex, gameEnded, isHost, socket, roomId, initComplete]);

    // Handle answering a question
    const handleAnswerQuestion = (questionIndex: number, answer: number) => {
        if (!socket || !initComplete) return;

        console.log("Sending answer to server:", { roomId, playerId, questionIndex, answer });
        socket.emit('answer_question', {
            roomId,
            playerId,
            questionIndex,
            answer
        });

        setWaitingForOthers(true);
    };

    // Handle moving to the next question (host only)
    const handleNextQuestion = () => {
        if (!socket || !isHost || !initComplete) return;

        console.log("Host moving to next question from index", currentQuestionIndex);
        socket.emit('next_question', {
            roomId,
            questionIndex: currentQuestionIndex
        });
    };

    // Handle ending the game
    const handleEndGame = () => {
        if (!socket) return;

        console.log("User requested to end the game");
        socket.emit('end_game', { roomId });
    };

    // Handle leaving the game
    const handleLeaveGame = () => {
        if (socket) {
            console.log("Leaving game/room");
            socket.emit('leave_room', { roomId, playerId });
        }
        onLeave();
    };

    // Handle force refreshing game state
    const handleForceRefresh = () => {
        if (!socket) return;

        console.log("Force refreshing game state");
        socket.emit('check_game_status', { roomId, playerId });

        // Let server know we're having problems
        socket.emit('debug_request', {
            roomId,
            playerId,
            status: {
                initComplete,
                questionsCount: questions.length,
                currentIndex: currentQuestionIndex
            }
        });
    };

    // Calculate the current player's score
    const currentPlayerScore = playerScores.find(p => p.id === playerId)?.score || 0;

    // Calculate opponent scores
    const opponentScores = playerScores.filter(p => p.id !== playerId);

    // Compute current game state for logging
    const gameStatus = {
        initComplete,
        questionsLength: questions.length,
        currentQuestionIndex,
        waitingForOthers,
        gameEnded
    };

    if (debugMode) {
        console.log("Game state:", gameStatus);
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

                    {/* Debug Information */}
                    {debugMode && (
                        <Card className="bg-gray-800 p-4 text-xs font-mono">
                            <div className="overflow-auto max-h-40">
                                <pre>{JSON.stringify({
                                    initComplete,
                                    questionsLength: questions.length,
                                    currentIndex: currentQuestionIndex,
                                    waitingForOthers,
                                    isHost,
                                    firstQuestion: questions[0] ?
                                        { id: questions[0].id, question: questions[0].question } :
                                        null
                                }, null, 2)}</pre>
                            </div>
                        </Card>
                    )}

                    {/* Error Message */}
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
                                <Button variant="secondary" size="sm" onClick={() => setErrorMsg(null)}>
                                    Schließen
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Main Game Content */}
                    {initComplete && questions.length > 0 && currentQuestionIndex < questions.length ? (
                        <div>
                            <div className="mb-4 flex justify-between items-center">
                                <div>
                                    <span className="text-sm font-medium text-violet-300">Frage</span>
                                    <h2 className="text-xl font-bold">
                                        {currentQuestionIndex + 1} / {questions.length}
                                    </h2>
                                </div>
                            </div>

                            <QuestionCard
                                question={questions[currentQuestionIndex]}
                                onAnswer={(answer) => handleAnswerQuestion(currentQuestionIndex, answer)}
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
                                    <h3 className="text-xl font-bold mb-4">Spiel wird initialisiert...</h3>
                                    <p className="mb-6">
                                        Warte auf Daten vom Server... {questions.length > 0 ?
                                        `(${questions.length} Fragen empfangen)` : ''}
                                    </p>

                                    <Button variant="secondary" onClick={handleForceRefresh}>
                                        Status aktualisieren
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold mb-4">Alle Fragen beantwortet!</h3>
                                    <p className="mb-6">Warte auf die anderen Spieler...</p>
                                    <Button variant="primary" onClick={handleEndGame}>
                                        Spiel beenden
                                    </Button>
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
                                        <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded-full">
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
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">🤝</div>
                                <h3 className="text-xl font-bold text-blue-400">Unentschieden!</h3>
                            </motion.div>
                        ) : gameResult?.winners.some(w => w.id === playerId) ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">🏆</div>
                                <h3 className="text-xl font-bold text-green-400">Du hast gewonnen!</h3>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">😢</div>
                                <h3 className="text-xl font-bold text-orange-400">Du hast verloren</h3>
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
    )
}

export default MultiplayerGame