import {useEffect, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {useNavigate} from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import QuestionCard from '../components/game/QuestionCard'
import GameResult from '../components/game/GameResult'
import {useGame} from '../store/GameContext'

const GamePage = () => {
    const navigate = useNavigate()
    const {state, startGame, resetGame} = useGame()
    const [countdownValue, setCountdownValue] = useState(3)
    const [isCountingDown, setIsCountingDown] = useState(false)
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
    const [difficultyFilter, setDifficultyFilter] = useState<'easy' | 'medium' | 'hard' | null>(null)

    // Debug state values
    useEffect(() => {
        console.log('GamePage state:', state);
        console.log('Questions available:', state.questions.length);
        console.log('Current question index:', state.currentQuestionIndex);
        console.log('Game status:', state.gameStatus);
    }, [state]);

    // Spiel starten
    const handleStartGame = () => {
        setIsCountingDown(true)

        // Countdown starten
        const countdownInterval = setInterval(() => {
            setCountdownValue((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval)

                    // Nach dem Countdown das Spiel starten
                    let filteredQuestions = [...state.questions]

                    // Filtern nach Kategorie
                    if (categoryFilter) {
                        filteredQuestions = filteredQuestions.filter((q) => q.category === categoryFilter)
                    }

                    // Filtern nach Schwierigkeit
                    if (difficultyFilter) {
                        filteredQuestions = filteredQuestions.filter((q) => q.difficulty === difficultyFilter)
                    }

                    // Wenn keine Fragen übrig sind, alle Fragen verwenden
                    if (filteredQuestions.length === 0) {
                        filteredQuestions = [...state.questions]
                    }

                    // Fragen zufällig sortieren und begrenzen
                    const shuffledQuestions = filteredQuestions
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 10)

                    startGame('solo', shuffledQuestions)
                    setIsCountingDown(false)
                    return 3
                }
                return prev - 1
            })
        }, 1000)
    }

    // Spiel zurücksetzen
    const handleResetGame = () => {
        resetGame()
    }

    // Zur Startseite zurückkehren
    const handleBackToHome = () => {
        resetGame()
        navigate('/')
    }

    // Verfügbare Kategorien aus den Beispielfragen ermitteln
    const availableCategories = Array.from(
        new Set(state.questions.map((q) => q.category))
    ).sort()

    // Verfügbare Schwierigkeitsgrade
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']

    // Übersetzung der Schwierigkeitsgrade
    const difficultyTranslation = {
        easy: 'Leicht',
        medium: 'Mittel',
        hard: 'Schwer',
    }

    // Funktion, die bei "next" in der QuestionCard aufgerufen wird
    const handleNextQuestion = () => {
        // Die tatsächliche Logik für das Weiterschalten wird in QuestionCard verwaltet
        console.log('Next Question (nicht verwendet)')
    }

    return (
        <div className="max-w-3xl mx-auto">
            {state.gameStatus === 'idle' && (
                <Card className="mb-8">
                    <h1 className="text-3xl font-bold text-center mb-6">Einzelspieler-Modus</h1>

                    {!isCountingDown ? (
                        <>
                            <div className="mb-6">
                                <h2 className="text-lg font-medium mb-2">Kategorie wählen
                                    (optional)</h2>
                                <div className="flex flex-wrap gap-2">
                                    {availableCategories.map((category) => (
                                        <Button
                                            key={category}
                                            variant={categoryFilter === category ? 'primary' : 'outline'}
                                            size="sm"
                                            onClick={() => setCategoryFilter(categoryFilter === category ? null : category)}
                                        >
                                            {category}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-lg font-medium mb-2">Schwierigkeit wählen
                                    (optional)</h2>
                                <div className="flex flex-wrap gap-2">
                                    {difficulties.map((difficulty) => (
                                        <Button
                                            key={difficulty}
                                            variant={difficultyFilter === difficulty ? 'primary' : 'outline'}
                                            size="sm"
                                            onClick={() => setDifficultyFilter(difficultyFilter === difficulty ? null : difficulty)}
                                        >
                                            {difficultyTranslation[difficulty]}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center mt-6">
                                <Button size="lg" onClick={handleStartGame}>
                                    Spiel starten
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <motion.div
                                key={countdownValue}
                                initial={{scale: 0.5, opacity: 0}}
                                animate={{scale: 1, opacity: 1}}
                                exit={{scale: 1.5, opacity: 0}}
                                transition={{duration: 0.5}}
                                className="text-7xl font-bold text-violet-400"
                            >
                                {countdownValue}
                            </motion.div>
                            <p className="mt-4 text-lg">Das Spiel startet gleich...</p>
                        </div>
                    )}
                </Card>
            )}

            {state.gameStatus === 'playing' && state.currentSession && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key="question"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                        transition={{duration: 0.3}}
                    >
                        <div className="mb-4 flex justify-between items-center">
                            <div>
                                <span className="text-sm font-medium text-violet-300">Frage</span>
                                <h2 className="text-xl font-bold">
                                    {state.currentQuestionIndex + 1} / {state.questions.length}
                                </h2>
                            </div>

                            <div className="text-right">
                                <span className="text-sm font-medium text-violet-300">Punkte</span>
                                <h2 className="text-xl font-bold">{state.currentSession.score}</h2>
                            </div>
                        </div>

                        {state.currentQuestionIndex < state.questions.length && state.questions.length > 0 && (
                            <QuestionCard
                                question={state.questions[state.currentQuestionIndex]}
                                onNext={handleNextQuestion}
                            />
                        )}

                        {/* Fallback if no questions are available */}
                        {state.questions.length === 0 && (
                            <Card>
                                <div className="text-center py-6">
                                    <p className="text-lg text-red-400">Fehler: Keine Fragen
                                        verfügbar</p>
                                    <Button
                                        className="mt-4"
                                        variant="outline"
                                        onClick={handleResetGame}
                                    >
                                        Zurück zum Start
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {state.gameStatus === 'finished' && state.currentSession && (
                <motion.div
                    initial={{opacity: 0, scale: 0.9}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.5}}
                >
                    <GameResult
                        score={state.currentSession.score}
                        totalQuestions={state.currentSession.totalQuestions}
                        onRestart={handleResetGame}
                        onBackToHome={handleBackToHome}
                    />
                </motion.div>
            )}
        </div>
    )
}

export default GamePage