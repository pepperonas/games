"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const Room_1 = require("./Room");
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    /**
     * Create a new room with the given ID
     */
    createRoom(roomId) {
        const room = new Room_1.Room(roomId);
        this.rooms.set(roomId, room);
        return room;
    }
    /**
     * Check if a room exists
     */
    roomExists(roomId) {
        return this.rooms.has(roomId);
    }
    /**
     * Get a room by ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    /**
     * Remove a room by ID
     */
    removeRoom(roomId) {
        return this.rooms.delete(roomId);
    }
    /**
     * Find a player by socket ID across all rooms
     */
    findPlayerBySocketId(socketId) {
        for (const [_, room] of this.rooms) {
            const player = room.findPlayerBySocketId(socketId);
            if (player) {
                return { room, player };
            }
        }
        return { room: null, player: null };
    }
    /**
     * Get all rooms
     */
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    /**
     * Get the number of active rooms
     */
    getRoomCount() {
        return this.rooms.size;
    }
}
exports.RoomManager = RoomManager;
