import {useEffect, useState} from 'react'
import {motion} from 'framer-motion'
import Card from '../components/ui/Card'
import {useGame} from '../store/GameContext'
import {useSocket} from '../store/SocketContext'
import MultiplayerSetup from '../components/multiplayer/MultiplayerSetup'
import MultiplayerLobby from '../components/multiplayer/MultiplayerLobby'
import MultiplayerGame from '../components/multiplayer/MultiplayerGame'
import SocketDebug from '../components/multiplayer/SocketDebug'
import Button from '../components/ui/Button'

// Multiplayer-Status-Typen
type MultiplayerStatus = 'setup' | 'lobby' | 'playing' | 'result'

const MultiplayerPage = () => {
    // Sichere Verwendung des useGame hooks mit Fehlerbehandlung
    const gameContext = useGame()
    const {socket, isConnected} = useSocket()  // Do NOT include connect here

    // Debug mode state
    const [showDebug, setShowDebug] = useState(false)

    // Überprüfung, ob der gameContext korrekt initialisiert wurde
    if (!gameContext) {
        return (
            <Card>
                <div className="text-center py-8">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Fehler beim Laden des
                        Spielkontexts</h2>
                    <p>Bitte starten Sie die Anwendung neu oder kehren Sie zur Startseite
                        zurück.</p>
                </div>
            </Card>
        )
    }

    // Destrukturiere erst nach der Überprüfung
    const {resetGame} = gameContext

    const [status, setStatus] = useState<MultiplayerStatus>('setup')
    const [playerName, setPlayerName] = useState('')
    const [roomId, setRoomId] = useState('')
    const [playerId, setPlayerId] = useState('')
    const [isHost, setIsHost] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    // Listen for game events from the server
    useEffect(() => {
        if (!socket) return;

        // Listen for game started event - THIS IS CRITICAL FOR CLIENTS
        const handleGameStarted = () => {
            console.log("Game started event received - transitioning to game screen");
            setStatus('playing');
        };

        // Listen for game ended event
        const handleGameEnded = () => {
            console.log("Game ended event received");
            setStatus('result');
        };

        // Register event listeners
        socket.on('game_started', handleGameStarted);
        socket.on('game_ended', handleGameEnded);

        // Cleanup when component unmounts
        return () => {
            socket.off('game_started', handleGameStarted);
            socket.off('game_ended', handleGameEnded);
        };
    }, [socket]);

    // Status auf Setup zurücksetzen, wenn das Component unmounted wird
    useEffect(() => {
        return () => {
            resetGame();
        };
    }, [resetGame]);

    // Verbindung zum Multiplayer-Server herstellen
    const connectToServer = (name: string, room: string, isHostRoom: boolean) => {
        if (!socket || !isConnected) {
            setConnectionError("Not connected to the server. Please try again later.");
            return;
        }

        setConnectionError(null);
        console.log(`Attempting to join room: ${room} as ${isHostRoom ? 'host' : 'guest'}`);

        socket.once('room_joined', (data) => {
            console.log("Room joined successfully:", data);
            setPlayerName(name);
            setRoomId(room);
            setPlayerId(data.playerId);
            setIsHost(data.isHost);
            setStatus('lobby');
        });

        socket.once('error', (data) => {
            console.error("Error joining room:", data);
            setConnectionError(data.message || "Failed to join room");
        });

        // Join the room
        socket.emit('join_room', {
            roomId: room,
            playerName: name,
            isHost: isHostRoom
        });
    };

    // Spiel starten (nur für Host)
    const startGame = () => {
        console.log("Host initiated game start");
        setStatus('playing');
    };

    // Zurück zur Lobby
    const backToLobby = () => {
        setStatus('lobby');
        resetGame();
    };

    // Spiel verlassen
    const leaveGame = () => {
        setStatus('setup');
        setPlayerName('');
        setRoomId('');
        setPlayerId('');
        setIsHost(false);
        resetGame();
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Multiplayer-Modus</h1>

            {/* Debug toggle button */}
            <div className="text-right mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebug(!showDebug)}
                >
                    {showDebug ? "Debug ausblenden" : "Debug anzeigen"}
                </Button>
            </div>

            {/* Connection status */}
            {!isConnected && (
                <Card className="mb-4 p-4 bg-yellow-600/20 border border-yellow-600/40">
                    <div className="flex items-center">
                        <div className="text-lg mr-2">⚠️</div>
                        <div>
                            <p className="font-medium">Verbindung zum Server wird hergestellt...</p>
                            <p className="text-sm text-gray-300">Falls die Verbindung nicht
                                hergestellt werden kann, überprüfen Sie bitte Ihre
                                Internetverbindung.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Connection error */}
            {connectionError && (
                <Card className="mb-4 p-4 bg-red-600/20 border border-red-600/40">
                    <div className="flex items-center">
                        <div className="text-lg mr-2">❌</div>
                        <div>
                            <p className="font-medium">Verbindungsfehler</p>
                            <p className="text-sm">{connectionError}</p>
                        </div>
                    </div>
                </Card>
            )}

            {status === 'setup' && (
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.3}}
                >
                    <MultiplayerSetup onConnect={connectToServer}/>
                </motion.div>
            )}

            {status === 'lobby' && (
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.3}}
                >
                    <MultiplayerLobby
                        roomId={roomId}
                        playerId={playerId}
                        isHost={isHost}
                        onStart={startGame}
                        onLeave={leaveGame}
                    />
                </motion.div>
            )}

            {status === 'playing' && (
                <motion.div
                    initial={{opacity: 0, scale: 0.95}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.3}}
                >
                    <MultiplayerGame
                        playerName={playerName}
                        roomId={roomId}
                        playerId={playerId}
                        isHost={isHost}
                        onBackToLobby={backToLobby}
                        onLeave={leaveGame}
                    />
                </motion.div>
            )}

            {/* Debug component */}
            {showDebug && <SocketDebug/>}
        </div>
    )
}

export default MultiplayerPage