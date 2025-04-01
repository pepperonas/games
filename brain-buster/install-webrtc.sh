#!/bin/bash

# Installationsskript für WebRTC in BrainBuster

# Farbige Ausgabe für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}BrainBuster WebRTC-Integration${NC}"
echo -e "${GREEN}=======================================${NC}"

# Prüfen, ob das aktuelle Verzeichnis korrekt ist
if [ ! -d "frontend" ] || [ ! -d "frontend/src" ]; then
  echo -e "${RED}Fehler: Dieses Skript muss im Hauptverzeichnis des BrainBuster-Projekts ausgeführt werden${NC}"
  echo "Das Verzeichnis sollte 'frontend' und 'frontend/src' enthalten"
  exit 1
fi

echo -e "${YELLOW}10. WebRTC MultiplayerGame erstellen...${NC}"

cat > src/components/multiplayer/WebRTCMultiplayerGame.tsx << 'EOL'
// src/components/multiplayer/WebRTCMultiplayerGame.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import QuestionCard from '../game/QuestionCard';
import { useGame } from '../../store/GameContext'
import { SocketProvider } from './store/SocketContext'
import { WebRTCProvider } from './store/WebRTCContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SocketProvider>
            <WebRTCProvider>
                <GameProvider>
                    <App />
                </GameProvider>
            </WebRTCProvider>
        </SocketProvider>
    </React.StrictMode>,
)
EOL

# Aktualisiere App.tsx, um die WebRTC-Route hinzuzufügen
echo -e "${YELLOW}13. Aktualisiere App.tsx...${NC}"

# Erstelle eine temporäre Datei mit der neuen App.tsx
cat > src/App.tsx.new << 'EOL'
// ========== src/App.tsx ==========
import {ReactNode, useEffect} from 'react'
import {BrowserRouter, Route, Routes, useLocation, useNavigate} from 'react-router-dom'
import {AnimatePresence} from 'framer-motion'

// Pages
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import MultiplayerPage from './pages/MultiplayerPage'
import WebRTCMultiplayerPage from './pages/WebRTCMultiplayerPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

// Components
import Layout from './components/ui/Layout'
import {useGame} from './store/GameContext'

// Wrapper component that handles refresh warnings
interface RefreshWarningHandlerProps {
    children: ReactNode;
}

const RefreshWarningHandler = ({children}: RefreshWarningHandlerProps) => {
    const location = useLocation();

    useEffect(() => {
        // Only attach the event listener if we're not on the home page
        if (location.pathname !== '/') {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                // Show warning dialog when user tries to refresh
                const message = "Möchten Sie wirklich die Seite neu laden? Alle ungespeicherten Änderungen gehen verloren.";
                e.returnValue = message;
                return message;
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [location.pathname]);

    return children;
};

// Custom 404 handler component
const NotFoundHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // If the page is accessed directly (not through React Router navigation)
        // and results in a 404, redirect to home
        if (document.referrer === '') {
            navigate('/games/brain-buster/');
        }
    }, [navigate]);

    return <NotFoundPage/>;
};

function App() {
    const {initGameState} = useGame()

    useEffect(() => {
        // Initialisiere den Spielstand beim App-Start
        initGameState()
    }, [initGameState])

    return (
        <BrowserRouter basename="/games/brain-buster">
            <RefreshWarningHandler>
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<Layout/>}>
                            <Route index element={<HomePage/>}/>
                            <Route path="game" element={<GamePage/>}/>
                            <Route path="multiplayer" element={<MultiplayerPage/>}/>
                            <Route path="webrtc" element={<WebRTCMultiplayerPage/>}/>
                            <Route path="stats" element={<StatsPage/>}/>
                            <Route path="settings" element={<SettingsPage/>}/>
                            <Route path="*" element={<NotFoundHandler/>}/>
                        </Route>
                    </Routes>
                </AnimatePresence>
            </RefreshWarningHandler>
        </BrowserRouter>
    )
}

export default App
EOL

# Ersetze die alte App.tsx mit der neuen
mv src/App.tsx.new src/App.tsx

# Aktualisiere HomePage.tsx, um einen Link zum WebRTC-Multiplayer hinzuzufügen
echo -e "${YELLOW}14. Aktualisiere HomePage.tsx...${NC}"

