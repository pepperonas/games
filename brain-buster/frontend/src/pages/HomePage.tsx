import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const HomePage = () => {
    return (
        <div className="flex flex-col items-center justify-center space-y-10">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
            >
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-violet-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                    BrainBuster
                </h1>
                <p className="text-lg md:text-xl text-violet-200 max-w-2xl">
                    Teste dein Wissen in verschiedenen Kategorien und fordere deine Freunde im Multiplayer-Modus heraus!
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <Card className="text-center flex flex-col items-center justify-between h-full">
                    <div>
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-4xl mb-2"
                        >
                            🎮
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4 text-violet-300">Einzelspieler</h2>
                        <p className="mb-6 text-gray-300">
                            Fordere dich selbst heraus und teste dein Wissen in verschiedenen Kategorien. Verfolge deinen Fortschritt mit detaillierten Statistiken.
                        </p>
                    </div>
                    <Link to="/game">
                        <Button size="lg" variant="primary">
                            Jetzt spielen
                        </Button>
                    </Link>
                </Card>

                <Card className="text-center flex flex-col items-center justify-between h-full">
                    <div>
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="text-4xl mb-2"
                        >
                            👥
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4 text-blue-300">Multiplayer</h2>
                        <p className="mb-6 text-gray-300">
                            Tritt gegen Freunde oder zufällige Gegner in Echtzeit an. Zeige dein Wissen und erklimme die Bestenliste!
                        </p>
                    </div>
                    <Link to="/multiplayer">
                        <Button size="lg" variant="secondary">
                            Mehrspieler starten
                        </Button>
                    </Link>
                </Card>
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-wrap justify-center gap-4 mt-6"
            >
                <Link to="/stats">
                    <Button variant="outline">
                        Meine Statistiken
                    </Button>
                </Link>
                <Link to="/settings">
                    <Button variant="outline">
                        Einstellungen
                    </Button>
                </Link>
            </motion.div>
        </div>
    )
}

export default HomePage