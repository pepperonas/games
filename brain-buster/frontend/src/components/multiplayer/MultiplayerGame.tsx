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

    // Initialize game with socket events
    useEffect(() => {
        if (!socket) return;

        // Handle game started event
        const handleGameStarted = (data: { questions: Question[] }) => {
            setQuestions(data.questions);
            startGame('multiplayer', data.questions);
        };

        // Handle player answered event
        const handlePlayerAnswered = (data: {
            playerId: string,
            playerName: string,
            questionIndex: number,
            isCorrect: boolean,
            newScore: number
        }) => {
            // Update player scores
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
        };

        // Handle all players answered event
        const handleAllPlayersAnswered = (data: {
            questionIndex: number,
            playerScores: PlayerScore[]
        }) => {
            setPlayerScores(data.playerScores);
            setWaitingForOthers(false);

            // If this is the last question, automatically end the game
            if (currentQuestionIndex >= questions.length - 1) {
                if (isHost) {
                    socket.emit('end_game', { roomId });
                }
            }
        };

        // Handle move to next question event
        const handleMoveToNextQuestion = (data: { nextQuestionIndex: number }) => {
            setCurrentQuestionIndex(data.nextQuestionIndex);
            setWaitingForOthers(false);
        };

        // Handle game ended event
        const handleGameEnded = (data: {
            results: {
                playerScores: PlayerScore[],
                winners: PlayerScore[],
                isDraw: boolean
            }
        }) => {
            setGameEnded(true);
            setPlayerScores(data.results.playerScores);
            setGameResult({
                winners: data.results.winners,
                isDraw: data.results.isDraw
            });

            // Determine the result for the local player
            const isWinner = data.results.winners.some(w => w.id === playerId);

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
        };

        // Listen for events
        socket.on('game_started', handleGameStarted);
        socket.on('player_answered', handlePlayerAnswered);
        socket.on('all_players_answered', handleAllPlayersAnswered);
        socket.on('move_to_next_question', handleMoveToNextQuestion);
        socket.on('game_ended', handleGameEnded);

        // Cleanup
        return () => {
            socket.off('game_started', handleGameStarted);
            socket.off('player_answered', handlePlayerAnswered);
            socket.off('all_players_answered', handleAllPlayersAnswered);
            socket.off('move_to_next_question', handleMoveToNextQuestion);
            socket.off('game_ended', handleGameEnded);
        };
    }, [socket, startGame, endGame, playerId, isHost, roomId, questions.length, currentQuestionIndex]);

    // Function to handle answering a question
    const handleAnswerQuestion = (questionIndex: number, answer: number) => {
        if (!socket) return;

        socket.emit('answer_question', {
            roomId,
            playerId,
            questionIndex,
            answer
        });

        setWaitingForOthers(true);
    };

    // Function to handle moving to the next question
    const handleNextQuestion = () => {
        if (!socket || !isHost) return;

        socket.emit('next_question', {
            roomId,
            questionIndex: currentQuestionIndex
        });
    };

    // Function to handle ending the game
    const handleEndGame = () => {
        if (!socket || !isHost) return;

        socket.emit('end_game', { roomId });
    };

    // Function to leave the game
    const handleLeaveGame = () => {
        if (socket) {
            socket.emit('leave_room', { roomId, playerId });
        }
        onLeave();
    };

    // Calculate the current player's score
    const currentPlayerScore = playerScores.find(p => p.id === playerId)?.score || 0;

    // Calculate opponent scores
    const opponentScores = playerScores.filter(p => p.id !== playerId);

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

                                <div className="text-right">
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

                    {questions.length > 0 && currentQuestionIndex < questions.length ? (
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
                            <h3 className="text-xl font-bold mb-4">Alle Fragen beantwortet!</h3>
                            <p className="mb-6">Warte auf die anderen Spieler...</p>
                            {isHost && (
                                <Button variant="primary" onClick={handleEndGame}>
                                    Spiel beenden
                                </Button>
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