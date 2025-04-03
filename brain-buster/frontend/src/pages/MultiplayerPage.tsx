import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {motion} from 'framer-motion'
import {io, Socket} from 'socket.io-client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import {useGame} from '../store/GameContext'
import {Question} from '../types'
import QuestionCard from '../components/game/QuestionCard'

const MultiplayerPage = () => {
    const navigate = useNavigate()
    const {state, startGame, resetGame, setMultiplayerStatus, updateOpponentScore} = useGame()

    // Socket und Raum-Status
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    // Raum-Management
    const [roomId, setRoomId] = useState('')
    const [playerName, setPlayerName] = useState('Spieler')
    const [roomToJoin, setRoomToJoin] = useState('')
    const [isHost, setIsHost] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [opponentReady, setOpponentReady] = useState(false)
    const [waitingForOpponent, setWaitingForOpponent] = useState(false)

    // Spielverlauf
    const [currentRound, setCurrentRound] = useState(0)
    const [playerAnswered, setPlayerAnswered] = useState(false)
    const [opponentAnswered, setOpponentAnswered] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(20)
    const [results, setResults] = useState<{
        playerScore: number;
        opponentScore: number;
    } | null>(null)

    // Socket-Verbindung aufbauen
    useEffect(() => {
        // Socket-Verbindung nur einmal initialisieren
        if (!socket && !isConnecting) {
            setIsConnecting(true)

            // Pfad relativ zum Basis-URL der Anwendung
            const socketUrl = window.location.protocol + '//' + window.location.host
            const newSocket = io(socketUrl, {
                path: '/socket-api/socket.io',
                transports: ['websocket'],
                reconnectionAttempts: 5
            })

            newSocket.onAny((event, ...args) => {
                console.log('Socket Event:', event, args);
            });

            // Socket-Ereignisse behandeln
            newSocket.on('connect', () => {
                console.log('Verbunden mit dem Server!')
                setConnectionError(null)
                setSocket(newSocket)
                setIsConnecting(false)
                setMultiplayerStatus({connected: true})
            })

            newSocket.on('connect_error', (err) => {
                console.error('Verbindungsfehler:', err)
                setConnectionError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.')
                setIsConnecting(false)
                setMultiplayerStatus({connected: false})
            })

            newSocket.on('disconnect', () => {
                console.log('Verbindung zum Server getrennt')
                setMultiplayerStatus({connected: false})
            })

            return () => {
                newSocket.disconnect()
            }
        }
    }, [setMultiplayerStatus])

    // Raumbenachrichtigungen und Spielereignisse
    useEffect(() => {
        if (!socket) return

        // Wenn ein Raum erstellt wurde
        socket.on('room_created', (data: { roomId: string }) => {
            console.log('Raum erstellt:', data.roomId)
            setRoomId(data.roomId)
            setIsHost(true)
            setWaitingForOpponent(true)
            setMultiplayerStatus({
                connected: true,
                roomId: data.roomId
            })
        })

        // Wenn ein Spieler beigetreten ist
        socket.on('player_joined', (data: { name: string }) => {
            console.log('Spieler beigetreten:', data.name)
            setWaitingForOpponent(false)
            setOpponentReady(true)
            setMultiplayerStatus({
                connected: true,
                opponentName: data.name
            })
        })

        // Wenn dem Raum beigetreten wurde
        socket.on('joined_room', (data: { roomId: string, hostName: string }) => {
            console.log('Raum beigetreten:', data.roomId)
            setRoomId(data.roomId)
            setIsHost(false)
            setMultiplayerStatus({
                connected: true,
                roomId: data.roomId,
                opponentName: data.hostName
            })
        })

        // Wenn das Spiel gestartet wird
        socket.on('game_start', (data: { questions: Question[] }) => {
            console.log('Spiel gestartet mit', data.questions.length, 'Fragen')
            startGame('multiplayer', data.questions)
            setGameStarted(true)
            setCurrentRound(0)
            setPlayerAnswered(false)
            setOpponentAnswered(false)
        })

        // Wenn ein Spieler geantwortet hat
        socket.on('player_answered', () => {
            console.log('Gegner hat geantwortet')
            setOpponentAnswered(true)
        })

        // Wenn beide Spieler geantwortet haben oder die Zeit abgelaufen ist
        socket.on('round_complete', (data: {
            playerScore: number,
            opponentScore: number,
            nextRound: number,
            timeToNextRound: number
        }) => {
            console.log('Runde abgeschlossen, Punkte:',
                'Spieler:', data.playerScore,
                'Gegner:', data.opponentScore);

            // Wichtig: Bei Multiplayer setzen wir den Spielstand direkt aus den Server-Daten
            // Dazu müssen wir die Punktzahl im aktuellen Session-Objekt überschreiben
            if (state.currentSession) {
                // Dies erfordert eine neue Funktion im GameContext, die den Score direkt setzt
                // Falls diese nicht existiert, musst du sie implementieren
                // setSessionScore(data.playerScore);

                // Alternativ können wir den Zustand direkt manipulieren, was nicht ideal,
                // aber in diesem Fall praktikabel ist
                state.currentSession.score = data.playerScore;
            }

            // Gegnerpunkte aktualisieren
            updateOpponentScore(data.opponentScore);

            // Kurze Pause vor der nächsten Runde
            setTimeout(() => {
                setCurrentRound(data.nextRound)
                setPlayerAnswered(false)
                setOpponentAnswered(false)
            }, data.timeToNextRound)
        })

        // Timer-Update vom Server
        socket.on('timer_update', (data: { timeRemaining: number }) => {
            setTimeRemaining(data.timeRemaining)
        })

        // Wenn das Spiel beendet ist
        socket.on('game_over', (data: {
            playerScore: number,
            opponentScore: number
        }) => {
            console.log('Spiel beendet', data);

            // Finale Punktzahlen setzen
            if (state.currentSession) {
                state.currentSession.score = data.playerScore;
            }
            updateOpponentScore(data.opponentScore);

            setResults({
                playerScore: data.playerScore,
                opponentScore: data.opponentScore
            });

            // Spielergebnis für UI-Darstellung wird direkt anhand der Punktzahlen angezeigt
            // Kein explizites result-Objekt hier nötig

            // Spiel beenden und Ergebnis speichern
            resetGame()
            setGameStarted(false)
        })

        // Wenn ein Fehler auftritt (z.B. Raum existiert nicht)
        socket.on('error', (data: { message: string }) => {
            setConnectionError(data.message)
        })

        // Wenn der Gegner das Spiel verlässt
        socket.on('opponent_left', () => {
            setConnectionError('Der Gegner hat das Spiel verlassen.')
            setOpponentReady(false)
            setWaitingForOpponent(true)
            setGameStarted(false)
            resetGame()
        })

        // Bereinigung der Event-Listener beim Unmount
        return () => {
            socket.off('room_created')
            socket.off('player_joined')
            socket.off('joined_room')
            socket.off('game_start')
            socket.off('player_answered')
            socket.off('round_complete')
            socket.off('timer_update')
            socket.off('game_over')
            socket.off('error')
            socket.off('opponent_left')
        }
    }, [socket, startGame, resetGame, setMultiplayerStatus, updateOpponentScore])

    // Raum erstellen
    const createRoom = () => {
        if (!socket) return

        console.log('Sende create_room Event mit Name:', playerName);
        socket.emit('create_room', {name: playerName})
    }

    // Raum beitreten
    const joinRoom = () => {
        if (!socket || !roomToJoin) return

        socket.emit('join_room', {roomId: roomToJoin, name: playerName})
    }

    // Spiel starten (nur Host)
    const startMultiplayerGame = () => {
        if (!socket || !isHost) return

        socket.emit('start_game', {roomId})
    }

    // Antwort senden
    const handleAnswer = (answerIndex: number) => {
        if (!socket || playerAnswered) return

        console.log('Sende Antwort:', answerIndex);
        socket.emit('submit_answer', {
            roomId,
            answer: answerIndex,
            round: currentRound
        })

        setPlayerAnswered(true)
    }

    // Nächste Runde (nur Host)
    const handleNextRound = () => {
        if (!socket || !isHost) return

        socket.emit('next_round', {roomId})
    }

    // Raum verlassen
    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave_room', {roomId})
        }

        setRoomId('')
        setWaitingForOpponent(false)
        setOpponentReady(false)
        setGameStarted(false)
        resetGame()
    }

    // Zurück zur Startseite
    const handleBackToHome = () => {
        leaveRoom()
        navigate('/')
    }

    return (
        <div className="max-w-3xl mx-auto">
            {connectionError && (
                <Card className="mb-6 bg-red-500/10 border-red-500/20">
                    <div className="text-red-400 text-center">
                        <p className="font-medium">{connectionError}</p>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => setConnectionError(null)}
                        >
                            Verstanden
                        </Button>
                    </div>
                </Card>
            )}

            {!roomId && !gameStarted && (
                <Card>
                    <h1 className="text-3xl font-bold text-center mb-6">Multiplayer-Modus</h1>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-1">
                            Dein Name
                        </label>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-lg font-medium mb-3">Neues Spiel erstellen</h2>
                            <Button
                                onClick={createRoom}
                                variant="primary"
                                fullWidth
                                disabled={!socket || isConnecting || playerName.trim() === ''}
                            >
                                {isConnecting ? 'Verbinde...' : 'Spiel erstellen'}
                            </Button>
                        </div>

                        <div>
                            <h2 className="text-lg font-medium mb-3">Einem Spiel beitreten</h2>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    placeholder="Raum-ID eingeben"
                                    value={roomToJoin}
                                    onChange={(e) => setRoomToJoin(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <Button
                                    onClick={joinRoom}
                                    disabled={!socket || isConnecting || roomToJoin.trim() === '' || playerName.trim() === ''}
                                >
                                    Beitreten
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {roomId && !gameStarted && (
                <Card className="text-center">
                    <h2 className="text-2xl font-bold mb-4">
                        {waitingForOpponent ? 'Warte auf Mitspieler' : 'Bereit zum Spielen'}
                    </h2>

                    <div className="mb-6">
                        <div className="text-violet-300 mb-2">Raum-ID</div>
                        <div className="text-xl font-mono bg-white/5 p-2 rounded">
                            {roomId}
                        </div>
                        <p className="text-sm mt-2">
                            Teile diese ID mit deinem Freund, damit er beitreten kann
                        </p>
                    </div>

                    {waitingForOpponent ? (
                        <motion.div
                            animate={{rotate: 360}}
                            transition={{repeat: Infinity, duration: 2, ease: "linear"}}
                            className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"
                        />
                    ) : (
                        <div className="mb-4">
                            <div className="flex items-center justify-center space-x-4">
                                <div className="text-center">
                                    <div className="text-2xl mb-1">🎮</div>
                                    <div className="font-medium">{playerName} (Du)</div>
                                </div>
                                <div className="text-2xl">vs</div>
                                <div className="text-center">
                                    <div className="text-2xl mb-1">🎮</div>
                                    <div
                                        className="font-medium">{state.multiplayer.opponentName}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                        {isHost && opponentReady && (
                            <Button onClick={startMultiplayerGame} variant="primary">
                                Spiel starten
                            </Button>
                        )}

                        <Button onClick={leaveRoom} variant="outline">
                            Raum verlassen
                        </Button>
                    </div>
                </Card>
            )}

            {gameStarted && state.gameStatus === 'playing' && (
                <div>
                    <div className="mb-4 flex justify-between items-center">
                        <div>
                            <span className="text-sm font-medium text-violet-300">Frage</span>
                            <h2 className="text-xl font-bold">
                                {currentRound + 1} / {state.questions.length}
                            </h2>
                        </div>

                        <div className="flex space-x-8">
                            <div className="text-right">
                                <span className="text-sm font-medium text-violet-300">Du</span>
                                <h2 className="text-xl font-bold">{state.currentSession?.score || 0}</h2>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-medium text-violet-300">Gegner</span>
                                <h2 className="text-xl font-bold">{state.multiplayer.opponentScore}</h2>
                            </div>
                        </div>
                    </div>

                    {currentRound < state.questions.length && (
                        <QuestionCard
                            question={state.questions[currentRound]}
                            onAnswer={handleAnswer}
                            onNext={handleNextRound}
                            isMultiplayer={true}
                            isHost={isHost}
                            waitingForOthers={playerAnswered && !opponentAnswered}
                            timeRemaining={timeRemaining}
                        />
                    )}
                </div>
            )}

            {results && (
                <motion.div
                    initial={{opacity: 0, scale: 0.9}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.5}}
                >
                    <Card className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Spielergebnis</h2>

                        <div className="flex items-center justify-center space-x-12 mb-6">
                            <div className="text-center">
                                <div className="text-sm text-violet-300 mb-1">Du</div>
                                <div className="text-3xl font-bold">{results.playerScore}</div>
                            </div>
                            <div className="text-2xl">vs</div>
                            <div className="text-center">
                                <div className="text-sm text-violet-300 mb-1">Gegner</div>
                                <div className="text-3xl font-bold">{results.opponentScore}</div>
                            </div>
                        </div>

                        <div className="text-xl mb-6">
                            {results.playerScore > results.opponentScore ? (
                                <div className="text-green-400">Du hast gewonnen! 🏆</div>
                            ) : results.playerScore < results.opponentScore ? (
                                <div className="text-red-400">Du hast verloren</div>
                            ) : (
                                <div>Unentschieden!</div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={createRoom} variant="primary">
                                Neues Spiel
                            </Button>
                            <Button onClick={handleBackToHome} variant="outline">
                                Zurück zur Startseite
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    )
}

export default MultiplayerPage