import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Question } from '../../types'
import { useGame } from '../../store/GameContext'

interface QuestionCardProps {
    question: Question
    onNext: () => void
}

const QuestionCard = ({ question, onNext }: QuestionCardProps) => {
    const { state, answerQuestion, nextQuestion, endGame } = useGame()
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [showResult, setShowResult] = useState(false)
    const [timeLeft, setTimeLeft] = useState(state.timePerQuestion)

    // Timer für die Frage
    useEffect(() => {
        if (showResult) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // Wenn die Zeit abgelaufen ist, wird automatisch die Antwort überprüft
                    handleCheckAnswer(-1)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [showResult])

    // Antwort auswählen
    const handleSelectAnswer = (index: number) => {
        if (showResult) return
        setSelectedAnswer(index)
    }

    // Antwort überprüfen
    const handleCheckAnswer = (answer: number) => {
        if (showResult) return

        // Antwort setzen (falls Timeout)
        if (answer >= 0) {
            setSelectedAnswer(answer)
        }

        // Antwort an den GameContext senden
        answerQuestion(selectedAnswer !== null ? selectedAnswer : -1)

        // Ergebnis anzeigen
        setShowResult(true)

        // Nach 2 Sekunden zur nächsten Frage oder zum Ende
        setTimeout(() => {
            setShowResult(false)
            setSelectedAnswer(null)

            // Wenn das die letzte Frage war, Spiel beenden
            if (state.currentQuestionIndex === state.questions.length - 1) {
                const isWin = state.currentSession && state.currentSession.score > state.currentSession.totalQuestions / 2
                endGame(isWin ? 'win' : 'loss')
            } else {
                // Sonst zur nächsten Frage
                nextQuestion()
                // onNext-Callback aufrufen, wenn vorhanden
                if (onNext) {
                    onNext()
                }
                setTimeLeft(state.timePerQuestion)
            }
        }, 2000)
    }

    // Animation für die Optionen
    const optionVariants = {
        initial: { opacity: 0, y: 10 },
        animate: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: 0.1 * i },
        }),
        selected: {
            scale: 1.02,
            backgroundColor: 'rgba(139, 92, 246, 0.3)',
            borderColor: 'rgb(139, 92, 246)',
        },
        correct: {
            backgroundColor: 'rgba(34, 197, 94, 0.3)',
            borderColor: 'rgb(34, 197, 94)'
        },
        incorrect: {
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            borderColor: 'rgb(239, 68, 68)'
        }
    }

    // Timer-Berechnung
    const timerPercentage = (timeLeft / state.timePerQuestion) * 100

    // Sicherheitscheck - falls question undefined ist
    if (!question) {
        return (
            <Card>
                <div className="text-center py-6">
                    <p className="text-lg text-red-400">Fehler: Keine Frage gefunden</p>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-violet-300">
            {question.category} • {question.difficulty === 'easy' ? 'Leicht' : question.difficulty === 'medium' ? 'Mittel' : 'Schwer'}
          </span>
                    <span className="text-sm font-medium text-violet-300">
            Zeit: {timeLeft}s
          </span>
                </div>

                {/* Timer-Balken */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                        initial={{ width: '100%' }}
                        animate={{ width: `${timerPercentage}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            <h3 className="text-xl font-bold mb-6">{question.question}</h3>

            <div className="space-y-3 mb-6">
                <AnimatePresence>
                    {question.options.map((option, index) => {
                        let optionState = {}

                        if (showResult) {
                            if (index === question.correctAnswer) {
                                optionState = optionVariants.correct
                            } else if (index === selectedAnswer && index !== question.correctAnswer) {
                                optionState = optionVariants.incorrect
                            }
                        } else if (index === selectedAnswer) {
                            optionState = optionVariants.selected
                        }

                        return (
                            <motion.div
                                key={index}
                                className="p-3 border border-white/10 rounded-lg cursor-pointer"
                                initial={optionVariants.initial}
                                animate={{ ...optionVariants.animate(index), ...optionState }}
                                variants={optionVariants}
                                whileHover={!showResult ? { scale: 1.01 } : {}}
                                onClick={() => handleSelectAnswer(index)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-6 h-6 flex items-center justify-center rounded-full border border-white/20 text-sm font-medium">
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <span>{option}</span>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={() => handleCheckAnswer(selectedAnswer || 0)}
                    disabled={selectedAnswer === null || showResult}
                >
                    Antwort überprüfen
                </Button>
            </div>
        </Card>
    )
}

export default QuestionCard