# Erstelle eine temporäre Datei mit der neuen HomePage.tsx
cat > src/pages/HomePage.tsx.new << 'EOL'
import {Link} from 'react-router-dom'
import {motion} from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const HomePage = () => {
    return (
        <div className="flex flex-col items-center justify-center space-y-10">
            <motion.div
                initial={{scale: 0.9, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                transition={{duration: 0.5}}
                className="text-center"
            >
                <h1 className="text-4xl md:text-6xl font-bold text-secondary-300 mb-4">
                    BrainBuster
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-2xl">
                    Teste dein Wissen in verschiedenen Kategorien und fordere deine Freunde im
                    Multiplayer-Modus heraus!
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <Card className="text-center flex flex-col items-center justify-between h-full">
                    <div>
                        <motion.div
                            initial={{y: -20, opacity: 0}}
                            animate={{y: 0, opacity: 1}}
                            transition={{delay: 0.2, duration: 0.5}}
                            className="text-4xl mb-2"
                        >
                            🎮
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4 text-accent-blue">Einzelspieler</h2>
                        <p className="mb-6 text-gray-300">
                            Fordere dich selbst heraus und teste dein Wissen in verschiedenen
                            Kategorien. Verfolge deinen Fortschritt mit detaillierten Statistiken.
                        </p>
                    </div>
                    <Link to="/game">
                        <Button size="lg" variant="primary">
                            Jetzt spielen
                        </Button>
                    </Link>
                </Card>

                <Card className="text-center flex flex-col items-center justify-between h-full">
                    <div>
                        <motion.div
                            initial={{y: -20, opacity: 0}}
                            animate={{y: 0, opacity: 1}}
                            transition={{delay: 0.3, duration: 0.5}}
                            className="text-4xl mb-2"
                        >
                            👥
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4 text-accent-green">Multiplayer</h2>
                        <p className="mb-6 text-gray-300">
                            Tritt gegen Freunde oder zufällige Gegner in Echtzeit an. Zeige dein
                            Wissen und erklimme die Bestenliste!
                        </p>
                    </div>
                    <Link to="/multiplayer">
                        <Button size="lg" variant="secondary">
                            Socket.io Mehrspieler
                        </Button>
                    </Link>
                </Card>
                
                <Card className="text-center flex flex-col items-center justify-between h-full">
                    <div>
                        <motion.div
                            initial={{y: -20, opacity: 0}}
                            animate={{y: 0, opacity: 1}}
                            transition={{delay: 0.4, duration: 0.5}}
                            className="text-4xl mb-2"
                        >
                            🚀
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4 text-accent-blue">WebRTC Multiplayer</h2>
                        <p className="mb-6 text-gray-300">
                            Spiele direkt Peer-to-Peer mit deinen Freunden über WebRTC für bessere Verbindungsqualität und weniger Verzögerung!
                        </p>
                    </div>
                    <Link to="/webrtc">
                        <Button size="lg" variant="primary">
                            WebRTC Mehrspieler
                        </Button>
                    </Link>
                </Card>
            </div>

            <motion.div
                initial={{y: 20, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                transition={{delay: 0.5, duration: 0.5}}
                className="flex flex-wrap justify-center gap-4 mt-6"
            >
                <Link to="/stats">
                    <Button variant="outline">
                        Meine Statistiken
                    </Button>
                </Link>
                <Link to="/settings">
                    <Button variant="outline">
                        Einstellungen
                    </Button>
                </Link>
            </motion.div>
        </div>
    )
}

export default HomePage
EOL

# Ersetze die alte HomePage.tsx mit der neuen
mv src/pages/HomePage.tsx.new src/pages/HomePage.tsx

# Abschluss und Backup erstellen
echo -e "${YELLOW}15. Erstelle ein Backup und bereite den Server vor...${NC}"

# Erstelle einen Backup-Ordner, falls er nicht existiert
mkdir -p backup

# Erstelle ein Backup der ursprünglichen Dateien
cp -r src backup/src_original
cp -r backend backup/backend_original

# Baue das Frontend
echo -e "${YELLOW}16. Baue das Frontend...${NC}"
npm run build

# Aktualisiere den Hinweis für den Server
cd ../backend
echo -e "${YELLOW}17. Baue den Backend-Server...${NC}"
npm run build

# Startanleitung
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "${YELLOW}Um den WebRTC-basierten Multiplayer zu starten:${NC}"
echo -e "1. Starte den Backend-Server: ${GREEN}cd backend && npm start${NC}"
echo -e "2. Öffne in deinem Browser: ${GREEN}http://localhost:5000${NC}"
echo -e "3. Oder nutze deinen Produktionsserver unter ${GREEN}https://mrx3k1.de/games/brain-buster${NC}"
echo -e ""
echo -e "Hinweis: Falls du die Socket.io-Implementierung wiederherstellen möchtest,"
echo -e "findest du ein Backup im Ordner: ${GREEN}backup/${NC}"
echo -e "${GREEN}=======================================${NC}"

cd ..
;
import { useWebRTC } from '../../store/WebRTCContext';
import { Question } from '../../types';

interface PlayerScore {
    id: string;
    name: string;
    score: number;
}

interface WebRTCMultiplayerGameProps {
    playerName: string;
    roomId: string;
    playerId: string;
    isHost: boolean;
    onBackToLobby: () => void;
    onLeave: () => void;
}

const WebRTCMultiplayerGame = ({
    playerName,
    roomId,
    playerId,
    isHost,
    onBackToLobby,
    onLeave
}: WebRTCMultiplayerGameProps) => {
    const { startGame: startGameContext, endGame } = useGame();
    const { 
        webRTC, 
        players, 
        isConnected, 
        answerQuestion: answerQuestionWebRTC, 
        nextQuestion: nextQuestionWebRTC,
        leaveRoom 
    } = useWebRTC();
    
    const [gameEnded, setGameEnded] = useState(false);
    const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [waitingForOthers, setWaitingForOthers] = useState(false);
    const [gameResult, setGameResult] = useState<{ winners: PlayerScore[], isDraw: boolean } | null>(null);
    const [initComplete, setInitComplete] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [debugMode, setDebugMode] = useState(false);

    useEffect(() => {
        // Wenn wir keine Fragen haben, aber initComplete ist noch false
        if (questions.length === 0 && !initComplete) {
            // Prüfen, ob die Fragen im lokalen Speicher sind
            const savedQuestions = localStorage.getItem('lastGameQuestions');
            if (savedQuestions) {
                try {
                    const parsedQuestions = JSON.parse(savedQuestions);

                    if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                        console.log("🛟 Fragen aus dem lokalen Speicher geladen:", parsedQuestions.length);
                        setQuestions(parsedQuestions);
                        setCurrentQuestionIndex(0);
                        setInitComplete(true);
                        startGameContext('multiplayer', parsedQuestions);
                    }
                } catch (error) {
                    console.error("Fehler beim Analysieren gespeicherter Fragen:", error);
                }
            }
        }
    }, [questions.length, initComplete, startGameContext]);

    // Registriere Callbacks für WebRTC-Spielereignisse
    useEffect(() => {
        if (!webRTC) {
            console.error("Keine WebRTC Verbindung verfügbar");
            setErrorMsg("Keine Verbindung zum Peer verfügbar.");
            return;
        }

        console.log("Richte Spielereignis-Listener in WebRTCMultiplayerGame ein");

        // Lese Punktzahlen aus den Spielern
        const updatePlayerScores = () => {
            const scores = players.map(player => ({
                id: player.id,
                name: player.name,
                score: player.score
            }));
            setPlayerScores(scores);
        };

        // Aktualisiere Punktzahlen bei Spielerlisten-Änderungen
        updatePlayerScores();

        // Registriere Callbacks
        webRTC.registerCallbacks({
            onGameStarted: (gameState) => {
                console.log("Spiel gestartet Event empfangen:", gameState);
                
                // Detaillierteres Logging
                console.log(`Empfangene Fragen: ${gameState.questions.length}`);
                
                // Defensives Validieren mit besserem Feedback
                if (!gameState || !gameState.questions || !Array.isArray(gameState.questions) || gameState.questions.length === 0) {
                    console.error("❌ Ungültige Daten im game-started Event:", gameState);
                    setErrorMsg("Ungültige Spielstart-Daten empfangen. Versuche Neustart...");
                    return;
                }

                // Verhindere doppelte Initialisierungen
                if (initComplete && questions.length > 0) {
                    console.log("⚠️ Spiel bereits initialisiert, ignoriere doppeltes game-started Event");
                    return;
                }

                console.log(`✅ Erfolgreich ${gameState.questions.length} Fragen empfangen`);

                // Sichere Fragen für mögliche Wiederherstellung
                localStorage.setItem('lastGameQuestions', JSON.stringify(gameState.questions));
                localStorage.setItem('lastGameTimestamp', Date.now().toString());

                // Setze Spielstatus - Reihenfolge ist wichtig!
                setQuestions(gameState.questions);
                setCurrentQuestionIndex(0);
                setInitComplete(true);
                setErrorMsg(null);

                // Initialisiere Spiel im Kontext
                startGameContext('multiplayer', gameState.questions);
            },
            
            onPlayerAnswer: (data) => {
                console.log("Spieler hat geantwortet:", data);
                updatePlayerScores();
            },
            
            onAllPlayersAnswered: (questionIndex, playerScores) => {
                console.log("Alle Spieler haben Frage beantwortet", questionIndex);
                updatePlayerScores();
                setWaitingForOthers(false);

                // Wenn dies die letzte Frage war, beende das Spiel
                if (questionIndex >= questions.length - 1) {
                    console.log("Letzte Frage beantwortet, bereite Spielende vor");
                    if (isHost) {
                        // Das Spielende wird durch onGameEnded verarbeitet
                    }
                }
            },
            
            onNextQuestion: (nextIndex) => {
                console.log("Wechsel zur nächsten Frage:", nextIndex);
                setCurrentQuestionIndex(nextIndex);
                setWaitingForOthers(false);
            },
            
            onQuestionTimerEnded: (questionIndex) => {
                console.log("Timer für Frage abgelaufen:", questionIndex);
                // Zeit ist abgelaufen, aber noch nicht geantwortet
                if (waitingForOthers === false) {
                    // Automatische Antwort senden (-1 für keine Antwort)
                    handleAnswerQuestion(-1);
                }
            },
            
            onGameEnded: (results) => {
                console.log("Spiel beendet mit Ergebnissen:", results);
                setGameEnded(true);

                if (results) {
                    setPlayerScores(results.playerScores || []);
                    setGameResult({
                        winners: results.winners || [],
                        isDraw: results.isDraw || false
                    });

                    // Bestimme das Ergebnis für den lokalen Spieler
                    const isWinner = results.winners?.some((w: PlayerScore) => w.id === playerId);
                    let result: 'win' | 'loss' | 'draw' = 'draw';

                    if (results.isDraw) {
                        result = 'draw';
                    } else if (isWinner) {
                        result = 'win';
                    } else {
                        result = 'loss';
                    }

                    // Aktualisiere lokalen Spielstand
                    endGame(result);
                }
            },
            
            onError: (message) => {
                console.error("WebRTC Fehler:", message);
                setErrorMsg(message || "Ein Fehler ist aufgetreten");
            }
        });

        // Bereinigungsfunktion
        return () => {
            // WebRTC-Service behält seine Callbacks intern bei
        };
    }, [webRTC, players, isHost, questions.length, endGame, startGameContext, playerId, waitingForOthers]);

    // Frage beantworten
    const handleAnswerQuestion = (answer: number) => {
        if (!webRTC || !initComplete) return;

        console.log("Sende Antwort:", { roomId, playerId, questionIndex: currentQuestionIndex, answer });
        answerQuestionWebRTC(currentQuestionIndex, answer);

        setWaitingForOthers(true);
    };

    // Zur nächsten Frage (nur für Host)
    const handleNextQuestion = () => {
        if (!webRTC || !isHost || !initComplete) return;

        console.log("Host wechselt zur nächsten Frage von Index", currentQuestionIndex);
        nextQuestionWebRTC();
    };

    // Spiel verlassen
    const handleLeaveGame = () => {
        leaveRoom();
        onLeave();
    };

    // Status-Aktualisierung erzwingen
    const handleForceRefresh = () => {
        if (!webRTC) return;

        setErrorMsg("Verbindung wird neu aufgebaut...");
        
        // Kurze Pause, dann die Seite neu laden
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    // Berechne Punktzahl des aktuellen Spielers
    const currentPlayerScore = playerScores.find(p => p.id === playerId)?.score || 0;

    // Berechne Punktzahlen der Gegner
    const opponentScores = playerScores.filter(p => p.id !== playerId);

    // Berechne aktuellen Spielzustand für Logging
    const gameStatus = {
        initComplete,
        questionsLength: questions.length,
        currentQuestionIndex,
        waitingForOthers,
        gameEnded
    };

    if (debugMode) {
        console.log("Spielzustand:", gameStatus);
    }

    return (
        <div>
            {!gameEnded ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Card className="w-full p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm text-violet-300">Raum</span>
                                    <h3 className="font-medium">{roomId}</h3>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDebugMode(!debugMode)}
                                    >
                                        {debugMode ? "Debug aus" : "Debug an"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleLeaveGame}>
                                        Spiel verlassen
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Card className="p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="text-lg mr-2">👤</div>
                                    <div>
                                        <div className="font-medium">{playerName}</div>
                                        <div className="text-sm text-violet-300">
                                            Du {isHost && <span>(Host)</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xl font-bold">
                                    {currentPlayerScore}
                                </div>
                            </div>
                        </Card>

                        {opponentScores.map(opponent => (
                            <Card className="p-4" key={opponent.id}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <div className="text-lg mr-2">👤</div>
                                        <div>
                                            <div className="font-medium">{opponent.name}</div>
                                            <div className="text-sm text-violet-300">Gegner</div>
                                        </div>
                                    </div>

                                    <div className="text-xl font-bold">
                                        {opponent.score}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Debug-Informationen */}
                    {debugMode && (
                        <Card className="bg-gray-800 p-4 text-xs font-mono">
                            <div className="overflow-auto max-h-40">
                                <pre>{JSON.stringify({
                                    initComplete,
                                    questionsLength: questions.length,
                                    currentIndex: currentQuestionIndex,
                                    waitingForOthers,
                                    isHost,
                                    webRTCConnected: isConnected,
                                    firstQuestion: questions[0] ?
                                        { id: questions[0].id, question: questions[0].question } :
                                        null
                                }, null, 2)}</pre>
                            </div>
                        </Card>
                    )}

                    {/* Fehlermeldung */}
                    {errorMsg && (
                        <Card className="p-4 bg-red-600/20 border border-red-600/40">
                            <div className="flex items-center mb-2">
                                <div className="text-lg mr-2">⚠️</div>
                                <p className="font-medium text-red-300">{errorMsg}</p>
                            </div>
                            <div className="flex space-x-2">
                                <Button variant="primary" size="sm" onClick={handleForceRefresh}>
                                    Spielstatus aktualisieren
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setErrorMsg(null)}>
                                    Schließen
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Hauptspielinhalt */}
                    {initComplete && questions.length > 0 && currentQuestionIndex < questions.length ? (
                        <div>
                            <div className="mb-4 flex justify-between items-center">
                                <div>
                                    <span className="text-sm font-medium text-violet-300">Frage</span>
                                    <h2 className="text-xl font-bold">
                                        {currentQuestionIndex + 1} / {questions.length}
                                    </h2>
                                </div>
                            </div>

                            <QuestionCard
                                question={questions[currentQuestionIndex]}
                                onAnswer={handleAnswerQuestion}
                                onNext={handleNextQuestion}
                                isMultiplayer={true}
                                isHost={isHost}
                                waitingForOthers={waitingForOthers}
                            />
                        </div>
                    ) : (
                        <Card className="text-center p-6">
                            {!initComplete ? (
                                <>
                                    <h3 className="text-xl font-bold mb-4">Spiel wird initialisiert...</h3>
                                    <p className="mb-6">
                                        Warte auf Daten vom Peer... {questions.length > 0 ?
                                        `(${questions.length} Fragen empfangen)` : ''}
                                    </p>

                                    <Button variant="secondary" onClick={handleForceRefresh}>
                                        Status aktualisieren
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold mb-4">Alle Fragen beantwortet!</h3>
                                    <p className="mb-6">Warte auf die anderen Spieler...</p>
                                </>
                            )}
                        </Card>
                    )}
                </div>
            ) : (
                <Card className="text-center p-6">
                    <h2 className="text-2xl font-bold mb-6">Spielergebnis</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        {playerScores.map(player => (
                            <div
                                key={player.id}
                                className={`bg-white/5 p-4 rounded-lg ${
                                    gameResult?.winners.some(w => w.id === player.id)
                                        ? 'border-2 border-green-500'
                                        : ''
                                }`}
                            >
                                <div className="text-lg mb-1">
                                    {player.name}
                                    {player.id === playerId && (
                                        <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                                            Du
                                        </span>
                                    )}
                                </div>
                                <div className="text-3xl font-bold">{player.score}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-8">
                        {gameResult?.isDraw ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">🤝</div>
                                <h3 className="text-xl font-bold text-blue-400">Unentschieden!</h3>
                            </motion.div>
                        ) : gameResult?.winners.some(w => w.id === playerId) ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">🏆</div>
                                <h3 className="text-xl font-bold text-green-400">Du hast gewonnen!</h3>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="text-4xl mb-2">😢</div>
                                <h3 className="text-xl font-bold text-orange-400">Du hast verloren</h3>
                            </motion.div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="primary" onClick={onBackToLobby}>
                            Zurück zur Lobby
                        </Button>
                        <Button variant="outline" onClick={handleLeaveGame}>
                            Spiel verlassen
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default WebRTCMultiplayerGame;
EOL

# Erstellen der WebRTC MultiplayerPage
echo -e "${YELLOW}11. WebRTC MultiplayerPage erstellen...${NC}"

cat > src/pages/WebRTCMultiplayerPage.tsx << 'EOL'
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
EOL

# Aktualisiere main.tsx um den WebRTCProvider hinzuzufügen
echo -e "${YELLOW}12. Aktualisiere main.tsx...${NC}"

cat > src/main.tsx << 'EOL'
// ========== src/main.tsx ==========
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GameProvider } from './  /**
   * Startet einen Ping-Intervall, um die Verbindung aufrechtzuerhalten
   */
  private startPingInterval(): void {
    // Stoppe einen eventuell laufenden Ping-Intervall
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Sende alle 30 Sekunden einen Ping an den Server
    this.pingInterval = setInterval(() => {
      if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          sender: this.playerId,
          roomId: this.roomId
        });
      }
    }, 30000);
  }

  /**
   * Versucht, die Verbindung wiederherzustellen
   */
  private attemptReconnect(): void {
    // Vermeide mehrfache gleichzeitige Wiederverbindungsversuche
    if (this.reconnectTimer) {
      return;
    }

    // Prüfe, ob die maximale Anzahl von Versuchen erreicht wurde
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximale Anzahl von Wiederverbindungsversuchen erreicht');
      
      if (this.callbacks.onError) {
        this.callbacks.onError('Verbindung konnte nicht wiederhergestellt werden');
      }
      
      this.cleanup();
      return;
    }

    this.reconnectAttempts++;
    console.log(`Wiederverbindungsversuch ${this.reconnectAttempts} von ${this.maxReconnectAttempts}`);

    // Warte einen Moment, bevor die Wiederverbindung versucht wird
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      if (this.isHost) {
        this.createRoom(this.playerName, this.roomId)
          .then(() => {
            console.log('Wiederverbindung als Host erfolgreich');
            
            if (this.callbacks.onReconnect) {
              this.callbacks.onReconnect();
            }
          })
          .catch(error => {
            console.error('Wiederverbindung als Host fehlgeschlagen:', error);
            this.attemptReconnect();
          });
      } else {
        this.joinRoom(this.playerName, this.roomId)
          .then(() => {
            console.log('Wiederverbindung als Gast erfolgreich');
            
            if (this.callbacks.onReconnect) {
              this.callbacks.onReconnect();
            }
          })
          .catch(error => {
            console.error('Wiederverbindung als Gast fehlgeschlagen:', error);
            this.attemptReconnect();
          });
      }
    }, this.reconnectDelay);
  }

  /**
   * Bereinigt alle Ressourcen
   */
  private cleanup(): void {
    // Stoppe alle Timer
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Schließe den Datenkanal
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Schließe die Peer-Verbindung
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Setze den Status zurück
    this.isConnected = false;
    this.gameState = null;
    this.roomId = '';
    this.isHost = false;
  }

  /**
   * Gibt den aktuellen Spieler-ID zurück
   */
  public getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Gibt zurück, ob der Spieler der Host ist
   */
  public isHostPlayer(): boolean {
    return this.isHost;
  }

  /**
   * Gibt zurück, ob eine Verbindung zum Peer besteht
   */
  public isConnectedToPeer(): boolean {
    return this.isConnected;
  }

  /**
   * Gibt den aktuellen Spielstatus zurück
   */
  public getGameState(): GameState | null {
    return this.gameState;
  }
}

export default WebRTCService;
EOL

# Erstellen des WebRTC-Context
echo -e "${YELLOW}7. WebRTC-Context erstellen...${NC}"
mkdir -p src/store

cat > src/store/WebRTCContext.tsx << 'EOL'
// src/store/WebRTCContext.tsx
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import WebRTCService from '../services/webRTCService';
import { Question } from '../types';

interface WebRTCContextProps {
  webRTC: WebRTCService | null;
  isConnected: boolean;
  isSignalingConnected: boolean;
  connectionState: string;
  currentRoom: string | null;
  isHost: boolean;
  players: PlayerInfo[];
  error: string | null;
  connectToSignalingServer: () => Promise<void>;
  createRoom: (playerName: string, roomId: string) => Promise<string>;
  joinRoom: (playerName: string, roomId: string) => Promise<void>;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  startGame: (questions: Question[]) => void;
  answerQuestion: (questionIndex: number, answer: number) => void;
  nextQuestion: () => void;
}

interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

interface WebRTCProviderProps {
  children: ReactNode;
}

const WebRTCContext = createContext<WebRTCContextProps | undefined>(undefined);

// Signaling-Server-URL basierend auf der aktuellen Domain
const getSignalingServerUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/games/brain-buster/api/socket.io/`;
};

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
  const [webRTC, setWebRTC] = useState<WebRTCService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialisiere den WebRTC-Service
  useEffect(() => {
    const webRTCService = new WebRTCService();
    
    // Registriere Callbacks
    webRTCService.registerCallbacks({
      onConnectionStateChange: (state) => {
        console.log('WebRTC Verbindungsstatus:', state);
        setConnectionState(state);
        setIsConnected(state === 'connected');
      },
      onPlayerJoined: (player) => {
        console.log('Spieler beigetreten:', player);
      },
      onPlayerLeft: (playerId) => {
        console.log('Spieler hat verlassen:', playerId);
      },
      onPlayersUpdate: (updatedPlayers) => {
        console.log('Spielerliste aktualisiert:', updatedPlayers);
        setPlayers(updatedPlayers);
      },
      onError: (message) => {
        console.error('WebRTC Fehler:', message);
        setError(message);
      }
    });
    
    setWebRTC(webRTCService);
    
    // Bereinige beim Unmounten
    return () => {
      // Keine explizite Bereinigung nötig, da der Service selbst bereinigt
    };
  }, []);

  // Verbinde mit dem Signaling-Server
  const connectToSignalingServer = async () => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return Promise.reject('WebRTC-Service nicht initialisiert');
    }
    
    try {
      const serverUrl = getSignalingServerUrl();
      console.log('Verbinde mit Signaling-Server:', serverUrl);
      
      await webRTC.connectToSignalingServer(serverUrl);
      setIsSignalingConnected(true);
      setError(null);
      return Promise.resolve();
    } catch (error) {
      console.error('Fehler bei der Verbindung mit dem Signaling-Server:', error);
      setError(`Fehler bei der Verbindung: ${error}`);
      setIsSignalingConnected(false);
      return Promise.reject(error);
    }
  };

  // Erstelle einen neuen Raum
  const createRoom = async (playerName: string, roomId: string) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return Promise.reject('WebRTC-Service nicht initialisiert');
    }
    
    if (!isSignalingConnected) {
      try {
        await connectToSignalingServer();
      } catch (error) {
        return Promise.reject('Keine Verbindung zum Signaling-Server');
      }
    }
    
    try {
      const createdRoomId = await webRTC.createRoom(playerName, roomId);
      setCurrentRoom(createdRoomId);
      setIsHost(true);
      setError(null);
      return createdRoomId;
    } catch (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      setError(`Fehler beim Erstellen des Raums: ${error}`);
      return Promise.reject(error);
    }
  };

  // Tritt einem existierenden Raum bei
  const joinRoom = async (playerName: string, roomId: string) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return Promise.reject('WebRTC-Service nicht initialisiert');
    }
    
    if (!isSignalingConnected) {
      try {
        await connectToSignalingServer();
      } catch (error) {
        return Promise.reject('Keine Verbindung zum Signaling-Server');
      }
    }
    
    try {
      await webRTC.joinRoom(playerName, roomId);
      setCurrentRoom(roomId);
      setIsHost(false);
      setError(null);
      return Promise.resolve();
    } catch (error) {
      console.error('Fehler beim Beitreten zum Raum:', error);
      setError(`Fehler beim Beitreten zum Raum: ${error}`);
      return Promise.reject(error);
    }
  };

  // Verlasse den aktuellen Raum
  const leaveRoom = () => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    webRTC.leaveRoom();
    setCurrentRoom(null);
    setIsHost(false);
    setPlayers([]);
  };

  // Setze den Bereit-Status
  const setReady = (isReady: boolean) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    webRTC.setReady(isReady);
  };

  // Starte das Spiel
  const startGame = (questions: Question[]) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    if (!isHost) {
      setError('Nur der Host kann das Spiel starten');
      return;
    }
    
    webRTC.startGame(questions);
  };

  // Beantworte eine Frage
  const answerQuestion = (questionIndex: number, answer: number) => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    webRTC.answerQuestion(questionIndex, answer);
  };

  // Gehe zur nächsten Frage
  const nextQuestion = () => {
    if (!webRTC) {
      setError('WebRTC-Service nicht initialisiert');
      return;
    }
    
    if (!isHost) {
      setError('Nur der Host kann zur nächsten Frage wechseln');
      return;
    }
    
    webRTC.nextQuestion();
  };

  const value = {
    webRTC,
    isConnected,
    isSignalingConnected,
    connectionState,
    currentRoom,
    isHost,
    players,
    error,
    connectToSignalingServer,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    answerQuestion,
    nextQuestion
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  
  return context;
};
EOL

# Erstellen des WebRTC MultiplayerSetup
echo -e "${YELLOW}8. WebRTC MultiplayerSetup erstellen...${NC}"
mkdir -p src/components/multiplayer

cat > src/components/multiplayer/WebRTCMultiplayerSetup.tsx << 'EOL'
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
EOL

# Erstellen des WebRTC MultiplayerLobby
echo -e "${YELLOW}9. WebRTC MultiplayerLobby erstellen...${NC}"

cat > src/components/multiplayer/WebRTCMultiplayerLobby.tsx << 'EOL'
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
EOL

# Erstellen des WebRTC MultiplayerGame
echo -e "${YELLOW}10.#!/bin/bash

# Installationsskript für WebRTC in BrainBuster

# Farbige Ausgabe für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}BrainBuster WebRTC-Integration${NC}"
echo -e "${GREEN}=======================================${NC}"

# Prüfen, ob das aktuelle Verzeichnis korrekt ist
if [ ! -d "frontend" ] || [ ! -d "frontend/src" ]; then
  echo -e "${RED}Fehler: Dieses Skript muss im Hauptverzeichnis des BrainBuster-Projekts ausgeführt werden${NC}"
  echo "Das Verzeichnis sollte 'frontend' und 'frontend/src' enthalten"
  exit 1
fi

echo -e "${YELLOW}1. Backend-Abhängigkeiten installieren...${NC}"
cd backend || exit 1
# Sichern der vorhandenen package.json
cp package.json package.json.backup
# Kopieren der neuen package.json in das Verzeichnis
cat > package.json << 'EOL'
{
  "name": "brain-buster-backend",
  "version": "1.0.0",
  "description": "Backend-Server für das BrainBuster Quiz-Spiel mit WebRTC-Unterstützung",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "nodemon src/server.ts",
    "watch": "tsc -w"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "socket.io": "^4.8.1",
    "uuid": "^11.1.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.9.0",
    "@types/uuid": "^9.0.7",
    "@types/ws": "^8.5.10",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2"
  }
}
EOL

# Installieren der Abhängigkeiten
npm install
echo -e "${GREEN}Backend-Abhängigkeiten erfolgreich installiert.${NC}"

# WebRTC-Signaling-Server erstellen
echo -e "${YELLOW}2. WebRTC-Signaling-Server erstellen...${NC}"
cat > src/signaling-server.ts << 'EOL'
// backend/src/signaling-server.ts
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Einfache Strukturen für Spieler und Räume
interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

interface Room {
  id: string;
  players: Player[];
  isGameStarted: boolean;
}

// Das Express-App und HTTP-Server erstellen
const app = express();
const server = http.createServer(app);

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../../')));

// Gesundheitscheck-Endpunkt
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Fallback-Route für SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// WebSocket-Server erstellen
const wss = new WebSocketServer({ server, path: '/socket.io/' });

// Räume speichern
const rooms: Map<string, Room> = new Map();

// WebSocket-Verbindungs-Handler
wss.on('connection', (ws: WebSocket) => {
  console.log('Neue WebSocket-Verbindung');

  let playerId = '';
  let currentRoomId = '';

  // Nachrichtenverarbeitung
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Nachricht:', error);
      sendTo(ws, {
        type: 'error',
        content: { message: 'Ungültige Nachricht' }
      });
    }
  });

  // Verbindungsabbruch
  ws.on('close', () => {
    console.log('WebSocket-Verbindung geschlossen');
    
    // Spieler aus dem Raum entfernen, wenn vorhanden
    if (currentRoomId && playerId) {
      handlePlayerLeave(currentRoomId, playerId);
    }
  });

  // Fehlerbehandlung
  ws.on('error', (error) => {
    console.error('WebSocket-Fehler:', error);
  });

  // Nachrichtenverarbeitung
  function handleMessage(ws: WebSocket, data: any): void {
    const { type, sender, roomId, content } = data;

    // Setze die Spieler-ID und den aktuellen Raum
    if (sender) playerId = sender;
    if (roomId) currentRoomId = roomId;

    console.log(`Nachricht empfangen: ${type} von ${sender} in Raum ${roomId}`);

    switch (type) {
      case 'create-room':
        handleCreateRoom(roomId, sender, content.playerName, ws);
        break;

      case 'join-room':
        handleJoinRoom(roomId, sender, content.playerName, ws);
        break;

      case 'leave':
        handlePlayerLeave(roomId, sender);
        break;

      case 'player-ready':
        handlePlayerReady(roomId, sender, content.isReady);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Einfaches Weiterleiten an den anderen Spieler im Raum
        forwardMessage(roomId, sender, data);
        break;

      case 'ping':
        // Ping-Antwort senden
        sendTo(ws, { type: 'pong' });
        break;

      default:
        console.warn(`Unbekannter Nachrichtentyp: ${type}`);
    }
  }

  // Raum erstellen
  function handleCreateRoom(roomId: string, playerId: string, playerName: string, ws: WebSocket): void {
    // Prüfe, ob der Raum bereits existiert
    if (rooms.has(roomId)) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Raum existiert bereits' }
      });
      return;
    }

    // Erstelle einen neuen Spieler
    const player: Player = {
      id: playerId,
      name: playerName,
      ws,
      isHost: true,
      isReady: false,
      score: 0
    };

    // Erstelle einen neuen Raum
    const room: Room = {
      id: roomId,
      players: [player],
      isGameStarted: false
    };

    // Speichere den Raum
    rooms.set(roomId, room);

    console.log(`Raum erstellt: ${roomId} von ${playerName} (${playerId})`);

    // Bestätige die Raumerstellung
    sendTo(ws, {
      type: 'room-created',
      content: { roomId, playerId }
    });

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Raum beitreten
  function handleJoinRoom(roomId: string, playerId: string, playerName: string, ws: WebSocket): void {
    // Prüfe, ob der Raum existiert
    if (!rooms.has(roomId)) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Raum existiert nicht' }
      });
      return;
    }

    const room = rooms.get(roomId)!;

    // Prüfe, ob das Spiel bereits gestartet ist
    if (room.isGameStarted) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Spiel bereits gestartet' }
      });
      return;
    }

    // Prüfe, ob der Raum bereits voll ist (max. 2 Spieler)
    if (room.players.length >= 2) {
      sendTo(ws, {
        type: 'error',
        content: { message: 'Raum ist voll' }
      });
      return;
    }

    // Erstelle einen neuen Spieler
    const player: Player = {
      id: playerId,
      name: playerName,
      ws,
      isHost: false,
      isReady: false,
      score: 0
    };

    // Füge den Spieler dem Raum hinzu
    room.players.push(player);

    console.log(`Spieler beigetreten: ${playerName} (${playerId}) in Raum ${roomId}`);

    // Informiere alle Spieler im Raum
    broadcastToRoom(roomId, {
      type: 'player-joined',
      content: {
        id: playerId,
        name: playerName,
        isHost: false,
        isReady: false,
        score: 0
      }
    });

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Spieler verlässt den Raum
  function handlePlayerLeave(roomId: string, playerId: string): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;
    const playerIndex = room.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    console.log(`Spieler verlässt Raum: ${player.name} (${playerId}) aus Raum ${roomId}`);

    // Entferne den Spieler aus dem Raum
    room.players.splice(playerIndex, 1);

    // Informiere alle verbleibenden Spieler
    broadcastToRoom(roomId, {
      type: 'player-left',
      content: { playerId }
    });

    // Wenn der Raum leer ist, entferne ihn
    if (room.players.length === 0) {
      console.log(`Raum wird entfernt: ${roomId}`);
      rooms.delete(roomId);
      return;
    }

    // Wenn der Host den Raum verlassen hat, mache den nächsten Spieler zum Host
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      console.log(`Neuer Host: ${room.players[0].name} (${room.players[0].id})`);
    }

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Spieler ändert Bereit-Status
  function handlePlayerReady(roomId: string, playerId: string, isReady: boolean): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;
    const player = room.players.find(p => p.id === playerId);

    if (!player) return;

    player.isReady = isReady;
    console.log(`Spieler ${player.name} (${playerId}) ist ${isReady ? 'bereit' : 'nicht bereit'}`);

    // Aktualisiere die Spielerliste
    broadcastPlayerList(roomId);
  }

  // Nachricht an alle Spieler im Raum weiterleiten
  function forwardMessage(roomId: string, senderId: string, message: any): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;

    // Sende die Nachricht an alle anderen Spieler im Raum
    room.players.forEach(player => {
      if (player.id !== senderId) {
        sendTo(player.ws, message);
      }
    });
  }

  // Aktualisiere die Spielerliste für alle Spieler im Raum
  function broadcastPlayerList(roomId: string): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;
    const players = room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      score: p.score
    }));

    broadcastToRoom(roomId, {
      type: 'player-list-updated',
      content: { players }
    });
  }

  // Sende eine Nachricht an alle Spieler im Raum
  function broadcastToRoom(roomId: string, message: any): void {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;

    room.players.forEach(player => {
      sendTo(player.ws, message);
    });
  }

  // Sende eine Nachricht an einen bestimmten WebSocket
  function sendTo(ws: WebSocket, message: any): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    }
  }
});

// Server starten
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling-Server läuft auf Port ${PORT}`);
});

export default server;
EOL

# Aktualisieren des Hauptserver-Skripts 
echo -e "${YELLOW}3. Hauptserver-Skript aktualisieren...${NC}"
cat > src/server.ts << 'EOL'
// Haupteinstiegspunkt für den Server
import './signaling-server';
console.log('BrainBuster Server mit WebRTC-Signalisierung gestartet');
EOL

# Bauen des Backend
echo -e "${YELLOW}4. Backend bauen...${NC}"
npm run build

cd ..

echo -e "${YELLOW}5. Frontend-Abhängigkeiten installieren...${NC}"
cd frontend || exit 1
# Sichern der vorhandenen package.json
cp package.json package.json.backup
# Kopieren der neuen package.json in das Verzeichnis
cat > package.json << 'EOL'
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "chart.js": "^4.4.8",
    "daisyui": "^5.0.9",
    "framer-motion": "^12.6.2",
    "localforage": "^1.10.0",
    "react": "^19.0.0",
    "react-chartjs-2": "^5.3.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.4.0",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.8.1",
    "uuid": "^11.1.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.21.0",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@types/simple-peer": "^9.11.8",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.21.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^15.15.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.24.1",
    "vite": "^6.2.0"
  }
}
EOL

