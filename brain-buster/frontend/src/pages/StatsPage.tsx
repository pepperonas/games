import { useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useGame } from '../store/GameContext'
import StatsOverview from '../components/stats/StatsOverview'
import GameHistory from '../components/stats/GameHistory'
import CategoryStats from '../components/stats/CategoryStats'

const StatsPage = () => {
    const { state, exportGameStats, importGameStats } = useGame()
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'categories'>('overview')
    const [importError, setImportError] = useState<string | null>(null)

    // Spielstatistiken exportieren
    const handleExportStats = async () => {
        try {
            const statsData = await exportGameStats()

            // Erstelle einen Blob und einen Download-Link
            const blob = new Blob([statsData], { type: 'application/json' })
            const url = URL.createObjectURL(blob)

            // Download-Link erstellen und klicken
            const a = document.createElement('a')
            a.href = url
            a.download = 'brainbuster_stats.json'
            document.body.appendChild(a)
            a.click()

            // Bereinigen
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Fehler beim Exportieren der Statistiken:', error)
            alert('Fehler beim Exportieren der Statistiken')
        }
    }

    // Spielstatistiken importieren
    const handleImportStats = () => {
        // Erstelle ein File-Input-Element
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                const reader = new FileReader()

                reader.onload = async (event) => {
                    const content = event.target?.result as string

                    if (!content) {
                        setImportError('Fehler beim Lesen der Datei')
                        return
                    }

                    const success = await importGameStats(content)

                    if (success) {
                        alert('Statistiken erfolgreich importiert')
                        setImportError(null)
                    } else {
                        setImportError('Die Datei enthält keine gültigen Statistiken')
                    }
                }

                reader.readAsText(file)
            } catch (error) {
                console.error('Fehler beim Importieren der Statistiken:', error)
                setImportError('Fehler beim Importieren der Statistiken')
            }
        }

        input.click()
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Meine Statistiken</h1>

            <div className="mb-6">
                <Card className="p-4">
                    <div className="flex flex-wrap justify-between items-center">
                        <div className="flex space-x-4 mb-4 sm:mb-0">
                            <Button
                                variant={activeTab === 'overview' ? 'primary' : 'outline'}
                                onClick={() => setActiveTab('overview')}
                            >
                                Übersicht
                            </Button>
                            <Button
                                variant={activeTab === 'history' ? 'primary' : 'outline'}
                                onClick={() => setActiveTab('history')}
                            >
                                Verlauf
                            </Button>
                            <Button
                                variant={activeTab === 'categories' ? 'primary' : 'outline'}
                                onClick={() => setActiveTab('categories')}
                            >
                                Kategorien
                            </Button>
                        </div>

                        <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={handleExportStats}>
                                Exportieren
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleImportStats}>
                                Importieren
                            </Button>
                        </div>
                    </div>

                    {importError && (
                        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
                            {importError}
                        </div>
                    )}
                </Card>
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'overview' && <StatsOverview stats={state.stats} />}
                {activeTab === 'history' && <GameHistory history={state.stats.history} />}
                {activeTab === 'categories' && (
                    <CategoryStats categories={state.stats.categories} />
                )}
            </motion.div>
        </div>
    )
}

export default StatsPage