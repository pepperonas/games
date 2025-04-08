import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import PlayerCard from './PlayerCard.jsx';
import HistoryList from './HistoryList.jsx';
import PlayerStatistics from './PlayerStatistics.jsx';
import ScoreInput from './ScoreInput.jsx';
import RestartGameDialog from './RestartGameDialog.jsx';

const GameBoard = () => {
    const { gameState, undoLastThrow, resetGame, getLeadingPlayer } = useGame();
    const [showRestartConfirmation, setShowRestartConfirmation] = useState(false);
    const scoreInputRef = useRef(null);

    const leadingPlayer = getLeadingPlayer();

    // Finde den Spieler mit den wenigsten verbleibenden Punkten (über 0)
    const getPlayerWithLowestScore = () => {
        if (!gameState.players || gameState.players.length === 0) return null;

        // Filtere Spieler mit Score > 0
        const activePlayers = gameState.players.filter(player => player.score > 0);
        if (activePlayers.length === 0) return null;

        let lowestScorePlayer = activePlayers[0];
        activePlayers.forEach(player => {
            if (player.score < lowestScorePlayer.score) {
                lowestScorePlayer = player;
            }
        });

        return lowestScorePlayer;
    };

    const playerWithLowestScore = getPlayerWithLowestScore();

    useEffect(() => {
        // Focus on score input when component mounts
        if (scoreInputRef.current) {
            scoreInputRef.current.focus();
        }
    }, []);

    const handleRestartClick = () => {
        setShowRestartConfirmation(true);
    };

    const handleConfirmRestart = () => {
        resetGame();
        setShowRestartConfirmation(false);
    };

    const handleCancelRestart = () => {
        setShowRestartConfirmation(false);
    };

    return (
        <>
            <div className="game-container" id="game">
                <div className="scoreboard">
                    <div className="scoreboard-header">
                        <h2>Punktestand</h2>
                        <button
                            id="undo-throw"
                            className="accent"
                            onClick={undoLastThrow}
                        >
                            Wurf zurücknehmen
                        </button>
                    </div>

                    <div className="player-cards" id="player-cards">
                        {gameState.players.map((player, index) => (
                            <PlayerCard
                                key={index}
                                player={player}
                                isActive={index === gameState.currentPlayerIndex}
                                isLeading={player === leadingPlayer}
                                hasLowestScore={player === playerWithLowestScore}
                                numSets={gameState.numSets}
                                numLegs={gameState.numLegs}
                            />
                        ))}
                    </div>

                    <div className="eingabe-section">
                        <h3>Punkteeingabe</h3>
                        <ScoreInput ref={scoreInputRef} />
                    </div>
                </div>

                <div className="input-area">
                    <div className="history">
                        <h3>Verlauf</h3>
                        <HistoryList history={gameState.history} />
                    </div>

                    <div className="dart-input">
                        <h3>Statistiken</h3>
                        <PlayerStatistics
                            players={gameState.players}
                            gameStartTime={gameState.gameStartTime}
                            currentPlayerIndex={gameState.currentPlayerIndex}
                            turnStartTime={gameState.turnStartTime}
                        />
                    </div>
                </div>
            </div>

            <div className="restart-game-container">
                <button
                    id="restart-game"
                    className="restart-btn"
                    onClick={handleRestartClick}
                >
                    Neues Spiel starten
                </button>

                {showRestartConfirmation && (
                    <RestartGameDialog
                        onConfirm={handleConfirmRestart}
                        onCancel={handleCancelRestart}
                    />
                )}
            </div>
        </>
    );
};

export default GameBoard;