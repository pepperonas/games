// src/components/multiplayer/WebRTCMultiplayerLobby.tsx
import {useEffect, useState} from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {useWebRTC} from '../../store/WebRTCContext';
import {useGame} from '../../store/GameContext';
import {motion} from 'framer-motion';

interface WebRTCMultiplayerLobbyProps {
    roomId: string;
    playerId: string;
    isHost: boolean;
    onStart: () => void;
    onLeave: () => void;
}

const WebRTCMultiplayerLobby = ({
                                    roomId,
                                    playerId,
                                    isHost,
                                    onStart,
                                    onLeave
                                }: WebRTCMultiplayerLobbyProps) => {
    const [isReady, setIsReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [debugMode, setDebugMode] = useState(false);
    const [gameStartingInProgress, setGameStartingInProgress] = useState(false);
    const {players, isConnected, setReady, startGame, leaveRoom, error: webRTCError} = useWebRTC();
    const {state} = useGame();

    // Standardisiere die Raum-ID für konsistente Anzeige
    const normalizedRoomId = roomId.toUpperCase().trim();

    // Überwache den eigenen Ready-Status
    useEffect(() => {
        // Finde den eigenen Spieler in der Spielerliste
        const currentPlayer = players.find(player => player.id === playerId);
        if (currentPlayer) {
            setIsReady(currentPlayer.isReady);
        }
    }, [players, playerId]);

    // Überwache Fehler im WebRTC-Context
    useEffect(() => {
        if (webRTCError) {
            setStatusMessage(webRTCError);
        }
    }, [webRTCError]);

    // Raum verlassen
    const handleLeave = () => {
        // Setze eigene Zustände zurück
        setIsReady(false);
        setIsStarting(false);
        setGameStartingInProgress(false);

        // Informiere den Server
        leaveRoom();

        // Informiere die Elternkomponente
        onLeave();
    };

    // Ready-Status umschalten
    const toggleReady = () => {
        const newReadyStatus = !isReady;
        console.log("Ready-Status umschalten:", newReadyStatus);

        setReady(newReadyStatus);
        setIsReady(newReadyStatus);

        setStatusMessage(newReadyStatus
            ? "Du bist jetzt bereit. Warte auf andere Spieler..."
            : "Du bist nicht mehr bereit.");

        // Status-Nachricht nach 3 Sekunden ausblenden
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // Spiel starten (nur für Host)
    const handleStartGame = () => {
        // Verhindere doppelte Klicks/Starts
        if (gameStartingInProgress) {
            console.log("Spiel wird bereits gestartet, ignoriere erneuten Start-Versuch");
            return;
        }

        console.log("Spiel wird gestartet, Spieler-Status:", {
            players,
            allPlayersReady,
            roomId: normalizedRoomId,
            isHost
        });

        if (!isHost) {
            setStatusMessage("Nur der Host kann das Spiel starten");
            return;
        }

        if (players.length < 2) {
            setStatusMessage("Es werden mindestens 2 Spieler benötigt");
            return;
        }

        if (!allPlayersReady) {
            setStatusMessage("Es müssen alle Spieler bereit sein");
            return;
        }

        // Sperre erneute Starts
        setGameStartingInProgress(true);
        setIsStarting(true);
        setStatusMessage("Spiel wird gestartet... Bereite Fragen vor.");

        try {
            // Erstelle eine vereinfachte Version der Fragen
            const simplifiedQuestions = [...state.questions]
                .sort(() => Math.random() - 0.5)
                .slice(0, 10) // 10 Fragen für schnellere Übertragung
                .map((q, index) => ({
                    id: `question-${index}`,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    category: q.category,
                    difficulty: q.difficulty
                }));

            // Speichere Fragen lokal für Backup/Wiederherstellung
            try {
                localStorage.setItem('lastGameQuestions', JSON.stringify(simplifiedQuestions));
                localStorage.setItem('lastGameTimestamp', Date.now().toString());
            } catch (e) {
                console.error("Fehler beim Speichern der Fragen im localStorage", e);
            }

            // Starte das Spiel mit den ausgewählten Fragen
            console.log(`Starte Spiel mit ${simplifiedQuestions.length} Fragen`);
            startGame(simplifiedQuestions);

            // Kurze Verzögerung für bessere Benutzererfahrung
            setTimeout(() => {
                onStart();
                setIsStarting(false);

                // Entsperre den Start-Button nach dem Spielstart (für den Fall einer Rückkehr zur Lobby)
                setTimeout(() => {
                    setGameStartingInProgress(false);
                }, 5000);
            }, 2500);
        } catch (error) {
            console.error("Fehler beim Starten des Spiels:", error);
            setStatusMessage(`Fehler beim Starten des Spiels: ${error}`);
            setIsStarting(false);
            setGameStartingInProgress(false);
        }
    };

    // Prüfe, ob alle Spieler bereit sind
    const allPlayersReady = players.length > 0 && players.every(player => player.isReady);

    // Prüfe, ob der Start-Button aktiviert werden soll
    const canStartGame = isHost && players.length >= 2 && allPlayersReady && !isStarting;

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold">Lobby: {normalizedRoomId}</h2>
                        <div
                            className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            {isConnected ? 'Verbunden' : 'Nicht verbunden'}
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDebugMode(!debugMode)}
                        >
                            {debugMode ? "Debug aus" : "Debug an"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLeave}
                        >
                            Verlassen
                        </Button>
                    </div>
                </div>

                {/* Debug-Informationen */}
                {debugMode && (
                    <div className="mb-4 p-3 bg-gray-800 rounded-md text-xs font-mono">
                        <pre className="overflow-auto max-h-28">
                            {JSON.stringify({
                                roomId: normalizedRoomId,
                                playerId,
                                isHost,
                                isConnected,
                                playerCount: players.length,
                                allReady: allPlayersReady,
                                gameStartingInProgress,
                                questions: state.questions.length,
                            }, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Spieler ({players.length})</h3>
                    <div className="space-y-2">
                        {players.length === 0 ? (
                            <div className="p-3 bg-white/5 rounded-lg text-gray-400 text-center">
                                Warte auf Spieler...
                            </div>
                        ) : (
                            players.map((player, index) => (
                                <motion.div
                                    key={player.id}
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{delay: index * 0.1}}
                                    className={`flex justify-between items-center p-3 rounded-lg ${
                                        player.id === playerId
                                            ? 'bg-violet-900/30 border border-violet-500/30'
                                            : 'bg-white/5'
                                    }`}
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
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {statusMessage && (
                    <div className={`p-3 mb-6 rounded-lg text-sm ${
                        statusMessage.includes('Fehler')
                            ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                            : 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                    }`}>
                        {statusMessage}
                    </div>
                )}

                <div className="flex justify-between">
                    {/* Ready-Button für alle Spieler */}
                    <Button
                        variant={isReady ? 'danger' : 'success'}
                        onClick={toggleReady}
                        disabled={isStarting || gameStartingInProgress}
                    >
                        {isReady ? 'Nicht bereit' : 'Bereit'}
                    </Button>

                    {/* Nur der Host kann das Spiel starten */}
                    {isHost && (
                        <Button
                            variant="primary"
                            disabled={!canStartGame || gameStartingInProgress}
                            onClick={handleStartGame}
                        >
                            {isStarting ? 'Starte Spiel...' : 'Spiel starten'}
                        </Button>
                    )}
                </div>
            </Card>

            {/* Zusätzliche Informationen für Spieler */}
            <Card>
                <h3 className="text-lg font-medium mb-3">Spielinformationen</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                    <li>Ein Spiel besteht aus 10 Fragen.</li>
                    <li>Jeder Spieler hat 20 Sekunden Zeit, eine Frage zu beantworten.</li>
                    <li>Wer am Ende die meisten Fragen richtig beantwortet hat, gewinnt.</li>
                    <li>Alle Spieler müssen bereit sein, bevor das Spiel starten kann.</li>
                    {isHost && (
                        <li className="text-yellow-400">Als Host kannst du das Spiel starten, sobald
                            alle bereit sind.</li>)}
                </ul>
            </Card>
        </div>
    );
};

export default WebRTCMultiplayerLobby;