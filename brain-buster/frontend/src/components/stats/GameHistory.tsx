import { useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'
import { GameSession } from '../../types'

interface GameHistoryProps {
    history: GameSession[]
}

const GameHistory = ({ history }: GameHistoryProps) => {
    const [filter, setFilter] = useState<'all' | 'solo' | 'multiplayer'>('all')

    // Spiele nach Filter sortieren
    const filteredGames = history
        .filter((game) => filter === 'all' || game.mode === filter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Formatiere das Datum
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date)
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Spielverlauf</h2>

                <div className="flex space-x-2">
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${
                            filter === 'all'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                        onClick={() => setFilter('all')}
                    >
                        Alle
                    </button>
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${
                            filter === 'solo'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                        onClick={() => setFilter('solo')}
                    >
                        Einzelspieler
                    </button>
                    <button
                        className={`px-3 py-1 rounded-full text-sm ${
                            filter === 'multiplayer'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/10 hover:bg-white/20'
                        }`}
                        onClick={() => setFilter('multiplayer')}
                    >
                        Mehrspieler
                    </button>
                </div>
            </div>

            {filteredGames.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    Keine Spielhistorie verfügbar
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredGames.map((game, index) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="p-3 bg-white/5 rounded-lg"
                        >
                            <div className="flex flex-wrap justify-between items-center">
                                <div>
                                    <div className="flex items-center">
                    <span
                        className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            game.result === 'win'
                                ? 'bg-green-500'
                                : game.result === 'loss'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                        }`}
                    />
                                        <span className="font-medium">
                      {game.result === 'win'
                          ? 'Sieg'
                          : game.result === 'loss'
                              ? 'Niederlage'
                              : 'Unentschieden'}
                    </span>
                                        <span className="ml-3 text-sm text-violet-300">
                      {game.mode === 'solo' ? 'Einzelspieler' : 'Mehrspieler'}
                    </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {formatDate(game.date)}
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <div className="text-center mr-6">
                                        <div className="text-xs text-violet-300">Ergebnis</div>
                                        <div className="font-medium">
                                            {game.score} / {game.totalQuestions}
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div className="text-xs text-violet-300">Genauigkeit</div>
                                        <div className="font-medium">
                                            {Math.round((game.correctAnswers / game.totalQuestions) * 100)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </Card>
    )
}

export default GameHistory