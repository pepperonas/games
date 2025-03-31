"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
class Room {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.questions = [];
        this.gameStarted = false;
        this.gameEnded = false;
        this.playerAnswers = new Map();
    }
    /**
     * Get room ID
     */
    getId() {
        return this.id;
    }
    /**
     * Add a player to the room
     */
    addPlayer(player) {
        this.players.set(player.getId(), player);
    }
    /**
     * Remove a player from the room
     */
    removePlayer(playerId) {
        return this.players.delete(playerId);
    }
    /**
     * Get a player by ID
     */
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    /**
     * Find a player by socket ID
     */
    findPlayerBySocketId(socketId) {
        for (const player of this.players.values()) {
            if (player.getSocketId() === socketId) {
                return player;
            }
        }
        return null;
    }
    /**
     * Get all players in the room
     */
    getPlayerList() {
        return Array.from(this.players.values()).map(player => ({
            id: player.getId(),
            name: player.getName(),
            isHost: player.isHost(),
            isReady: player.isReady(),
            score: player.getScore()
        }));
    }
    /**
     * Check if the room is empty
     */
    isEmpty() {
        return this.players.size === 0;
    }
    /**
     * Check if the room needs a new host (current host left)
     */
    needsNewHost() {
        return !Array.from(this.players.values()).some(player => player.isHost());
    }
    /**
     * Assign a new host (first player in the list)
     */
    assignNewHost() {
        const players = Array.from(this.players.values());
        if (players.length > 0) {
            players[0].setHost(true);
        }
    }
    /**
     * Set a player's ready state
     */
    setPlayerReady(playerId, isReady) {
        const player = this.players.get(playerId);
        if (player) {
            player.setReady(isReady);
        }
    }
    /**
     * Check if all players are ready
     */
    allPlayersReady() {
        return Array.from(this.players.values()).every(player => player.isReady());
    }
    /**
     * Start the game with the given questions
     */
    startGame(questions) {
        this.questions = questions;
        this.gameStarted = true;
        this.gameEnded = false;
        // Initialize player answers for each question
        for (let i = 0; i < questions.length; i++) {
            this.playerAnswers.set(i, new Map());
        }
    }
    /**
     * End the game
     */
    endGame() {
        this.gameEnded = true;
    }
    /**
     * Get the game questions
     */
    getQuestions() {
        return this.questions;
    }
    /**
     * Record a player's answer for a question
     * Returns true if the answer is correct
     */
    recordAnswer(playerId, questionIndex, answer) {
        // Get the answers for this question
        let questionAnswers = this.playerAnswers.get(questionIndex);
        if (!questionAnswers) {
            questionAnswers = new Map();
            this.playerAnswers.set(questionIndex, questionAnswers);
        }
        // Record the player's answer
        questionAnswers.set(playerId, answer);
        // Check if the answer is correct
        const question = this.questions[questionIndex];
        const isCorrect = question && question.correctAnswer === answer;
        // Update player's score if correct
        if (isCorrect) {
            const player = this.players.get(playerId);
            if (player) {
                player.incrementScore();
            }
        }
        return isCorrect;
    }
    /**
     * Reset player answers for a specific question
     */
    resetAnswersForQuestion(questionIndex) {
        this.playerAnswers.set(questionIndex, new Map());
    }
    /**
     * Check if all players have answered the current question
     */
    allPlayersAnswered(questionIndex) {
        const questionAnswers = this.playerAnswers.get(questionIndex);
        if (!questionAnswers)
            return false;
        // All players have answered if the number of answers equals the number of players
        return questionAnswers.size === this.players.size;
    }
    /**
     * Get all player scores
     */
    getPlayerScores() {
        return Array.from(this.players.values()).map(player => ({
            id: player.getId(),
            name: player.getName(),
            score: player.getScore()
        }));
    }
    /**
     * Calculate final game results
     */
    calculateResults() {
        const playerScores = this.getPlayerScores();
        // Sort players by score (highest first)
        playerScores.sort((a, b) => b.score - a.score);
        // Determine winners (players with highest score)
        const highestScore = playerScores.length > 0 ? playerScores[0].score : 0;
        const winners = playerScores.filter(p => p.score === highestScore);
        return {
            playerScores,
            winners,
            isDraw: winners.length > 1
        };
    }
}
exports.Room = Room;
