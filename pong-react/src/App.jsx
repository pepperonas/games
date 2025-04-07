// App.jsx - Hauptkomponente
import React, { useState } from 'react';
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
    scores: { left: 0, right: 0 }
  });

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
      scores: { left: 0, right: 0 }
    });
  };

  return (
      <div className="app-container">
        {gameState.screen === 'start' && (
            <StartScreen
                onStartSinglePlayer={startSinglePlayerGame}
                onStartLocalMultiplayer={startLocalMultiplayerGame}
                onSetupOnlineMultiplayer={setupOnlineMultiplayer}
            />
        )}

        {gameState.screen === 'game' && (
            <PongGame
                gameMode={gameState.gameMode}
                difficulty={gameState.difficulty}
                isHost={gameState.isHost}
                onGameOver={handleGameOver}
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
            />
        )}

        {gameState.screen === 'onlineConnection' && (
            <OnlineConnectionScreen
                onStartGame={startOnlineMultiplayerGame}
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