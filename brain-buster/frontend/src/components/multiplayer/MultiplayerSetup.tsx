import {useCallback, useEffect, useState} from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import {useSocket} from '../../store/SocketContext'

interface MultiplayerSetupProps {
    onConnect: (playerName: string, roomId: string, isHost: boolean) => void
}

const MultiplayerSetup = ({onConnect}: MultiplayerSetupProps) => {
    const [playerName, setPlayerName] = useState('')
    const [roomId, setRoomId] = useState('')
    const [setupMode, setSetupMode] = useState<'create' | 'join' | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const {socket, isConnected, connect} = useSocket()
    const [connectionAttempted, setConnectionAttempted] = useState(false)

    // Improved connection management
    const handleSocketConnection = useCallback(() => {
        // Only connect if not already connecting and not already connected
        if (!isConnected && !connectionAttempted) {
            console.log("Initial socket connection attempt from MultiplayerSetup");
            setConnectionAttempted(true);
            connect();
        }
    }, [isConnected, connectionAttempted, connect]);

    // Manage connection only on component mount
    useEffect(() => {
        console.log("MultiplayerSetup mounted, connection status:", isConnected);
        handleSocketConnection();

        // Cleanup function when component unmounts
        return () => {
            console.log("MultiplayerSetup unmounted");
            setConnectionAttempted(false);
        };
    }, [handleSocketConnection, isConnected]);

    // Improve connection error handling
    useEffect(() => {
        if (!socket) return;

        const handleConnectionError = () => {
            setIsConnecting(false);
            setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        };

        socket.on('connect_error', handleConnectionError);

        return () => {
            socket.off('connect_error', handleConnectionError);
        };
    }, [socket]);

    // Spielraum erstellen
    const handleCreateRoom = () => {
        setSetupMode('create')
        // Generiere eine zufällige Raum-ID mit weniger Komplexität
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomId(newRoomId)
    }

    // Spielraum beitreten
    const handleJoinRoom = () => {
        setSetupMode('join')
    }

    // Verbindung herstellen - mit verbesserte Fehlerbehandlung
    const handleConnect = useCallback(() => {
        // Prevent multiple connection attempts
        if (isConnecting) {
            console.log("Already attempting to connect, ignoring duplicate request");
            return;
        }

        // Validierungen
        if (!isConnected) {
            setError('Nicht mit dem Server verbunden. Bitte versuchen Sie es später erneut.');
            return;
        }

        if (!playerName.trim()) {
            setError('Bitte gib deinen Namen ein');
            return;
        }

        if (setupMode === 'join' && !roomId.trim()) {
            setError('Bitte gib eine Raum-ID ein');
            return;
        }

        // Zurücksetzen vorheriger Fehler
        setError(null);
        setIsConnecting(true);

        // Cleanup existing listeners to prevent multiple handlers
        socket?.off('room_joined');
        socket?.off('error');

        // Neue Event-Listener
        const handleRoomJoined = (data: { roomId: string; playerId: string; isHost: boolean }) => {
            console.log("Room joined successfully:", data);
            setIsConnecting(false);
            onConnect(playerName, data.roomId, data.isHost);
        };

        const handleError = (errorData: { message: string }) => {
            console.error("Room join error:", errorData);
            setIsConnecting(false);
            setError(errorData.message || 'Ein unerwarteter Fehler ist aufgetreten');
        };

        // Event-Listener ONCE (not on, to prevent duplicates)
        socket?.once('room_joined', handleRoomJoined);
        socket?.once('error', handleError);

        // Raum beitreten
        console.log(`Emitting join_room: ${roomId}, ${playerName}, isHost: ${setupMode === 'create'}`);
        socket?.emit('join_room', {
            roomId,
            playerName,
            isHost: setupMode === 'create'
        });

        // Timeout für Verbindungsversuch
        const connectTimeout = setTimeout(() => {
            if (isConnecting) {
                setIsConnecting(false);
                setError('Verbindungsaufbau dauert zu lange. Bitte versuchen Sie es erneut.');
                // Remove the event listeners
                socket?.off('room_joined', handleRoomJoined);
                socket?.off('error', handleError);
            }
        }, 10000); // 10 Sekunden Timeout

        // Cleanup-Funktion
        return () => {
            clearTimeout(connectTimeout);
            socket?.off('room_joined', handleRoomJoined);
            socket?.off('error', handleError);
        };
    }, [isConnected, playerName, roomId, setupMode, socket, onConnect, isConnecting]);

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
                            disabled={isConnecting}
                            maxLength={20}
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
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                placeholder="Gib die Raum-ID ein"
                                disabled={isConnecting}
                                maxLength={6}
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
                                    disabled={isConnecting}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(roomId)
                                            .then(() => alert('Raum-ID kopiert!'))
                                            .catch(err => console.error('Fehler beim Kopieren', err));
                                    }}
                                    className="bg-violet-600 px-4 rounded-r-lg hover:bg-violet-700"
                                    aria-label="Raum-ID kopieren"
                                    disabled={isConnecting}
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div
                            className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSetupMode(null);
                                setError(null);
                            }}
                            disabled={isConnecting}
                        >
                            Zurück
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConnect}
                            disabled={isConnecting}
                        >
                            {isConnecting ? 'Verbinde...' : 'Verbinden'}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    )
}

export default MultiplayerSetup;