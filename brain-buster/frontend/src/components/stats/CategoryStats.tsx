import {useMemo} from 'react'
import {motion} from 'framer-motion'
import Card from '../ui/Card'
import {GameStats} from '../../types'

interface CategoryStatsProps {
    categories: GameStats['categories']
    // difficulty-Prop wurde entfernt, da sie nicht verwendet wird
}

const CategoryStats = ({categories}: CategoryStatsProps) => {
    // Sortiere Kategorien nach Anzahl der Fragen
    const sortedCategories = useMemo(() => {
        return Object.entries(categories)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([category, data]) => ({
                category,
                total: data.total,
                correct: data.correct,
                accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
            }))
    }, [categories])

    // Beste Kategorie
    const bestCategory = useMemo(() => {
        if (sortedCategories.length === 0) return null

        return sortedCategories
            .filter((cat) => cat.total >= 5) // Mindestens 5 Fragen
            .sort((a, b) => b.accuracy - a.accuracy)[0]
    }, [sortedCategories])

    // Schwächste Kategorie
    const worstCategory = useMemo(() => {
        if (sortedCategories.length === 0) return null

        return sortedCategories
            .filter((cat) => cat.total >= 5) // Mindestens 5 Fragen
            .sort((a, b) => a.accuracy - b.accuracy)[0]
    }, [sortedCategories])

    return (
        <div className="space-y-6">
            {sortedCategories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bestCategory && (
                        <Card className="p-4">
                            <h3 className="text-lg font-medium mb-3">Beste Kategorie</h3>
                            <div className="flex items-center mb-2">
                                <div className="text-2xl mr-2">🏆</div>
                                <div className="font-bold text-lg">{bestCategory.category}</div>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Genauigkeit</span>
                                <span className="font-medium text-green-400">
                  {Math.round(bestCategory.accuracy)}%
                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-green-500"
                                    initial={{width: 0}}
                                    animate={{width: `${bestCategory.accuracy}%`}}
                                    transition={{duration: 1}}
                                />
                            </div>
                            <div className="text-sm text-gray-400 mt-2">
                                {bestCategory.correct} von {bestCategory.total} richtig
                            </div>
                        </Card>
                    )}

                    {worstCategory && (
                        <Card className="p-4">
                            <h3 className="text-lg font-medium mb-3">Schwächste Kategorie</h3>
                            <div className="flex items-center mb-2">
                                <div className="text-2xl mr-2">📚</div>
                                <div className="font-bold text-lg">{worstCategory.category}</div>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Genauigkeit</span>
                                <span className="font-medium text-red-400">
                  {Math.round(worstCategory.accuracy)}%
                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-red-500"
                                    initial={{width: 0}}
                                    animate={{width: `${worstCategory.accuracy}%`}}
                                    transition={{duration: 1}}
                                />
                            </div>
                            <div className="text-sm text-gray-400 mt-2">
                                {worstCategory.correct} von {worstCategory.total} richtig
                            </div>
                        </Card>
                    )}
                </div>
            )}

            <Card>
                <h3 className="text-lg font-medium mb-4">Kategorien im Überblick</h3>

                {sortedCategories.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                        Keine Kategorie-Daten verfügbar
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedCategories.map((item, index) => (
                            <motion.div
                                key={item.category}
                                initial={{opacity: 0, y: 10}}
                                animate={{opacity: 1, y: 0}}
                                transition={{duration: 0.3, delay: index * 0.05}}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">{item.category}</span>
                                    <span>
                    {item.correct} / {item.total} ({Math.round(item.accuracy)}%)
                  </span>
                                </div>
                                <div
                                    className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                                        initial={{width: 0}}
                                        animate={{width: `${item.accuracy}%`}}
                                        transition={{duration: 0.8}}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default CategoryStats