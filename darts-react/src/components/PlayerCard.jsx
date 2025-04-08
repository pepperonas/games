import React from 'react';

const PlayerCard = ({ player, isActive, isLeading, numSets, numLegs }) => {
    const legsNeeded = Math.ceil(numLegs / 2);
    const setsNeeded = Math.ceil(numSets / 2);

    return (
        <div className={`player-card ${isActive ? 'active' : ''}`}>
            {isActive && (
                <div className="player-turn-indicator">Aktuell am Zug</div>
            )}

            <div className="player-name">
                {/* Korrigierte Logik: Nur der führende Spieler erhält die Krone */}
                {isLeading ? (
                    <>
                        <span className="crown-icon">👑</span> {player.name}
                    </>
                ) : player.name}
            </div>

            <div className="player-score">{player.score}</div>

            <div className="average-score">Ø {player.averageScore.toFixed(1)}</div>

            <div className="leg-counter">
                {[...Array(legsNeeded)].map((_, i) => (
                    <div key={`leg-${i}`} className={`leg ${i < player.legsWon ? 'won' : ''}`}></div>
                ))}
            </div>

            <div className="set-counter">
                {[...Array(setsNeeded)].map((_, i) => (
                    <div key={`set-${i}`} className={`set ${i < player.setsWon ? 'won' : ''}`}></div>
                ))}
            </div>

            <div className="player-stats">
                <span>Darts: {player.dartsThrown}</span>
                <span>Aufnahmen: {Math.floor(player.dartsThrown / 3)}</span>
            </div>
        </div>
    );
};

export default PlayerCard;