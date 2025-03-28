import {motion} from 'framer-motion'
import Card from '../ui/Card'
import {GameStats} from '../../types'

interface StatsOverviewProps {
    stats: GameStats
}

const StatsOverview = ({stats}: StatsOverviewProps) => {
    const correctPercentage = stats.totalQuestions > 0
        ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
        : 0

    const winRate = stats.totalGames > 0
        ? Math.round((stats.wins / stats.totalGames) * 100)
        : 0

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <div className="text-sm text-violet-300 mb-1">Gespielte Spiele</div>
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{duration: 0.5}}
                        className="text-3xl font-bold"
                    >
                        {stats.totalGames}
                    </motion.div>
                </Card>

                <Card className="text-center">
                    <div className="text-sm text-violet-300 mb-1">Siege</div>
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{duration: 0.5, delay: 0.1}}
                        className="text-3xl font-bold text-green-400"
                    >
                        {stats.wins}
                    </motion.div>
                </Card>

                <Card className="text-center">
                    <div className="text-sm text-violet-300 mb-1">Niederlagen</div>
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{duration: 0.5, delay: 0.2}}
                        className="text-3xl font-bold text-red-400"
                    >
                        {stats.losses}
                    </motion.div>
                </Card>

                <Card className="text-center">
                    <div className="text-sm text-violet-300 mb-1">Siegrate</div>
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{duration: 0.5, delay: 0.3}}
                        className="text-3xl font-bold"
                    >
                        {winRate}%
                    </motion.div>
                </Card>
            </div>

            <Card>
                <h2 className="text-xl font-bold mb-4">Fragen-Statistiken</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                        <div className="text-sm text-violet-300 mb-1">Beantwortete Fragen</div>
                        <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                    </div>

                    <div className="text-center">
                        <div className="text-sm text-violet-300 mb-1">Richtige Antworten</div>
                        <div
                            className="text-2xl font-bold text-green-400">{stats.correctAnswers}</div>
                    </div>

                    <div className="text-center">
                        <div className="text-sm text-violet-300 mb-1">Falsche Antworten</div>
                        <div
                            className="text-2xl font-bold text-red-400">{stats.incorrectAnswers}</div>
                    </div>
                </div>

                <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Genauigkeit</span>
                        <span className="text-sm font-medium">{correctPercentage}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                            initial={{width: 0}}
                            animate={{width: `${correctPercentage}%`}}
                            transition={{duration: 1, delay: 0.5}}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold mb-4">Schwierigkeitsgrade</h2>

                <div className="space-y-4">
                    {Object.entries(stats.difficulty).map(([level, data]) => {
                        const accuracy = data.total > 0
                            ? Math.round((data.correct / data.total) * 100)
                            : 0

                        return (
                            <div key={level}>
                                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">
                    {level === 'easy'
                        ? 'Leicht'
                        : level === 'medium'
                            ? 'Mittel'
                            : 'Schwer'}
                  </span>
                                    <span className="text-sm font-medium">{data.total} Fragen</span>
                                </div>
                                <div
                                    className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${
                                            level === 'easy'
                                                ? 'bg-green-500'
                                                : level === 'medium'
                                                    ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                        }`}
                                        initial={{width: 0}}
                                        animate={{width: `${accuracy}%`}}
                                        transition={{duration: 1, delay: 0.2}}
                                    />
                                </div>
                                <div className="text-right text-xs mt-1">{accuracy}% richtig</div>
                            </div>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}

export default StatsOverview