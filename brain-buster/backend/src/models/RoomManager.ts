import { Room } from './Room';
import { Player } from './Player';

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map<string, Room>();
  }

  /**
   * Create a new room with the given ID
   */
  public createRoom(roomId: string): Room {
    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Check if a room exists
   */
  public roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  /**
   * Get a room by ID
   */
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Remove a room by ID
   */
  public removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * Find a player by socket ID across all rooms
   */
  public findPlayerBySocketId(socketId: string): { room: Room | null, player: Player | null } {
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
  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get the number of active rooms
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }
}
