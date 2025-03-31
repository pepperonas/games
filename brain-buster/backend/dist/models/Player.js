"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(id, socketId, name, host = false) {
        this.id = id;
        this.socketId = socketId;
        this.name = name;
        this.ready = false;
        this.host = host;
        this.score = 0;
    }
    /**
     * Get player ID
     */
    getId() {
        return this.id;
    }
    /**
     * Get socket ID
     */
    getSocketId() {
        return this.socketId;
    }
    /**
     * Get player name
     */
    getName() {
        return this.name;
    }
    /**
     * Check if player is ready
     */
    isReady() {
        return this.ready;
    }
    /**
     * Set player ready state
     */
    setReady(ready) {
        this.ready = ready;
    }
    /**
     * Check if player is the host
     */
    isHost() {
        return this.host;
    }
    /**
     * Set player host status
     */
    setHost(host) {
        this.host = host;
    }
    /**
     * Get player score
     */
    getScore() {
        return this.score;
    }
    /**
     * Set player score
     */
    setScore(score) {
        this.score = score;
    }
    /**
     * Increment player score
     */
    incrementScore(amount = 1) {
        this.score += amount;
    }
}
exports.Player = Player;
