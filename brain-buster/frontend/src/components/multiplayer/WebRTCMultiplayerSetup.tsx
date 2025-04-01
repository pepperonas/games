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

    const {
        isSignalingConnected,
        connectToSignalingServer,
        createRoom,
        joinRoom,
        error: webRTCError
    } = useWebRTC();

    const [connectionAttempted, setConnectionAttempted] = useState(false);

    // Verbesserte Verbindungsverwaltung
    const handleSignalingConnection = useCallback(async () => {
        // Nur verbinden, wenn nicht bereits verbunden und nicht bereits beim Verbinden
        if (!isSignalingConnected && !connectionAttempted) {
            console.log("Initialer Verbindungsversuch zum Signaling-Server");
            setConnectionAttempted(true);
            try {
                await connectToSignalingServer();
                console.log("Verbindung zum Signaling-Server hergestellt");
            } catch (error) {
                console.error("Fehler bei der Verbindung zum Signaling-Server:", error);
                setError(`Verbindungsfehler: ${error}`);
            }
        }
    }, [isSignalingConnected, connectionAttempted, connectToSignalingServer]);

    // Verwalte Verbindung nur beim Komponenten-Mount
    useEffect(() => {
        console.log("WebRTCMultiplayerSetup mounted, Verbindungsstatus:", isSignalingConnected);
        handleSignalingConnection();

        // Bereinigungsfunktion beim Unmount der Komponente
        return () => {
            console.log("WebRTCMultiplayerSetup unmounted");
            setConnectionAttempted(false);
        };
    }, [handleSignalingConnection, isSignalingConnected]);

    // Überwache WebRTC-Fehler
    useEffect(() => {
        if (webRTCError) {
            setError(webRTCError);
            setIsConnecting(false);
        }
    }, [webRTCError]);

    // Spielraum erstellen
    const handleCreateRoom = () => {
        setSetupMode('create');
        // Generiere eine zufällige Raum-ID mit weniger Komplexität
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomId(newRoomId);
    };

    // Spielraum beitreten
    const handleJoinRoom = () => {
        setSetupMode('join');
    };

    // Verbindung herstellen - mit verbesserter Fehlerbehandlung
    const handleConnect = useCallback(async () => {
        // Verhindere mehrfache Verbindungsversuche
        if (isConnecting) {
            console.log("Bereits beim Verbinden, ignoriere doppelte Anfrage");
            return;
        }

        // Validierungen
        if (!isSignalingConnected) {
            try {
                await connectToSignalingServer();
            } catch (error) {
                setError('Nicht mit dem Server verbunden. Bitte versuchen Sie es später erneut.');
                return;
            }
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

        try {
            if (setupMode === 'create') {
                // Raum erstellen
                const createdRoomId = await createRoom(playerName, roomId);
                console.log(`Raum erstellt: ${createdRoomId}`);
                onConnect(playerName, createdRoomId, true);
            } else {
                // Raum beitreten
                await joinRoom(playerName, roomId);
                console.log(`Raum beigetreten: ${roomId}`);
                onConnect(playerName, roomId, false);
            }

            // Erfolg!
            setIsConnecting(false);
        } catch (error) {
            console.error("Fehler bei der Raumverbindung:", error);
            setError(`Fehler: ${error}`);
            setIsConnecting(false);
        }
    }, [isConnecting, isSignalingConnected, playerName, roomId, setupMode, connectToSignalingServer, createRoom, joinRoom, onConnect]);

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
    );
};

export default WebRTCMultiplayerSetup;