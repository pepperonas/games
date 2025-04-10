// App.jsx - Mit Spieler-Profil und Statistiken
import React, {useEffect, useState} from 'react';
import './App.css';
import PongGame from './components/PongGame';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import OnlineConnectionScreen from './components/OnlineConnectionScreen';
import PlayerProfile from './components/PlayerProfile';
import StatsScreen from './components/StatsScreen';
import StatsService from './services/StatsService';

const App = () => {
    const [gameState, setGameState] = useState({
        screen: 'profile', // 'profile', 'start', 'game', 'gameOver', 'onlineConnection', 'stats'
        gameMode: 'singleplayer', // 'singleplayer', 'local-multiplayer', 'online-multiplayer'
        difficulty: 3, // 2=easy, 3=medium, 5=hard
        winner: '',
        isLocalPlayerWinner: false,
        isHost: false,
        scores: {left: 0, right: 0}
    });

    const [playerName, setPlayerName] = useState('');
    const [statsService, setStatsService] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [gameStartTime, setGameStartTime] = useState(null);
    const [ballExchanges, setBallExchanges] = useState(0);
    const [resetCounter, setResetCounter] = useState(0); // Counter für den Neustart des Spiels

    // Erkennen, ob es sich um ein mobiles Gerät handelt und Orientation prüfen
    useEffect(() => {
        const checkDeviceAndOrientation = () => {
            setIsMobile(window.innerWidth <= 768 ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0));

            setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
        };

        checkDeviceAndOrientation();

        // Event-Listener für Größenänderungen und Orientierungswechsel
        window.addEventListener('resize', checkDeviceAndOrientation);
        window.addEventListener('orientationchange', () => {
            setTimeout(checkDeviceAndOrientation, 100);
        });

        // Verhindere elastisches Scrollen auf iOS
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';

        // Fullscreen API für optimale Landscape-Nutzung
        const enableFullscreen = () => {
            if (document.documentElement.requestFullscreen && isLandscape) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed: ', err);
                });
            }
        };

        // Nur auf mobilen Geräten Fullscreen ermöglichen
        if (isMobile) {
            document.addEventListener('touchend', enableFullscreen, {once: true});
        }

        return () => {
            window.removeEventListener('resize', checkDeviceAndOrientation);
            window.removeEventListener('orientationchange', checkDeviceAndOrientation);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            if (isMobile) {
                document.removeEventListener('touchend', enableFullscreen);
            }
        };
    }, [isMobile, isLandscape]);

    const handleProfileSubmit = (name) => {
        setPlayerName(name);
        setStatsService(new StatsService(name));
        setGameState({
            ...gameState,
            screen: 'start'
        });
    };

    const handleSwitchPlayer = (newPlayerName = null) => {
        if (newPlayerName) {
            // Wenn ein bestimmter Spieler ausgewählt wurde, wechsle direkt zu diesem
            setPlayerName(newPlayerName);
            setStatsService(new StatsService(newPlayerName));
            // Setze diesen Spieler als zuletzt verwendeten Spieler
            localStorage.setItem('pongLastProfile', newPlayerName);
            // Bleibe im Start-Screen
        } else {
            // Wenn kein Spieler ausgewählt wurde, zeige Profile-Screen
            setGameState({
                ...gameState,
                screen: 'profile'
            });
        }
    };

    const startSinglePlayerGame = (difficulty) => {
        setGameState({
            ...gameState,
            screen: 'game',
            gameMode: 'singleplayer',
            difficulty: difficulty
        });

        // Starte das Statistik-Tracking für dieses Spiel
        if (statsService) {
            statsService.startNewGame('singleplayer', difficulty);
            setGameStartTime(new Date());
            setBallExchanges(0);
        }
    };

    const startLocalMultiplayerGame = () => {
        setGameState({
            ...gameState,
            screen: 'game',
            gameMode: 'local-multiplayer'
        });

        // Starte das Statistik-Tracking für dieses Spiel
        if (statsService) {
            statsService.startNewGame('local-multiplayer');
            setGameStartTime(new Date());
            setBallExchanges(0);
        }
    };

    const setupOnlineMultiplayer = () => {
        setGameState({
            ...gameState,
            screen: 'onlineConnection'
        });
    };

    const startOnlineMultiplayerGame = (isHost) => {
        setGameState({
            ...gameState,
            screen: 'game',
            gameMode: 'online-multiplayer',
            isHost: isHost
        });

        // Starte das Statistik-Tracking für dieses Spiel
        if (statsService) {
            statsService.startNewGame('online-multiplayer', null, 'Gegner');
            setGameStartTime(new Date());
            setBallExchanges(0);
        }
    };

    const handleGameOver = (winner, isLocalPlayerWinner) => {
        setGameState({
            ...gameState,
            screen: 'gameOver',
            winner: winner,
            isLocalPlayerWinner: isLocalPlayerWinner
        });

        // Beende das Statistik-Tracking für dieses Spiel
        if (statsService) {
            statsService.endGame(isLocalPlayerWinner);
        }
    };

    const returnToMainMenu = () => {
        setGameState({
            ...gameState,
            screen: 'start'
        });
    };

    const resetGame = () => {
        setGameState({
            ...gameState,
            screen: 'game',
            scores: {left: 0, right: 0}
        });

        // Erhöhe den Reset-Counter, um PongGame zu signalisieren,
        // dass es den Spielstatus zurücksetzen soll
        setResetCounter(prev => prev + 1);

        // Starte ein neues Spiel für das Statistik-Tracking
        if (statsService) {
            statsService.startNewGame(
                gameState.gameMode,
                gameState.gameMode === 'singleplayer' ? gameState.difficulty : null,
                gameState.gameMode === 'online-multiplayer' ? 'Gegner' : null
            );
            setGameStartTime(new Date());
            setBallExchanges(0);
        }
    };

    const showStatsScreen = () => {
        setGameState({
            ...gameState,
            screen: 'stats'
        });
    };

    const handleBallExchange = () => {
        setBallExchanges(prevCount => {
            const newCount = prevCount + 1;
            // Aktualisiere die Ballwechselzahl im StatsService
            if (statsService) {
                statsService.incrementBallExchanges();
            }
            return newCount;
        });
    };

    return (
        <div
            className={`app-container ${isMobile ? 'mobile-view' : ''} ${isLandscape ? 'landscape-view' : 'portrait-view'} ${gameState.screen === 'stats' ? 'stats-visible' : ''}`}>
            {gameState.screen === 'profile' && (
                <PlayerProfile onProfileSubmit={handleProfileSubmit}/>
            )}

            {gameState.screen === 'start' && (
                <StartScreen
                    onStartSinglePlayer={startSinglePlayerGame}
                    onStartLocalMultiplayer={startLocalMultiplayerGame}
                    onSetupOnlineMultiplayer={setupOnlineMultiplayer}
                    onShowStats={showStatsScreen}
                    playerName={playerName}
                    isMobile={isMobile}
                    isLandscape={isLandscape}
                    onSwitchPlayer={handleSwitchPlayer}
                />
            )}

            {gameState.screen === 'game' && (
                <PongGame
                    gameMode={gameState.gameMode}
                    difficulty={gameState.difficulty}
                    isHost={gameState.isHost}
                    onGameOver={handleGameOver}
                    onBallExchange={handleBallExchange}
                    isMobile={isMobile}
                    isLandscape={isLandscape}
                    resetCount={resetCounter}
                    playerName={playerName}
                    onMainMenu={returnToMainMenu}
                />
            )}

            {gameState.screen === 'gameOver' && (
                <GameOverScreen
                    winner={gameState.winner}
                    isLocalPlayerWinner={gameState.isLocalPlayerWinner}
                    onRestart={resetGame}
                    onMainMenu={returnToMainMenu}
                    gameMode={gameState.gameMode}
                    isHost={gameState.isHost}
                    isMobile={isMobile}
                    isLandscape={isLandscape}
                    ballExchanges={ballExchanges}
                    gameStartTime={gameStartTime}
                />
            )}

            {gameState.screen === 'onlineConnection' && (
                <OnlineConnectionScreen
                    onStartGame={startOnlineMultiplayerGame}
                    onBack={returnToMainMenu}
                    isMobile={isMobile}
                    isLandscape={isLandscape}
                />
            )}

            {gameState.screen === 'stats' && (
                <StatsScreen
                    playerName={playerName}
                    onBack={returnToMainMenu}
                />
            )}

            <footer className="footer">
                Made with ❤️ by Martin Pfeffer
            </footer>
        </div>
    );
};

export default App;