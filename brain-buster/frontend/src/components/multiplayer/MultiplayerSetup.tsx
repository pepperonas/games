import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Card from '../ui/Card'
import Button from '../ui/Button'

interface MultiplayerSetupProps {
    onConnect: (playerName: string, roomId: string, isHost: boolean) => void
}

const MultiplayerSetup = ({ onConnect }: MultiplayerSetupProps) => {
    const [playerName, setPlayerName] = useState('')
    const [roomId, setRoomId] = useState('')
    const [setupMode, setSetupMode] = useState<'create' | 'join' | null>(null)

    // Spielraum erstellen
    const handleCreateRoom = () => {
        setSetupMode('create')
        // Generiere eine zufällige Raum-ID
        setRoomId(uuidv4().slice(0, 8))
    }

    // Spielraum beitreten
    const handleJoinRoom = () => {
        setSetupMode('join')
    }

    // Verbindung herstellen
    const handleConnect = () => {
        if (!playerName.trim()) {
            alert('Bitte gib deinen Namen ein')
            return
        }

        if (setupMode === 'join' && !roomId.trim()) {
            alert('Bitte gib eine Raum-ID ein')
            return
        }

        onConnect(playerName, roomId, setupMode === 'create')
    }

    return (
        <Card>
            <h2 className="text-xl font-bold mb-6">Multiplayer-Setup</h2>

            {!setupMode ? (
                <div className="space-y-4">
                    <p className="text-gray-300 mb-6">
                        Erstelle einen neuen Spielraum oder tritt einem bestehenden bei.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button fullWidth variant="primary" onClick={handleCreateRoom}>
                            Raum erstellen
                        </Button>
                        <Button fullWidth variant="secondary" onClick={handleJoinRoom}>
                            Raum beitreten
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="mb-4">
                        <label htmlFor="playerName" className="block text-sm font-medium mb-1">
                            Dein Name
                        </label>
                        <input
                            id="playerName"
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Gib deinen Namen ein"
                        />
                    </div>

                    {setupMode === 'join' ? (
                        <div className="mb-4">
                            <label htmlFor="roomId" className="block text-sm font-medium mb-1">
                                Raum-ID
                            </label>
                            <input
                                id="roomId"
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                placeholder="Gib die Raum-ID ein"
                            />
                        </div>
                    ) : (
                        <div className="mb-4">
                            <label htmlFor="roomId" className="block text-sm font-medium mb-1">
                                Raum-ID (zum Teilen)
                            </label>
                            <div className="flex">
                                <input
                                    id="roomId"
                                    type="text"
                                    value={roomId}
                                    readOnly
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-l-lg focus:outline-none"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(roomId)
                                        alert('Raum-ID kopiert!')
                                    }}
                                    className="bg-violet-600 px-4 rounded-r-lg hover:bg-violet-700"
                                    aria-label="Raum-ID kopieren"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setSetupMode(null)}>
                            Zurück
                        </Button>
                        <Button variant="primary" onClick={handleConnect}>
                            Verbinden
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    )
}

export default MultiplayerSetup