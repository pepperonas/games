import {useState} from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import {useGame} from '../store/GameContext'

const SettingsPage = () => {
    const {state, exportGameStats, importGameStats} = useGame()
    const [playerName, setPlayerName] = useState('Spieler')
    const [timePerQuestion, setTimePerQuestion] = useState(state.timePerQuestion)
    const [darkMode, setDarkMode] = useState(true)
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)
    const [soundEnabled, setSoundEnabled] = useState(true)

    // Einstellungen speichern
    const saveSettings = () => {
        // In einer echten Anwendung würden die Einstellungen hier gespeichert werden
        alert('Einstellungen gespeichert!')
    }

    // Einstellungen zurücksetzen
    const resetSettings = () => {
        setPlayerName('Spieler')
        setTimePerQuestion(20)
        setDarkMode(true)
        setNotificationsEnabled(true)
        setSoundEnabled(true)
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Einstellungen</h1>

            <div className="space-y-6">
                <Card>
                    <h2 className="text-xl font-bold mb-4">Spieleinstellungen</h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="playerName" className="block text-sm font-medium mb-1">
                                Spielername
                            </label>
                            <input
                                id="playerName"
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="timePerQuestion"
                                   className="block text-sm font-medium mb-1">
                                Zeit pro Frage (Sekunden)
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    id="timePerQuestion"
                                    type="range"
                                    min="5"
                                    max="60"
                                    step="5"
                                    value={timePerQuestion}
                                    onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                                    className="w-full"
                                />
                                <span className="w-12 text-center">{timePerQuestion}s</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-xl font-bold mb-4">App-Einstellungen</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Dunkler Modus</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={darkMode}
                                    onChange={() => setDarkMode(!darkMode)}
                                />
                                <div
                                    className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <span>Benachrichtigungen</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={notificationsEnabled}
                                    onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                                />
                                <div
                                    className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <span>Sound-Effekte</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={soundEnabled}
                                    onChange={() => setSoundEnabled(!soundEnabled)}
                                />
                                <div
                                    className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                            </label>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-xl font-bold mb-4">Spielverlauf</h2>

                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <Button onClick={() => exportGameStats()}>Verlauf exportieren</Button>
                            <Button onClick={() => importGameStats('')} variant="outline">
                                Verlauf importieren
                            </Button>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                            <Button variant="danger"
                                    onClick={() => confirm('Wirklich alle Statistiken löschen?')}>
                                Alle Statistiken zurücksetzen
                            </Button>
                            <p className="text-sm text-gray-400 mt-2">
                                Dies löscht alle deine Spielstatistiken und kann nicht rückgängig
                                gemacht werden.
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-between">
                    <Button variant="primary" onClick={saveSettings}>
                        Einstellungen speichern
                    </Button>
                    <Button variant="outline" onClick={resetSettings}>
                        Auf Standard zurücksetzen
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage