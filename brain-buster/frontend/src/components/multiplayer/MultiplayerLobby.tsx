import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useSocket } from '../../store/SocketContext'
import { useGame } from '../../store/GameContext'

interface PlayerInfo {
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    score: number;
}

interface MultiplayerLobbyProps {
    roomId: string
    isHost: boolean
    playerId: string
    onStart: () => void
    onLeave: () => void
}

const MultiplayerLobby = ({
                              roomId,
                              isHost,
                              playerId,
                              onStart,
                              onLeave
                          }: MultiplayerLobbyProps) => {
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { socket } = useSocket();
    const { state } = useGame();

    // Listen for player list updates
    useEffect(() => {
        if (!socket) return;

        const handlePlayerListUpdate = (data: { players: PlayerInfo[] }) => {
            setPlayers(data.players);

            // Update the local ready state based on the server data
            const currentPlayer = data.players.find(player => player.id === playerId);
            if (currentPlayer) {
                setIsReady(currentPlayer.isReady);
            }
        };

        // Listen for error messages
        const handleError = (data: { message: string }) => {
            setError(data.message);
        };

        socket.on('player_list_updated', handlePlayerListUpdate);
        socket.on('error', handleError);

        return () => {
            socket.off('player_list_updated', handlePlayerListUpdate);
            socket.off('error', handleError);
        };
    }, [socket, playerId]);

    // Leave room handler
    const handleLeave = () => {
        if (socket) {
            socket.emit('leave_room', { roomId, playerId });
        }
        onLeave();
    };

    // Toggle ready status
    const toggleReady = () => {
        if (socket) {
            const newReadyStatus = !isReady;
            socket.emit('player_ready', { roomId, playerId, isReady: newReadyStatus });
            setIsReady(newReadyStatus);
        }
    };

    // Start game handler
    const handleStartGame = () => {
        if (socket && isHost) {
            // Filter questions based on current state if needed
            const questions = [...state.questions]
                .sort(() => Math.random() - 0.5)
                .slice(0, 10);

            socket.emit('start_game', { roomId, questions });
            onStart();
        }
    };

    // Check if all players are ready
    const allPlayersReady = players.length > 0 && players.every(player => player.isReady);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Lobby: {roomId}</h2>
                <Button variant="outline" size="sm" onClick={handleLeave}>
                    Verlassen
                </Button>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Spieler</h3>
                <div className="space-y-2">
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className="flex justify-between items-center p-3 bg-white/5 rounded-lg"
                        >
                            <div className="flex items-center">
                                <div className="text-lg mr-2">👤</div>
                                <div>
                                    {player.name}
                                    {player.isHost && (
                                        <span
                                            className="ml-2 text-xs bg-violet-600 px-2 py-0.5 rounded-full">
                                            Host
                                        </span>
                                    )}
                                    {player.id === playerId && (
                                        <span
                                            className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                                            Du
                                        </span>
                                    )}
                                </div>
                            </div>

                            <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                    player.isReady
                                        ? 'bg-green-600/20 text-green-400'
                                        : 'bg-orange-600/20 text-orange-400'
                                }`}
                            >
                                {player.isReady ? 'Bereit' : 'Nicht bereit'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 mb-6 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className="flex justify-between">
                {isHost ? (
                    <Button
                        variant="primary"
                        disabled={players.length < 2 || !allPlayersReady}
                        onClick={handleStartGame}
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