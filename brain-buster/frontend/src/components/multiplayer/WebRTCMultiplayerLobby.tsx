// src/components/multiplayer/WebRTCMultiplayerLobby.tsx
import { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useWebRTC } from '../../store/WebRTCContext';
import { useGame } from '../../store/GameContext';

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
    const [error, setError] = useState<string | null>(null);
    const { players, setReady, startGame, leaveRoom } = useWebRTC();
    const { state } = useGame();

    // Überwache den eigenen Ready-Status
    useEffect(() => {
        // Finde den eigenen Spieler in der Spielerliste
        const currentPlayer = players.find(player => player.id === playerId);
        if (currentPlayer) {
            setIsReady(currentPlayer.isReady);
        }
    }, [players, playerId]);

    // Raum verlassen
    const handleLeave = () => {
        leaveRoom();
        onLeave();
    };

    // Ready-Status umschalten
    const toggleReady = () => {
        console.log("Ready-Status umschalten:", !isReady);
        const newReadyStatus = !isReady;
        setReady(newReadyStatus);
        setIsReady(newReadyStatus);
    };

    // Spiel starten (nur für Host)
    const handleStartGame = () => {
        if (isHost) {
            console.log("Host startet das Spiel mit vereinfachten Fragen");

            // Anzeigestatus für den Benutzer
            setError("Spiel wird gestartet... Bitte warten.");

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
            startGame(simplifiedQuestions);

            // Timeout für den Callback
            setTimeout(() => {
                onStart();
            }, 1000);
        }
    };

    // Prüfe, ob alle Spieler bereit sind
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
                {/* Sowohl Host als auch Mitspieler haben einen Ready-Button */}
                <Button variant={isReady ? 'danger' : 'success'} onClick={toggleReady}>
                    {isReady ? 'Nicht bereit' : 'Bereit'}
                </Button>

                {/* Nur der Host kann das Spiel starten */}
                {isHost && (
                    <Button
                        variant="primary"
                        disabled={players.length < 2 || !allPlayersReady}
                        onClick={handleStartGame}
                    >
                        Spiel starten
                    </Button>
                )}
            </div>
        </Card>
    );
};

export default WebRTCMultiplayerLobby;