# Installieren der Abhängigkeiten
npm install
echo -e "${GREEN}Frontend-Abhängigkeiten erfolgreich installiert.${NC}"

# Erstellen der WebRTC-Service-Datei
echo -e "${YELLOW}6. WebRTC-Service erstellen...${NC}"
mkdir -p src/services

cat > src/services/webRTCService.ts << 'EOL'
// src/services/webRTCService.ts
import { v4 as uuidv4 } from 'uuid';
import { Question } from '../types';

// Konfiguration für WebRTC 
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export interface RTCMessage {
  type: string;
  sender: string;
  roomId: string;
  content?: any;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
}

export interface GameState {
  questions: Question[];
  currentQuestionIndex: number;
  players: PlayerInfo[];
  answers: Record<string, number[]>; // playerId -> answers array
  timePerQuestion: number;
  startTime?: number;
}

export interface WebRTCCallbacks {
  onConnectionStateChange?: (state: string) => void;
  onPlayerJoined?: (player: PlayerInfo) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayersUpdate?: (players: PlayerInfo[]) => void;
  onGameStarted?: (gameState: GameState) => void;
  onQuestionTimerEnded?: (questionIndex: number) => void;
  onAllPlayersAnswered?: (questionIndex: number, playerScores: Record<string, number>) => void;
  onNextQuestion?: (nextIndex: number) => void;
  onGameEnded?: (results: any) => void;
  onError?: (message: string) => void;
  onReconnect?: () => void;
  onDcClose?: () => void;
  onPlayerAnswer?: (data: any) => void;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingServer: WebSocket | null = null;
  private playerId = uuidv4();
  private playerName = '';
  private roomId = '';
  private isHost = false;
  private isConnected = false;
  private pendingCandidates: RTCIceCandidate[] = [];
  private gameState: GameState | null = null;
  private callbacks: WebRTCCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private questionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Automatische Wiederverbindung beim Fenster-Neuladen
    window.addEventListener('beforeunload', () => {
      this.sendMessage({
        type: 'leave',
        sender: this.playerId,
        roomId: this.roomId
      });
    });
  }

  /**
   * Verbindet mit dem Signaling-Server
   */
  public connectToSignalingServer(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.signalingServer = new WebSocket(serverUrl);

        this.signalingServer.onopen = () => {
          console.log('Verbindung zum Signaling-Server hergestellt');
          this.startPingInterval();
          resolve();
        };

        this.signalingServer.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        };

        this.signalingServer.onerror = (error) => {
          console.error('Signaling-Server Fehler:', error);
          reject(error);
        };

        this.signalingServer.onclose = () => {
          console.log('Signaling-Server Verbindung geschlossen');
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Fehler beim Verbinden mit dem Signaling-Server:', error);
        reject(error);
      }
    });
  }

  /**
   * Erstellt einen neuen Raum als Host
   */
  public createRoom(playerName: string, roomId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.signalingServer || this.signalingServer.readyState !== WebSocket.OPEN) {
        reject(new Error('Keine Verbindung zum Signaling-Server'));
        return;
      }

      this.playerName = playerName;
      this.roomId = roomId;
      this.isHost = true;

      this.initializePeerConnection();

      // Erstelle einen Datenkanal als Anbieter
      this.dataChannel = this.peerConnection!.createDataChannel('gameChannel', {
        ordered: true
      });
      this.setupDataChannel();

      // Sende Raumerstellungsnachricht an den Signaling-Server
      this.sendMessage({
        type: 'create-room',
        sender: this.playerId,
        roomId: roomId,
        content: {
          playerName: this.playerName
        }
      });

      resolve(roomId);
    });
  }

  /**
   * Tritt einem existierenden Raum bei
   */
  public joinRoom(playerName: string, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.signalingServer || this.signalingServer.readyState !== WebSocket.OPEN) {
        reject(new Error('Keine Verbindung zum Signaling-Server'));
        return;
      }

      this.playerName = playerName;
      this.roomId = roomId;
      this.isHost = false;

      this.initializePeerConnection();

      // Sende Raumbetrittsnachricht an den Signaling-Server
      this.sendMessage({
        type: 'join-room',
        sender: this.playerId,
        roomId: roomId,
        content: {
          playerName: this.playerName
        }
      });

      resolve();
    });
  }

  /**
   * Setzt den Bereit-Status des Spielers
   */
  public setReady(isReady: boolean): void {
    this.sendMessage({
      type: 'player-ready',
      sender: this.playerId,
      roomId: this.roomId,
      content: {
        isReady: isReady
      }
    });
  }

  /**
   * Startet das Spiel (nur für den Host)
   */
  public startGame(questions: Question[]): void {
    if (!this.isHost) {
      console.error('Nur der Host kann das Spiel starten');
      return;
    }

    if (!this.isConnected) {
      console.error('Keine Verbindung zum Peer');
      return;
    }

    // Initialisiere den Spielstatus
    this.gameState = {
      questions: questions,
      currentQuestionIndex: 0,
      players: [], // Wird vom Signaling-Server befüllt
      answers: {},
      timePerQuestion: 20, // 20 Sekunden pro Frage
      startTime: Date.now()
    };

    // Sende Spielstart-Nachricht an alle Spieler
    this.sendGameMessage({
      type: 'game-started',
      content: {
        questions: questions,
        timePerQuestion: this.gameState.timePerQuestion,
        startTime: this.gameState.startTime
      }
    });

    // Starte den Timer für die erste Frage
    this.startQuestionTimer();
  }

  /**
   * Beantwortet eine Frage
   */
  public answerQuestion(questionIndex: number, answer: number): void {
    if (!this.gameState) {
      console.error('Spiel wurde noch nicht gestartet');
      return;
    }

    // Speichere die Antwort lokal
    if (!this.gameState.answers[this.playerId]) {
      this.gameState.answers[this.playerId] = [];
    }
    this.gameState.answers[this.playerId][questionIndex] = answer;

    // Sende die Antwort an den Host
    this.sendGameMessage({
      type: 'player-answer',
      content: {
        questionIndex: questionIndex,
        answer: answer,
        playerId: this.playerId,
        playerName: this.playerName
      }
    });
  }

  /**
   * Wechselt zur nächsten Frage (nur für den Host)
   */
  public nextQuestion(): void {
    if (!this.isHost || !this.gameState) {
      return;
    }

    // Stoppe den aktuellen Timer
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }

    const nextIndex = this.gameState.currentQuestionIndex + 1;
    
    // Prüfe, ob das Spiel beendet ist
    if (nextIndex >= this.gameState.questions.length) {
      this.endGame();
      return;
    }

    // Aktualisiere den Index
    this.gameState.currentQuestionIndex = nextIndex;

    // Informiere alle Spieler über die nächste Frage
    this.sendGameMessage({
      type: 'next-question',
      content: {
        nextQuestionIndex: nextIndex
      }
    });

    // Starte den Timer für die nächste Frage
    this.startQuestionTimer();
  }

  /**
   * Beendet das Spiel und berechnet die Ergebnisse
   */
  private endGame(): void {
    if (!this.isHost || !this.gameState) {
      return;
    }

    // Berechne die Punktzahlen für alle Spieler
    const playerScores: Record<string, number> = {};
    const playerResults: any[] = [];

    this.gameState.players.forEach(player => {
      const answers = this.gameState!.answers[player.id] || [];
      let correctCount = 0;

      // Zähle korrekte Antworten
      answers.forEach((answer, index) => {
        if (index < this.gameState!.questions.length) {
          const isCorrect = answer === this.gameState!.questions[index].correctAnswer;
          if (isCorrect) correctCount++;
        }
      });

      playerScores[player.id] = correctCount;
      playerResults.push({
        id: player.id,
        name: player.name,
        score: correctCount,
        isHost: player.isHost
      });
    });

    // Bestimme den Gewinner oder Unentschieden
    const maxScore = Math.max(...Object.values(playerScores));
    const winners = playerResults.filter(player => player.score === maxScore);
    const isDraw = winners.length > 1;

    // Sende Spielende-Nachricht an alle Spieler
    this.sendGameMessage({
      type: 'game-ended',
      content: {
        results: {
          playerScores: playerResults,
          winners: winners,
          isDraw: isDraw
        }
      }
    });

    // Setze den Spielstatus zurück
    this.gameState = null;
  }

  /**
   * Verlässt den aktuellen Raum
   */
  public leaveRoom(): void {
    // Informiere andere Spieler
    this.sendMessage({
      type: 'leave',
      sender: this.playerId,
      roomId: this.roomId
    });

    // Bereinige den lokalen Zustand
    this.cleanup();
  }

  /**
   * Registriert Callback-Funktionen für verschiedene Ereignisse
   */
  public registerCallbacks(callbacks: WebRTCCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Initialisiert die Peer-Verbindung
   */
  private initializePeerConnection(): void {
    // Bereinige zuerst eventuell vorhandene Verbindungen
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(iceServers);

    // Überwache Verbindungsänderungen
    this.peerConnection.onconnectionstatechange = () => {
      console.log('WebRTC Verbindungsstatus:', this.peerConnection?.connectionState);
      
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(this.peerConnection?.connectionState || 'unknown');
      }

      if (this.peerConnection?.connectionState === 'connected') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
      } else if (this.peerConnection?.connectionState === 'disconnected' || 
                this.peerConnection?.connectionState === 'failed') {
        this.isConnected = false;
        this.attemptReconnect();
      }
    };

    // ICE-Kandidaten-Handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'ice-candidate',
          sender: this.playerId,
          roomId: this.roomId,
          content: event.candidate
        });
      }
    };

    // Datenkanal-Handler (als Empfänger)
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  /**
   * Richtet den Datenkanal ein
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Datenkanal geöffnet');
      this.isConnected = true;
      
      // Sende ausstehende ICE-Kandidaten
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift();
        if (candidate) {
          this.sendMessage({
            type: 'ice-candidate',
            sender: this.playerId,
            roomId: this.roomId,
            content: candidate
          });
        }
      }
    };

    this.dataChannel.onclose = () => {
      console.log('Datenkanal geschlossen');
      this.isConnected = false;
      
      if (this.callbacks.onDcClose) {
        this.callbacks.onDcClose();
      }
      
      this.attemptReconnect();
    };

    this.dataChannel.onerror = (error) => {
      console.error('Datenkanal Fehler:', error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError('Datenkanal-Fehler aufgetreten');
      }
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (error) {
        console.error('Fehler beim Verarbeiten der Datenkanal-Nachricht:', error);
      }
    };
  }

  /**
   * Verarbeitet eingehende Signaling-Nachrichten
   */
  private handleSignalingMessage(message: RTCMessage): void {
    console.log('Signaling-Nachricht empfangen:', message.type);

    switch (message.type) {
      case 'room-created':
        console.log('Raum erstellt:', message.content);
        // Erstelle das Angebot
        this.createOffer();
        break;

      case 'offer':
        // Verarbeite das Angebot und erstelle eine Antwort
        this.handleOffer(message.content);
        break;

      case 'answer':
        // Verarbeite die Antwort
        this.handleAnswer(message.content);
        break;

      case 'ice-candidate':
        // Füge den ICE-Kandidaten hinzu
        this.addIceCandidate(message.content);
        break;

      case 'player-joined':
        // Ein neuer Spieler ist dem Raum beigetreten
        if (this.callbacks.onPlayerJoined) {
          this.callbacks.onPlayerJoined(message.content);
        }
        break;

      case 'player-left':
        // Ein Spieler hat den Raum verlassen
        if (this.callbacks.onPlayerLeft) {
          this.callbacks.onPlayerLeft(message.content.playerId);
        }
        break;

      case 'player-list-updated':
        // Die Spielerliste wurde aktualisiert
        if (this.callbacks.onPlayersUpdate) {
          this.callbacks.onPlayersUpdate(message.content.players);
        }
        
        // Aktualisiere lokale Spielerliste, wenn ein Spiel läuft
        if (this.gameState) {
          this.gameState.players = message.content.players;
        }
        break;

      case 'error':
        // Ein Fehler ist aufgetreten
        console.error('Fehler vom Signaling-Server:', message.content.message);
        
        if (this.callbacks.onError) {
          this.callbacks.onError(message.content.message);
        }
        break;

      case 'pong':
        // Ping-Antwort vom Server
        break;

      default:
        console.warn('Unbekannter Nachrichtentyp:', message.type);
    }
  }

  /**
   * Verarbeitet eingehende Datenkanal-Nachrichten
   */
  private handleDataChannelMessage(message: any): void {
    console.log('Datenkanal-Nachricht empfangen:', message.type);

    switch (message.type) {
      case 'game-started':
        // Spiel wurde gestartet
        this.gameState = {
          questions: message.content.questions,
          currentQuestionIndex: 0,
          players: this.gameState?.players || [],
          answers: {},
          timePerQuestion: message.content.timePerQuestion,
          startTime: message.content.startTime
        };

        if (this.callbacks.onGameStarted) {
          this.callbacks.onGameStarted(this.gameState);
        }

        break;

      case 'player-answer':
        // Ein Spieler hat eine Frage beantwortet
        if (this.isHost && this.gameState) {
          const { playerId, questionIndex, answer } = message.content;
          
          // Speichere die Antwort
          if (!this.gameState.answers[playerId]) {
            this.gameState.answers[playerId] = [];
          }
          this.gameState.answers[playerId][questionIndex] = answer;

          // Prüfe, ob alle Spieler geantwortet haben
          this.checkAllPlayersAnswered(questionIndex);
        }
        
        // Leite die Antwort an Callbacks weiter
        if (this.callbacks.onPlayerAnswer) {
          this.callbacks.onPlayerAnswer(message.content);
        }
        break;

      case 'all-players-answered':
        // Alle Spieler haben die aktuelle Frage beantwortet
        if (this.callbacks.onAllPlayersAnswered) {
          this.callbacks.onAllPlayersAnswered(
            message.content.questionIndex,
            message.content.playerScores
          );
        }
        break;

      case 'next-question':
        // Zur nächsten Frage wechseln
        if (this.gameState) {
          this.gameState.currentQuestionIndex = message.content.nextQuestionIndex;
        }

        if (this.callbacks.onNextQuestion) {
          this.callbacks.onNextQuestion(message.content.nextQuestionIndex);
        }
        break;

      case 'question-timer-ended':
        // Der Timer für eine Frage ist abgelaufen
        if (this.callbacks.onQuestionTimerEnded) {
          this.callbacks.onQuestionTimerEnded(message.content.questionIndex);
        }
        break;

      case 'game-ended':
        // Das Spiel wurde beendet
        if (this.callbacks.onGameEnded) {
          this.callbacks.onGameEnded(message.content.results);
        }
        
        // Setze den Spielstatus zurück
        this.gameState = null;
        break;

      default:
        console.warn('Unbekannter Datenkanal-Nachrichtentyp:', message.type);
    }
  }

  /**
   * Erstellt ein Angebot zur Verbindung
   */
  private async createOffer(): Promise<void> {
    try {
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      this.sendMessage({
        type: 'offer',
        sender: this.playerId,
        roomId: this.roomId,
        content: offer
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Angebots:', error);
    }
  }

  /**
   * Verarbeitet ein eingehendes Angebot
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.sendMessage({
        type: 'answer',
        sender: this.playerId,
        roomId: this.roomId,
        content: answer
      });
    } catch (error) {
      console.error('Fehler beim Verarbeiten des Angebots:', error);
    }
  }

  /**
   * Verarbeitet eine eingehende Antwort
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Antwort:', error);
    }
  }

  /**
   * Fügt einen ICE-Kandidaten hinzu
   */
  private async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Speichere den Kandidaten für später
        this.pendingCandidates.push(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen des ICE-Kandidaten:', error);
    }
  }

  /**
   * Sendet eine Nachricht über den Signaling-Server
   */
  private sendMessage(message: RTCMessage): void {
    if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
      this.signalingServer.send(JSON.stringify(message));
    } else {
      console.error('Keine Verbindung zum Signaling-Server');
    }
  }

  /**
   * Sendet eine Nachricht über den Datenkanal
   */
  private sendGameMessage(message: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        ...message,
        sender: this.playerId
      }));
    } else {
      console.error('Datenkanal ist nicht geöffnet');
      
      if (this.callbacks.onError) {
        this.callbacks.onError('Verbindung zum anderen Spieler verloren');
      }
      
      this.attemptReconnect();
    }
  }

  /**
   * Prüft, ob alle Spieler eine Frage beantwortet haben
   */
  private checkAllPlayersAnswered(questionIndex: number): void {
    if (!this.gameState || !this.isHost) return;

    // Prüfe, ob alle Spieler geantwortet haben
    const allAnswered = this.gameState.players.every(player => {
      const playerAnswers = this.gameState!.answers[player.id] || [];
      return playerAnswers[questionIndex] !== undefined;
    });

    if (allAnswered) {
      // Berechne die Punktzahlen für diese Frage
      const playerScores: Record<string, number> = {};
      
      this.gameState.players.forEach(player => {
        const answers = this.gameState!.answers[player.id] || [];
        const answer = answers[questionIndex];
        const isCorrect = answer === this.gameState!.questions[questionIndex].correctAnswer;
        
        // Aktualisiere den Spieler-Score
        playerScores[player.id] = (playerScores[player.id] || 0) + (isCorrect ? 1 : 0);
      });

      // Informiere alle Spieler
      this.sendGameMessage({
        type: 'all-players-answered',
        content: {
          questionIndex,
          playerScores
        }
      });
      
      // Stoppe den Timer, da alle geantwortet haben
      if (this.questionTimer) {
        clearTimeout(this.questionTimer);
        this.questionTimer = null;
      }
    }
  }

  /**
   * Startet den Timer für die aktuelle Frage
   */
  private startQuestionTimer(): void {
    if (!this.gameState || !this.isHost) return;

    // Stoppe einen eventuell laufenden Timer
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
    }

    const currentIndex = this.gameState.currentQuestionIndex;
    
    // Starte einen neuen Timer
    this.questionTimer = setTimeout(() => {
      console.log(`Timer für Frage ${currentIndex} abgelaufen`);
      
      // Informiere alle Spieler
      this.sendGameMessage({
        type: 'question-timer-ended',
        content: {
          questionIndex: currentIndex
        }
      });
      
      // Gehe zur nächsten Frage
      this.nextQuestion();
    }, this.gameState.timePerQuestion * 1000);
  }

  /**
   * Startet einen Ping-Intervall, um die Verbindung aufrechtzuerhalten
   */
  