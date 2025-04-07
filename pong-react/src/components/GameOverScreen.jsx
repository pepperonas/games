// components/GameOverScreen.jsx
import React from 'react';
import './GameOverScreen.css';

const GameOverScreen = ({ winner, isLocalPlayerWinner, onRestart, onMainMenu, gameMode, isHost }) => {
    let winnerText = '';

    if (winner === 'left') {
        if (gameMode === 'singleplayer') {
            winnerText = 'Du hast gewonnen!';
        } else if (gameMode === 'local-multiplayer') {
            winnerText = 'Spieler 1 hat gewonnen!';
        } else if (gameMode === 'online-multiplayer') {
            winnerText = isHost ? 'Du hast gewonnen!' : 'Gegner hat gewonnen!';
        }
    } else {
        if (gameMode === 'singleplayer') {
            winnerText = 'Computer hat gewonnen!';
        } else if (gameMode === 'local-multiplayer') {
            winnerText = 'Spieler 2 hat gewonnen!';
        } else if (gameMode === 'online-multiplayer') {
            winnerText = isHost ? 'Gegner hat gewonnen!' : 'Du hast gewonnen!';
        }
    }

    return (
        <div className="game-over">
            <h2>{winnerText}</h2>
            <button onClick={onRestart} className="button">Neu starten</button>
            <button onClick={onMainMenu} className="button">Hauptmenü</button>
        </div>
    );
};

export default GameOverScreen;