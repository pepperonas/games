import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card' // Card-Komponente importieren für Fallback
import { useGame } from '../store/GameContext'
import MultiplayerSetup from '../components/multiplayer/MultiplayerSetup'
import MultiplayerLobby from '../components/multiplayer/MultiplayerLobby'
import MultiplayerGame from '../components/multiplayer/MultiplayerGame'

// Multiplayer-Status-Typen
type MultiplayerStatus = 'setup' | 'lobby' | 'playing' | 'result'

const MultiplayerPage = () => {
    // Sichere Verwendung des useGame hooks mit Fehlerbehandlung
    const gameContext = useGame()

    // Überprüfung, ob der gameContext korrekt initialisiert wurde
    if (!gameContext) {
        return (
            <Card>
                <div className="text-center py-8">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Fehler beim Laden des Spielkontexts</h2>
                    <p>Bitte starten Sie die Anwendung neu oder kehren Sie zur Startseite zurück.</p>
                </div>
            </Card>
        )
    }

    // Destrukturiere erst nach der Überprüfung
    const { resetGame } = gameContext

    const [status, setStatus] = useState<MultiplayerStatus>('setup')
    const [playerName, setPlayerName] = useState('')
    const [roomId, setRoomId] = useState('')
    const [isHost, setIsHost] = useState(false)

    // Status auf Setup zurücksetzen, wenn das Component unmounted wird
    useEffect(() => {
        return () => {
            resetGame()
        }
    }, [resetGame])

    // Verbindung zum Multiplayer-Server herstellen
    const connectToServer = (name: string, room: string, host: boolean) => {
        setPlayerName(name)
        setRoomId(room)
        setIsHost(host)
        setStatus('lobby')

        // Hier würde die Verbindung zum WebRTC-Server aufgebaut werden
        // Für diese Demo simulieren wir die Verbindung
        console.log(`Verbinde als ${host ? 'Host' : 'Gast'} mit Namen ${name} zum Raum ${room}`)
    }

    // Spiel starten (nur für Host)
    const startGame = () => {
        setStatus('playing')

        // Hier würde das Signal zum Spielstart an alle Spieler gesendet werden
        console.log('Starte Multiplayer-Spiel')
    }

    // Zurück zur Lobby
    const backToLobby = () => {
        setStatus('lobby')
        resetGame()
    }

    // Spiel verlassen
    const leaveGame = () => {
        setStatus('setup')
        setPlayerName('')
        setRoomId('')
        setIsHost(false)
        resetGame()

        // Hier würde die Verbindung zum WebRTC-Server getrennt werden
        console.log('Verlasse Multiplayer-Spiel')
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Multiplayer-Modus</h1>

            {status === 'setup' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <MultiplayerSetup onConnect={connectToServer} />
                </motion.div>
            )}

            {status === 'lobby' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <MultiplayerLobby
                        playerName={playerName}
                        roomId={roomId}
                        isHost={isHost}
                        onStart={startGame}
                        onLeave={leaveGame}
                    />
                </motion.div>
            )}

            {status === 'playing' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <MultiplayerGame
                        playerName={playerName}
                        roomId={roomId}
                        isHost={isHost}
                        onBackToLobby={backToLobby}
                        onLeave={leaveGame}
                    />
                </motion.div>
            )}
        </div>
    )
}

export default MultiplayerPage