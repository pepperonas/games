// src/pages/WebRTCMultiplayerPage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/ui/Card';
import { useGame } from '../store/GameContext';
import { useWebRTC } from '../store/WebRTCContext';
import WebRTCMultiplayerSetup from '../components/multiplayer/WebRTCMultiplayerSetup';
import WebRTCMultiplayerLobby from '../components/multiplayer/WebRTCMultiplayerLobby';
import WebRTCMultiplayerGame from '../components/multiplayer/WebRTCMultiplayerGame';
import Button from '../components/ui/Button';

// Multiplayer-Status-Typen
type MultiplayerStatus = 'setup' | 'lobby' | 'playing' | 'result';

const WebRTCMultiplayerPage = () => {
    // Sichere Verwendung des useGame hooks mit Fehlerbehandlung
    const gameContext = useGame();
    const { isConnected, error: webRTCError, connectToSignalingServer } = useWebRTC();

    // Debug mode state
    const [showDebug, setShowDebug] = useState(false);

    // Überprüfung, ob der gameContext korrekt initialisiert wurde
    if (!gameContext) {
        return (
            <Card>
                <div className="text-center py-8">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Fehler beim Laden des Spielkontexts</h2>
                    <p>Bitte starten Sie die Anwendung neu oder kehren Sie zur Startseite zurück.</p>
                </div>
            </Card>
        );
    }

    // Destrukturiere erst nach der Überprüfung
    const { resetGame } = gameContext;

    const [status, setStatus] = useState<MultiplayerStatus>('setup');
    const [playerName, setPlayerName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [playerId, setPlayerId] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Versuche, eine Verbindung zum Signaling-Server herzustellen
    useEffect(() => {
        const attemptConnection = async () => {
            try {
                await connectToSignalingServer();
                console.log("Verbindung zum Signaling-Server hergestellt");
                setConnectionError(null);
            } catch (error) {
                console.error("Fehler bei der Verbindung zum Signaling-Server:", error);
                setConnectionError("Keine Verbindung zum Signaling-Server möglich. Bitte versuchen Sie es später erneut.");
            }
        };

        attemptConnection();
    }, [connectToSignalingServer]);

    // Überwache WebRTC-Fehler
    useEffect(() => {
        if (webRTCError) {
            setConnectionError(webRTCError);
        }
    }, [webRTCError]);

    // Status auf Setup zurücksetzen, wenn die Komponente unmounted wird
    useEffect(() => {
        return () => {
            resetGame();
        };
    }, [resetGame]);

    // Verbindung zum Multiplayer-Server herstellen
    const connectToServer = (name: string, room: string, hostStatus: boolean) => {
        if (!isConnected) {
            setConnectionError("Nicht mit dem Server verbunden. Bitte versuchen Sie es später erneut.");
            return;
        }

        setConnectionError(null);
        console.log(`Raum beigetreten: ${room} als ${hostStatus ? 'Host' : 'Gast'}`);
        
        setPlayerName(name);
        setRoomId(room);
        setPlayerId(hostStatus ? 'host-' + Math.random().toString(36).substring(2, 9) : 'guest-' + Math.random().toString(36).substring(2, 9));
        setIsHost(hostStatus);
        setStatus('lobby');
    };

    // Spiel starten (nur für Host)
    const startGame = () => {
        console.log("Host startet das Spiel");
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

    // Erzwinge Neu-Verbindung
    const handleForceReconnect = async () => {
        setConnectionError("Verbindung wird neu aufgebaut...");
        
        try {
            await connectToSignalingServer();
            setConnectionError(null);
        } catch (error) {
            setConnectionError(`Fehler bei der Wiederverbindung: ${error}`);
        }
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
                            <p className="font-medium">Verbindung zum WebRTC-Server wird hergestellt...</p>
                            <p className="text-sm text-gray-300">Falls die Verbindung nicht hergestellt werden kann, überprüfen Sie bitte Ihre Internetverbindung.</p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <Button variant="primary" size="sm" onClick={handleForceReconnect}>
                            Neu verbinden
                        </Button>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <WebRTCMultiplayerSetup onConnect={connectToServer} />
                </motion.div>
            )}

            {status === 'lobby' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <WebRTCMultiplayerLobby
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <WebRTCMultiplayerGame
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
            {showDebug && (
                <Card className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">WebRTC Debug</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div>
                            <span className="text-sm text-gray-400">Connection Status:</span>
                            <div className={`ml-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm text-gray-400">Room ID:</span>
                            <div className="ml-2 text-xs break-all">{roomId || 'None'}</div>
                        </div>
                        <div>
                            <span className="text-sm text-gray-400">Player ID:</span>
                            <div className="ml-2 text-xs break-all">{playerId || 'None'}</div>
                        </div>
                        <div>
                            <span className="text-sm text-gray-400">Status:</span>
                            <div className="ml-2">{status}</div>
                        </div>
                        <div>
                            <span className="text-sm text-gray-400">Host:</span>
                            <div className="ml-2">{isHost ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default WebRTCMultiplayerPage;