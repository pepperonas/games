import React, { useState, useEffect } from 'react';

const PlayerStatistics = ({ players, gameStartTime, currentPlayerIndex, turnStartTime }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!gameStartTime) {
        return <div className="statistics-container">Noch kein Spiel gestartet.</div>;
    }

    // Calculate game duration
    const gameTimeInSeconds = Math.floor((currentTime - new Date(gameStartTime)) / 1000);
    const gameHours = Math.floor(gameTimeInSeconds / 3600);
    const gameMinutes = Math.floor((gameTimeInSeconds % 3600) / 60);
    const gameSeconds = gameTimeInSeconds % 60;
    const gameTimeFormatted = `${gameHours > 0 ? gameHours + 'h ' : ''}${gameMinutes}m ${gameSeconds.toString().padStart(2, '0')}s`;

    return (
        <div className="statistics-container" id="player-statistics">
            <div className="player-statistic">
                <div className="statistic-name">Spieldauer</div>
                <div className="statistic-value">{gameTimeFormatted}</div>
            </div>

            {players.map((player, index) => {
                // Calculate turn time for current player
                let turnTimeDisplay = '';
                if (index === currentPlayerIndex && turnStartTime) {
                    const turnTime = Math.floor((currentTime - new Date(turnStartTime)) / 1000);
                    const minutes = Math.floor(turnTime / 60);
                    const seconds = turnTime % 60;
                    turnTimeDisplay = `${minutes > 0 ? minutes + 'm ' : ''}${seconds.toString().padStart(2, '0')}s`;
                }

                return (
                    <div className="player-statistic" key={index}>
                        <div className="statistic-name">
                            {player.name}
                            {index === currentPlayerIndex && turnTimeDisplay && (
                                <span className="turn-timer">{turnTimeDisplay}</span>
                            )}
                        </div>

                        <div className="statistic-details">
                            <div className="statistic-item">
                                <span className="statistic-label">Durchschnitt</span>
                                <div className="statistic-value">{player.averageScore.toFixed(1)}</div>
                            </div>

                            <div className="statistic-item">
                                <span className="statistic-label">Höchste Aufnahme</span>
                                <div className="statistic-value">{player.highestScore || "0"}</div>
                            </div>

                            <div className="statistic-item">
                                <span className="statistic-label">Ø Zeit pro Zug</span>
                                <div className="statistic-value">
                                    {player.turnCount > 0 ? Math.floor(player.averageTurnTime) + 's' : '-'}
                                </div>
                            </div>

                            <div className="statistic-item">
                                <span className="statistic-label">Gesamtzeit</span>
                                <div className="statistic-value">
                                    {Math.floor(player.turnTime / 60) > 0 ? Math.floor(player.turnTime / 60) + 'm ' : ''}
                                    {Math.floor(player.turnTime % 60).toString().padStart(2, '0')}s
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PlayerStatistics;