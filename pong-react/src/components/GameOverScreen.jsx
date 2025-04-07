// components/GameOverScreen.jsx - Mit Spielstatistik-Anzeige
import React from 'react';
import './GameOverScreen.css';

const GameOverScreen = ({
                            winner,
                            isLocalPlayerWinner,
                            onRestart,
                            onMainMenu,
                            gameMode,
                            isHost,
                            ballExchanges,
                            gameStartTime
                        }) => {
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

    // Spielzeit berechnen
    const calculateGameTime = () => {
        if (!gameStartTime) return '0s';

        const endTime = new Date();
        const durationInSeconds = Math.floor((endTime - gameStartTime) / 1000);

        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    return (
        <div className="game-over">
            <h2>{winnerText}</h2>

            <div className="game-stats">
                <div className="stat-item">
                    <span className="stat-label">Spielzeit:</span>
                    <span className="stat-value">{calculateGameTime()}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Ballwechsel:</span>
                    <span className="stat-value">{ballExchanges}</span>
                </div>
            </div>

            <button onClick={onRestart} className="button restart-btn">Neu starten</button>
            <button onClick={onMainMenu} className="button menu-btn">Hauptmenü</button>
        </div>
    );
};

export default GameOverScreen;