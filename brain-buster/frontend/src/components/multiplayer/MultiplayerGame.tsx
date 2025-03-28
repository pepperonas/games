import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'
import Button from '../ui/Button'
import QuestionCard from '../game/QuestionCard'
import { useGame } from '../../store/GameContext'
import { sampleQuestions } from '../../utils/sampleData'

interface MultiplayerGameProps {
    playerName: string
    roomId: string
    isHost: boolean  // Korrekte Schreibweise mit großem 'H'
    onBackToLobby: () => void
    onLeave: () => void
}

const MultiplayerGame = ({
                             playerName,
                             roomId,
                             isHost,  // Korrekte Schreibweise mit großem 'H'
                             onBackToLobby,
                             onLeave
                         }: MultiplayerGameProps) => {
    // Sichere Verwendung des useGame hooks mit Fehlerbehandlung
    const gameContext = useGame()

    // Überprüfung, ob der gameContext korrekt initialisiert wurde
    if (!gameContext) {
        return (
            <Card className="p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Fehler beim Laden des Spielkontexts</h2>
                    <p className="mb-4">Bitte starten Sie die Anwendung neu oder kehren Sie zur Startseite zurück.</p>
                    <Button variant="outline" onClick={onLeave}>
                        Zurück zur Startseite
                    </Button>
                </div>
            </Card>
        )
    }

    // Destrukturiere erst nach der Überprüfung
    const { state, startGame, endGame } = gameContext
    const [gameEnded, setGameEnded] = useState(false)

    // Spiel initialisieren
    useEffect(() => {
        // Zufällige Fragen auswählen (in einem echten Spiel würden diese vom Host an alle gesendet)
        const questions = [...sampleQuestions]
            .sort(() => Math.random() - 0.5)
            .slice(0, 5)

        startGame('multiplayer', questions)

        // Simuliere das Antworten des Gegners (nur für Demo)
        const opponentInterval = setInterval(() => {
            // Zufällige Punktzahl für den Gegner
            const randomScore = Math.floor(Math.random() * 2)

            // In einem echten Spiel würde hier die Punktzahl des Gegners empfangen werden
            console.log('Gegner hat geantwortet, Punktzahl:', randomScore)
        }, 3000)

        return () => clearInterval(opponentInterval)
    }, [startGame])

    // Spiel beenden
    const handleEndGame = () => {
        setGameEnded(true)

        // Bestimme das Ergebnis basierend auf den Punktzahlen
        const playerScore = state.currentSession?.score || 0
        const opponentScore = state.multiplayer.opponentScore

        let result: 'win' | 'loss' | 'draw' = 'draw'

        if (playerScore > opponentScore) {
            result = 'win'
        } else if (playerScore < opponentScore) {
            result = 'loss'
        }

        endGame(result)
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

                                <div className="text-right">
                                    <Button variant="outline" size="sm" onClick={onLeave}>
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
                                    {state.currentSession?.score || 0}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="text-lg mr-2">👤</div>
                                    <div>
                                        <div className="font-medium">Computer-Gegner</div>
                                        <div className="text-sm text-violet-300">Gegner</div>
                                    </div>
                                </div>

                                <div className="text-xl font-bold">
                                    {state.multiplayer.opponentScore}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {state.gameStatus === 'playing' && state.currentQuestionIndex < state.questions.length && (
                        <QuestionCard
                            question={state.questions[state.currentQuestionIndex]}
                            onNext={() => {}}
                        />
                    )}

                    {state.gameStatus === 'playing' && state.currentQuestionIndex >= state.questions.length && (
                        <Card className="text-center p-6">
                            <h3 className="text-xl font-bold mb-4">Alle Fragen beantwortet!</h3>
                            <p className="mb-6">Warte auf deinen Gegner...</p>
                            <Button variant="primary" onClick={handleEndGame}>
                                Spiel beenden
                            </Button>
                        </Card>
                    )}
                </div>
            ) : (
                <Card className="text-center p-6">
                    <h2 className="text-2xl font-bold mb-6">Spielergebnis</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white/5 p-4 rounded-lg">
                            <div className="text-lg mb-1">{playerName}</div>
                            <div className="text-3xl font-bold">{state.currentSession?.score || 0}</div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-lg">
                            <div className="text-lg mb-1">Computer-Gegner</div>
                            <div className="text-3xl font-bold">{state.multiplayer.opponentScore}</div>
                        </div>
                    </div>

                    <div className="mb-8">
                        {state.currentSession?.result === 'win' && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">🏆</div>
                                <h3 className="text-xl font-bold text-green-400">Du hast gewonnen!</h3>
                            </motion.div>
                        )}

                        {state.currentSession?.result === 'loss' && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">😢</div>
                                <h3 className="text-xl font-bold text-orange-400">Du hast verloren</h3>
                            </motion.div>
                        )}

                        {state.currentSession?.result === 'draw' && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">🤝</div>
                                <h3 className="text-xl font-bold text-blue-400">Unentschieden!</h3>
                            </motion.div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="primary" onClick={onBackToLobby}>
                            Zurück zur Lobby
                        </Button>
                        <Button variant="outline" onClick={onLeave}>
                            Spiel verlassen
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    )
}

export default MultiplayerGame