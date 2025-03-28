import {useEffect, useState} from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'

interface MultiplayerLobbyProps {
    playerName: string
    roomId: string
    isHost: boolean
    onStart: () => void
    onLeave: () => void
}

const MultiplayerLobby = ({
                              playerName,
                              roomId,
                              isHost,
                              onStart,
                              onLeave
                          }: MultiplayerLobbyProps) => {
    const [players, setPlayers] = useState<string[]>([playerName])
    const [isReady, setIsReady] = useState(false)

    // Simuliere das Beitreten eines weiteren Spielers (nur für Demo)
    useEffect(() => {
        if (!isHost || players.length > 1) return

        const timer = setTimeout(() => {
            setPlayers((prev) => [...prev, 'Computer-Gegner'])
        }, 2000)

        return () => clearTimeout(timer)
    }, [isHost, players])

    // Bereit-Status umschalten
    const toggleReady = () => {
        setIsReady(!isReady)
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Lobby: {roomId}</h2>
                <Button variant="outline" size="sm" onClick={onLeave}>
                    Verlassen
                </Button>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Spieler</h3>
                <div className="space-y-2">
                    {players.map((player, index) => (
                        <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-white/5 rounded-lg"
                        >
                            <div className="flex items-center">
                                <div className="text-lg mr-2">👤</div>
                                <div>
                                    {player}
                                    {index === 0 && isHost && (
                                        <span
                                            className="ml-2 text-xs bg-violet-600 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                                    )}
                                </div>
                            </div>

                            {index === 0 ? (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                        isReady
                                            ? 'bg-green-600/20 text-green-400'
                                            : 'bg-orange-600/20 text-orange-400'
                                    }`}
                                >
                  {isReady ? 'Bereit' : 'Nicht bereit'}
                </span>
                            ) : (
                                <span
                                    className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">
                  Bereit
                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between">
                {isHost ? (
                    <Button
                        variant="primary"
                        disabled={players.length < 2 || !isReady}
                        onClick={onStart}
                    >
                        Spiel starten
                    </Button>
                ) : (
                    <Button variant={isReady ? 'danger' : 'success'} onClick={toggleReady}>
                        {isReady ? 'Nicht bereit' : 'Bereit'}
                    </Button>
                )}
            </div>
        </Card>
    )
}

export default MultiplayerLobby