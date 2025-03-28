import {motion} from 'framer-motion'
import Card from '../ui/Card'
import Button from '../ui/Button'

interface GameResultProps {
    score: number
    totalQuestions: number
    onRestart: () => void
    onBackToHome: () => void
}

const GameResult = ({score, totalQuestions, onRestart, onBackToHome}: GameResultProps) => {
    const percentage = Math.round((score / totalQuestions) * 100)
    const isGoodResult = percentage >= 60

    return (
        <Card className="text-center">
            <h2 className="text-2xl font-bold mb-4">Spielergebnis</h2>

            <motion.div
                initial={{scale: 0.8, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                transition={{delay: 0.3, duration: 0.5}}
                className="mb-6"
            >
                {isGoodResult ? (
                    <div className="text-4xl mb-2">🏆</div>
                ) : (
                    <div className="text-4xl mb-2">🤔</div>
                )}

                <div className="text-3xl font-bold mb-1">
                    {score} / {totalQuestions}
                </div>

                <div className="text-lg text-violet-300">
                    {percentage}% richtig
                </div>
            </motion.div>

            <div className="mb-6">
                <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${
                            isGoodResult
                                ? 'bg-gradient-to-r from-green-400 to-teal-500'
                                : 'bg-gradient-to-r from-orange-400 to-amber-500'
                        }`}
                        initial={{width: 0}}
                        animate={{width: `${percentage}%`}}
                        transition={{delay: 0.5, duration: 0.8}}
                    />
                </div>
            </div>

            <p className="mb-6">
                {isGoodResult
                    ? 'Großartig! Du hast ein ausgezeichnetes Ergebnis erzielt.'
                    : 'Nicht schlecht, aber du kannst dich noch verbessern.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={onRestart} variant="primary">
                    Neues Spiel
                </Button>
                <Button onClick={onBackToHome} variant="outline">
                    Zurück zur Startseite
                </Button>
            </div>
        </Card>
    )
}

export default GameResult