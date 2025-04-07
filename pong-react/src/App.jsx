// App.jsx - Mit verbesserter Landscape-Unterstützung
import React, {useEffect, useState} from 'react';
import './App.css';
import PongGame from './components/PongGame';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import OnlineConnectionScreen from './components/OnlineConnectionScreen';

const App = () => {
    const [gameState, setGameState] = useState({
        screen: 'start', // 'start', 'game', 'gameOver', 'onlineConnection'
        gameMode: 'singleplayer', // 'singleplayer', 'local-multiplayer', 'online-multiplayer'
        difficulty: 3, // 2=easy, 3=medium, 5=hard
        winner: '',
        isLocalPlayerWinner: false,
        isHost: false,
        scores: {left: 0, right: 0}
    });

    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);

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

    const startSinglePlayerGame = (difficulty) => {
        setGameState({
            ...gameState,
            screen: 'game',
            gameMode: 'singleplayer',
            difficulty: difficulty
        });
    };

    const startLocalMultiplayerGame = () => {
        setGameState({
            ...gameState,
            screen: 'game',
            gameMode: 'local-multiplayer'
        });
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
    };

    const handleGameOver = (winner, isLocalPlayerWinner) => {
        setGameState({
            ...gameState,
            screen: 'gameOver',
            winner: winner,
            isLocalPlayerWinner: isLocalPlayerWinner
        });
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
    };

    return (
        <div
            className={`app-container ${isMobile ? 'mobile-view' : ''} ${isLandscape ? 'landscape-view' : 'portrait-view'}`}>
            {gameState.screen === 'start' && (
                <StartScreen
                    onStartSinglePlayer={startSinglePlayerGame}
                    onStartLocalMultiplayer={startLocalMultiplayerGame}
                    onSetupOnlineMultiplayer={setupOnlineMultiplayer}
                    isMobile={isMobile}
                    isLandscape={isLandscape}
                />
            )}

            {gameState.screen === 'game' && (
                <PongGame
                    gameMode={gameState.gameMode}
                    difficulty={gameState.difficulty}
                    isHost={gameState.isHost}
                    onGameOver={handleGameOver}
                    isMobile={isMobile}
                    isLandscape={isLandscape}
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

            <footer className="footer">
                Made with ❤️ by Martin Pfeffer
            </footer>
        </div>
    );
};

export default App;