import {Player} from './Player';
import {Question} from '../types';

export class Room {
    private id: string;
    private players: Map<string, Player>;
    private questions: Question[];
    private gameStarted: boolean;
    private gameEnded: boolean;
    private playerAnswers: Map<number, Map<string, number>>;

    constructor(id: string) {
        this.id = id;
        this.players = new Map<string, Player>();
        this.questions = [];
        this.gameStarted = false;
        this.gameEnded = false;
        this.playerAnswers = new Map<number, Map<string, number>>();
    }

    /**
     * Get room ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Add a player to the room
     */
    public addPlayer(player: Player): void {
        this.players.set(player.getId(), player);
    }

    /**
     * Remove a player from the room
     */
    public removePlayer(playerId: string): boolean {
        return this.players.delete(playerId);
    }

    /**
     * Get a player by ID
     */
    public getPlayer(playerId: string): Player | undefined {
        return this.players.get(playerId);
    }

    /**
     * Find a player by socket ID
     */
    public findPlayerBySocketId(socketId: string): Player | null {
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
    public getPlayerList(): any[] {
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
    public isEmpty(): boolean {
        return this.players.size === 0;
    }

    /**
     * Check if the room needs a new host (current host left)
     */
    public needsNewHost(): boolean {
        return !Array.from(this.players.values()).some(player => player.isHost());
    }

    /**
     * Assign a new host (first player in the list)
     */
    public assignNewHost(): void {
        const players = Array.from(this.players.values());
        if (players.length > 0) {
            players[0].setHost(true);
        }
    }

    /**
     * Set a player's ready state
     */
    public setPlayerReady(playerId: string, isReady: boolean): void {
        const player = this.players.get(playerId);
        if (player) {
            player.setReady(isReady);
        }
    }

    /**
     * Check if all players are ready
     */
    public allPlayersReady(): boolean {
        return Array.from(this.players.values()).every(player => player.isReady());
    }

    /**
     * Start the game with the given questions
     */
    public startGame(questions: Question[]): void {
        this.questions = questions;
        this.gameStarted = true;
        this.gameEnded = false;

        // Initialize player answers for each question
        for (let i = 0; i < questions.length; i++) {
            this.playerAnswers.set(i, new Map<string, number>());
        }
    }

    /**
     * End the game
     */
    public endGame(): void {
        this.gameEnded = true;
    }

    /**
     * Get the game questions
     */
    public getQuestions(): Question[] {
        return this.questions;
    }

    /**
     * Record a player's answer for a question
     * Returns true if the answer is correct
     */
    public recordAnswer(playerId: string, questionIndex: number, answer: number): boolean {
        // Sicherstellen, dass der Index gültig ist
        if (questionIndex < 0 || questionIndex >= this.questions.length) {
            console.error(`Invalid question index: ${questionIndex}`);
            return false;
        }

        // Get the answers for this question
        let questionAnswers = this.playerAnswers.get(questionIndex);
        if (!questionAnswers) {
            questionAnswers = new Map<string, number>();
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
    public resetAnswersForQuestion(questionIndex: number): void {
        this.playerAnswers.set(questionIndex, new Map<string, number>());
    }

    /**
     * Check if all players have answered the current question
     */
    public allPlayersAnswered(questionIndex: number): boolean {
        // Wenn keine Spieler im Raum sind, gilt als "alle haben geantwortet"
        if (this.players.size === 0) return true;

        const questionAnswers = this.playerAnswers.get(questionIndex);
        if (!questionAnswers) return false;

        // Alle Spieler haben geantwortet, wenn die Anzahl der Antworten der Anzahl der Spieler entspricht
        return questionAnswers.size >= this.players.size;
    }

    /**
     * Get all player scores
     */
    public getPlayerScores(): any[] {
        return Array.from(this.players.values()).map(player => ({
            id: player.getId(),
            name: player.getName(),
            score: player.getScore()
        }));
    }

    /**
     * Calculate final game results
     */
    public calculateResults(): any {
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