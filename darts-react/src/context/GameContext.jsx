import React, { createContext, useState, useEffect, useContext } from 'react';
import { useDatabase } from './DatabaseContext';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
    const { saveGame, savePlayer, saveThrow } = useDatabase();

    const [gameState, setGameState] = useState({
        players: [],
        currentPlayerIndex: 0,
        dartsThrown: [],
        gameType: 501,
        numSets: 3,
        numLegs: 3,
        currentLeg: 1,
        currentSet: 1,
        history: [],
        turnStartTime: null,
        gameStartTime: null,
        gameId: null,
        isGameActive: false
    });

    const [timerInterval, setTimerInterval] = useState(null);

    // Load saved game state from session storage
    useEffect(() => {
        const savedState = sessionStorage.getItem('dartGameState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                parsedState.turnStartTime = new Date(parsedState.turnStartTime);
                parsedState.gameStartTime = new Date(parsedState.gameStartTime);
                parsedState.history.forEach(entry => entry.timestamp = new Date(entry.timestamp));
                parsedState.isGameActive = true;

                setGameState(parsedState);
                startTurnTimer();
            } catch (error) {
                console.error('Error loading saved game state:', error);
                sessionStorage.removeItem('dartGameState');
            }
        }
    }, []);

    // Save game state to session storage before unloading
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (gameState.players.length > 0) {
                const gameStateCopy = { ...gameState };
                delete gameStateCopy.timerInterval;
                sessionStorage.setItem('dartGameState', JSON.stringify(gameStateCopy));
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [gameState]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [timerInterval]);

    // Initialize new game
    const initGame = async (settings) => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        const newGameState = {
            players: [],
            currentPlayerIndex: 0,
            dartsThrown: [],
            gameType: settings.gameType,
            numSets: settings.numSets,
            numLegs: settings.numLegs,
            currentLeg: 1,
            currentSet: 1,
            history: [],
            turnStartTime: new Date(),
            gameStartTime: new Date(),
            gameId: null,
            isGameActive: true
        };

        // Create player objects
        for (let i = 0; i < settings.players.length; i++) {
            const playerName = settings.players[i].trim() || `Spieler ${i + 1}`;
            newGameState.players.push({
                name: playerName,
                score: settings.gameType,
                dartsThrown: 0,
                legsWon: 0,
                setsWon: 0,
                scores: [],
                averageScore: 0,
                highestScore: 0,
                turnTime: 0,
                turnCount: 0,
                averageTurnTime: 0,
                id: null
            });
        }

        setGameState(newGameState);

        // Save game to database
        const gameData = {
            gameType: settings.gameType,
            numSets: settings.numSets,
            numLegs: settings.numLegs,
            startTime: new Date(),
            timestamp: new Date(),
            players: newGameState.players.map(player => ({
                name: player.name,
                finalScore: player.score,
                legsWon: player.legsWon,
                setsWon: player.setsWon
            }))
        };

        const gameId = await saveGame(gameData);
        if (gameId) {
            setGameState(prev => ({ ...prev, gameId }));

            // Save players to database and update player IDs in game state
            const updatedPlayers = [...newGameState.players];
            for (let i = 0; i < updatedPlayers.length; i++) {
                const playerId = await savePlayer({ name: updatedPlayers[i].name });
                if (playerId) {
                    updatedPlayers[i].id = playerId;
                }
            }
            setGameState(prev => ({ ...prev, players: updatedPlayers }));
        }

        startTurnTimer();
    };

    // Start turn timer
    const startTurnTimer = () => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        const interval = setInterval(() => {
            setGameState(prev => ({ ...prev })); // Force re-render to update timer display
        }, 1000);

        setTimerInterval(interval);
        setGameState(prev => ({ ...prev, turnStartTime: new Date() }));
    };

    // Update player's average score
    const updateAverageScore = (player) => {
        if (player.scores.length === 0) return player;

        const totalScore = player.scores.reduce((sum, score) => sum + score, 0);
        const numDarts = player.dartsThrown;

        // Create a new player object with updated averageScore
        return {
            ...player,
            averageScore: (totalScore / numDarts) * 3
        };
    };

    // Submit score
    const submitScore = async (scoreValue) => {
        if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 180) {
            return { success: false, message: "Bitte gib eine gültige Punktzahl zwischen 0 und 180 ein." };
        }

        const newGameState = { ...gameState };
        let currentPlayer = { ...newGameState.players[newGameState.currentPlayerIndex] };

        if (currentPlayer.score - scoreValue < 0) {
            return { success: false, message: `Überworfen! ${currentPlayer.name} kann nicht mehr als ${currentPlayer.score} Punkte abziehen.` };
        }

        // Update highest score if applicable
        if (scoreValue > currentPlayer.highestScore) {
            currentPlayer.highestScore = scoreValue;
        }

        // Save throw to database
        if (newGameState.gameId && currentPlayer.id) {
            await saveThrow({
                gameId: newGameState.gameId,
                playerId: currentPlayer.id,
                playerName: currentPlayer.name,
                score: scoreValue,
                remainingScore: currentPlayer.score - scoreValue,
                set: newGameState.currentSet,
                leg: newGameState.currentLeg,
                throwNumber: currentPlayer.dartsThrown / 3 + 1
            });
        }

        // Check if player has won the leg
        if (currentPlayer.score - scoreValue === 0) {
            currentPlayer.score -= scoreValue;
            currentPlayer.scores.push(scoreValue);
            currentPlayer.dartsThrown += 3;
            newGameState.dartsThrown.push(scoreValue);
            currentPlayer = updateAverageScore(currentPlayer);

            // Add history entry for checkout
            newGameState.history.push({
                text: `${currentPlayer.name} - Checkout mit ${scoreValue} Punkten!`,
                timestamp: new Date()
            });

            // Increment legs won
            currentPlayer.legsWon += 1;

            // Check if player has won the set
            if (currentPlayer.legsWon >= Math.ceil(newGameState.numLegs / 2)) {
                currentPlayer.setsWon += 1;
                newGameState.history.push({
                    text: `${currentPlayer.name} gewinnt Set ${newGameState.currentSet}!`,
                    timestamp: new Date()
                });

                // Check if player has won the game
                if (currentPlayer.setsWon >= Math.ceil(newGameState.numSets / 2)) {
                    newGameState.history.push({
                        text: `${currentPlayer.name} gewinnt das Spiel!`,
                        timestamp: new Date()
                    });

                    // Update player in array
                    newGameState.players[newGameState.currentPlayerIndex] = currentPlayer;
                    setGameState(newGameState);

                    // Play win sound
                    const winSound = document.getElementById('relight-sound');
                    if (winSound) {
                        winSound.currentTime = 0;
                        winSound.play();
                    }

                    // Create confetti animation
                    createConfetti();

                    return { success: true, message: 'game_won' };
                }

                // Reset legs won for new set
                newGameState.players.forEach((p, idx) => {
                    if (idx === newGameState.currentPlayerIndex) {
                        // Skip the current player, we'll update them separately
                        return;
                    }
                    newGameState.players[idx] = { ...p, legsWon: 0 };
                });
                currentPlayer.legsWon = 0;
                newGameState.currentSet += 1;
            }

            // Reset scores for new leg
            newGameState.players.forEach((p, idx) => {
                if (idx === newGameState.currentPlayerIndex) {
                    // Skip the current player, we'll update them separately
                    return;
                }
                newGameState.players[idx] = { ...p, score: newGameState.gameType };
            });
            currentPlayer.score = newGameState.gameType;
            newGameState.currentLeg += 1;

            // Update player in array
            newGameState.players[newGameState.currentPlayerIndex] = currentPlayer;
            setGameState(newGameState);

            // Play win sound
            const winSound = document.getElementById('relight-sound');
            if (winSound) {
                winSound.currentTime = 0;
                winSound.play();
            }

            // Create confetti for leg win
            createConfetti();

            return { success: true, message: 'leg_won' };
        }

        // Standard score update
        currentPlayer.score -= scoreValue;
        currentPlayer.scores.push(scoreValue);
        currentPlayer.dartsThrown += 3;
        newGameState.dartsThrown.push(scoreValue);
        currentPlayer = updateAverageScore(currentPlayer);

        // Add history entry
        newGameState.history.push({
            text: `${currentPlayer.name} - ${scoreValue} Punkte`,
            timestamp: new Date()
        });

        // Update player in array
        newGameState.players[newGameState.currentPlayerIndex] = currentPlayer;
        nextPlayer(newGameState);

        setGameState(newGameState);
        return { success: true, message: 'score_updated' };
    };

    // Move to next player
    const nextPlayer = (gameState) => {
        const currentTime = new Date();
        const currentPlayer = { ...gameState.players[gameState.currentPlayerIndex] };
        const turnDuration = (currentTime - gameState.turnStartTime) / 1000;

        // Update turn statistics
        const updatedPlayer = {
            ...currentPlayer,
            turnTime: currentPlayer.turnTime + turnDuration,
            turnCount: currentPlayer.turnCount + 1
        };
        updatedPlayer.averageTurnTime = updatedPlayer.turnTime / updatedPlayer.turnCount;

        // Update player in array
        gameState.players[gameState.currentPlayerIndex] = updatedPlayer;

        // Move to next player
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        gameState.turnStartTime = new Date();

        return gameState;
    };

    // Undo last throw
    const undoLastThrow = () => {
        if (gameState.dartsThrown.length === 0) {
            return { success: false, message: 'Keine Würfe zum Zurücknehmen vorhanden.' };
        }

        const newGameState = { ...gameState };

        // Remove last history entry
        if (newGameState.history.length > 0) {
            newGameState.history.pop();
        }

        // Get last throw
        const lastThrow = newGameState.dartsThrown.pop();

        // Move to previous player
        let playerIndex = (newGameState.currentPlayerIndex - 1 + newGameState.players.length) % newGameState.players.length;
        newGameState.currentPlayerIndex = playerIndex;

        // Update player score
        const player = { ...newGameState.players[playerIndex] };
        if (lastThrow !== 0) {
            player.score = Math.min(player.score + lastThrow, newGameState.gameType);
            player.dartsThrown = Math.max(0, player.dartsThrown - 3);

            if (player.scores.length > 0) {
                player.scores.pop();
            }

            // Recalculate average
            let updatedPlayer = player;
            if (player.dartsThrown > 0) {
                updatedPlayer = updateAverageScore(player);
            } else {
                updatedPlayer = { ...player, averageScore: 0 };
            }

            // Update turn statistics
            if (updatedPlayer.turnCount > 0) {
                updatedPlayer.turnCount = Math.max(0, updatedPlayer.turnCount - 1);
                updatedPlayer.averageTurnTime = updatedPlayer.turnCount > 0 ? updatedPlayer.turnTime / updatedPlayer.turnCount : 0;
                if (updatedPlayer.turnCount === 0) {
                    updatedPlayer.turnTime = 0;
                }
            }

            newGameState.players[playerIndex] = updatedPlayer;
        }

        // Reset turn start time
        newGameState.turnStartTime = new Date();

        setGameState(newGameState);
        return { success: true, message: 'Wurf zurückgenommen.' };
    };

    // Create confetti animation
    const createConfetti = () => {
        const container = document.body;
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
        const confettiCount = 100;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
            confetti.style.animationDelay = `${Math.random() * 1.5}s`;

            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 6000);
        }
    };

    // Reset game
    const resetGame = () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }

        sessionStorage.removeItem('dartGameState');

        setGameState({
            players: [],
            currentPlayerIndex: 0,
            dartsThrown: [],
            gameType: 501,
            numSets: 3,
            numLegs: 3,
            currentLeg: 1,
            currentSet: 1,
            history: [],
            turnStartTime: null,
            gameStartTime: null,
            gameId: null,
            isGameActive: false
        });
    };

    // Get leading player
    const getLeadingPlayer = () => {
        const { players } = gameState;
        if (!players || players.length === 0) return null;

        // First check sets won
        const maxSetsWon = Math.max(...players.map(p => p.setsWon));
        const playersWithMaxSets = players.filter(p => p.setsWon === maxSetsWon);

        if (playersWithMaxSets.length === 1) {
            return playersWithMaxSets[0];
        }

        // If tied on sets, check legs won
        const maxLegsWon = Math.max(...playersWithMaxSets.map(p => p.legsWon));
        const playersWithMaxLegs = playersWithMaxSets.filter(p => p.legsWon === maxLegsWon);

        if (playersWithMaxLegs.length === 1) {
            return playersWithMaxLegs[0];
        }

        // If tied on legs, check average score
        const maxAvg = Math.max(...playersWithMaxLegs.map(p => p.averageScore));
        const playersWithMaxAvg = playersWithMaxLegs.filter(p => p.averageScore === maxAvg);

        if (playersWithMaxAvg.length >= 1) {
            return playersWithMaxAvg[0];
        }

        // Fallback to first player
        return players[0];
    };

    return (
        <GameContext.Provider
            value={{
                gameState,
                initGame,
                submitScore,
                undoLastThrow,
                resetGame,
                getLeadingPlayer
            }}
        >
            {children}
            <audio id="relight-sound" preload="auto">
                <source src="/assets/relight.m4a" type="audio/mp4" />
                Ihr Browser unterstützt das Audio-Element nicht.
            </audio>
        </GameContext.Provider>
    );
};