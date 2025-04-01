// src/components/multiplayer/WebRTCMultiplayerSetup.tsx
import { useCallback, useEffect, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useWebRTC } from '../../store/WebRTCContext';

interface WebRTCMultiplayerSetupProps {
    onConnect: (playerName: string, roomId: string, isHost: boolean) => void;
}

const WebRTCMultiplayerSetup = ({ onConnect }: WebRTCMultiplayerSetupProps) => {
    const [playerName, setPlayerName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [setupMode, setSetupMode] = useState<'create' | 'join' | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    const {
        isSignalingConnected,
        connectToSignalingServer,
        createRoom,
        joinRoom,
        error: webRTCError
    } = useWebRTC();

    // Initialisiere den Spielernamen aus dem localStorage, falls vorhanden
    useEffect(() => {
        const savedName = localStorage.getItem('brainbuster_player_name');
        if (savedName) {
            setPlayerName(savedName);
        }
    }, []);

    // Verbesserte Fehlerbehandlung: Überwache WebRTC-Fehler
    useEffect(() => {
        if (webRTCError) {
            setError(webRTCError);
            setIsConnecting(false);
        }
    }, [webRTCError]);

    // Verbindung zum Signaling-Server herstellen
    const handleSignalingConnection = useCallback(async () => {
        if (isSignalingConnected) {
            console.log("Bereits mit dem Signaling-Server verbunden");
            return Promise.resolve();
        }

        setError("Verbinde mit dem Signaling-Server...");
        setIsConnecting(true);

        try {
            await connectToSignalingServer();
            console.log("Verbindung zum Signaling-Server hergestellt");
            setError(null);
            return Promise.resolve();
        } catch (error) {
            const errorMsg = `Verbindungsfehler: ${error}`;
            console.error(errorMsg);
            setError(errorMsg);
            setConnectionAttempts(prev => prev + 1);
            setIsConnecting(false);
            return Promise.reject(error);
        }
    }, [isSignalingConnected, connectToSignalingServer]);

    // Automatischer Verbindungsversuch beim Komponenten-Mount
    useEffect(() => {
        if (!isSignalingConnected && connectionAttempts === 0) {
            console.log("Automatischer Verbindungsversuch zum Signaling-Server");
            handleSignalingConnection().catch(err => {
                console.warn("Initialer Verbindungsversuch fehlgeschlagen", err);
            });
        }
    }, [isSignalingConnected, connectionAttempts, handleSignalingConnection]);

    // Spielraum erstellen
    const handleCreateRoom = () => {
        setSetupMode('create');
        // Generiere eine zufällige Raum-ID (6 Zeichen, nur Großbuchstaben)
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomId(newRoomId);
    };

    // Spielraum beitreten
    const handleJoinRoom = () => {
        setSetupMode('join');
        setRoomId('');
    };

    // Verbindung herstellen - mit verbesserter Fehlerbehandlung
    const handleConnect = useCallback(async () => {
        // Verhindere mehrfache Verbindungsversuche
        if (isConnecting) {
            console.log("Bereits beim Verbinden, ignoriere doppelte Anfrage");
            return;
        }

        // Validierungen
        if (!playerName.trim()) {
            setError('Bitte gib deinen Namen ein');
            return;
        }

        if (setupMode === 'join' && !roomId.trim()) {
            setError('Bitte gib eine Raum-ID ein');
            return;
        }

        if (playerName.length > 20) {
            setError('Der Name darf maximal 20 Zeichen lang sein');
            return;
        }

        // Speichere den Namen für zukünftige Sitzungen
        localStorage.setItem('brainbuster_player_name', playerName);

        // Zurücksetzen vorheriger Fehler
        setError("Verbindung wird hergestellt...");
        setIsConnecting(true);

        try {
            // Stelle sicher, dass eine Verbindung zum Signaling-Server besteht
            if (!isSignalingConnected) {
                await handleSignalingConnection();
            }

            if (setupMode === 'create') {
                // Raum erstellen
                const createdRoomId = await createRoom(playerName, roomId);
                console.log(`Raum erstellt: ${createdRoomId}`);
                onConnect(playerName, createdRoomId, true);
            } else {
                // Raum beitreten
                await joinRoom(playerName, roomId.toUpperCase());
                console.log(`Raum beigetreten: ${roomId}`);
                onConnect(playerName, roomId.toUpperCase(), false);
            }

            // Erfolg!
            setIsConnecting(false);
            setError(null);
        } catch (error) {
            console.error("Fehler bei der Raumverbindung:", error);
            setError(`Fehler: ${error}`);
            setIsConnecting(false);
        }
    }, [isConnecting, playerName, roomId, setupMode, isSignalingConnected, handleSignalingConnection, createRoom, joinRoom, onConnect]);

    // Erzwinge einen neuen Verbindungsversuch
    const handleForceReconnect = async () => {
        setConnectionAttempts(0);
        setError("Verbindung wird neu aufgebaut...");

        try {
            await handleSignalingConnection();
            setError(null);
        } catch (error) {
            setError(`Verbindungsfehler: ${error}`);
        }
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-6">Multiplayer-Setup</h2>

            {/* Verbindungsstatus-Anzeige */}
            <div className="mb-4">
                <div className={`flex items-center ${isSignalingConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                    <div className={`w-3 h-3 rounded-full mr-2 ${isSignalingConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span>
                        {isSignalingConnected
                            ? 'Verbunden mit dem Signaling-Server'
                            : 'Nicht verbunden mit dem Signaling-Server'}
                    </span>
                </div>

                {!isSignalingConnected && (
                    <div className="mt-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleForceReconnect}
                            disabled={isConnecting}
                        >
                            Verbindung herstellen
                        </Button>
                    </div>
                )}
            </div>

            {!setupMode ? (
                <div className="space-y-4">
                    <p className="text-gray-300 mb-6">
                        Erstelle einen neuen Spielraum oder tritt einem bestehenden bei.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            fullWidth
                            variant="primary"
                            onClick={handleCreateRoom}
                            disabled={!isSignalingConnected}
                        >
                            Raum erstellen
                        </Button>
                        <Button
                            fullWidth
                            variant="secondary"
                            onClick={handleJoinRoom}
                            disabled={!isSignalingConnected}
                        >
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
                                placeholder="Gib die Raum-ID ein (z.B. ABC123)"
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
                                            .then(() => {
                                                setError("Raum-ID kopiert!");
                                                setTimeout(() => setError(null), 2000);
                                            })
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
                            className={`p-3 rounded-lg text-sm ${
                                error.includes("kopiert")
                                    ? "bg-green-500/20 border border-green-500/40 text-green-300"
                                    : "bg-red-500/20 border border-red-500/40 text-red-300"
                            }`}
                        >
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
                            disabled={isConnecting || !isSignalingConnected}
                        >
                            {isConnecting ? 'Verbinde...' : 'Verbinden'}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default WebRTCMultiplayerSetup;