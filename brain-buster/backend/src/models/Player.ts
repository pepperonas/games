export class Player {
  private id: string;
  private socketId: string;
  private name: string;
  private ready: boolean;
  private host: boolean;
  private score: number;

  constructor(id: string, socketId: string, name: string, host: boolean = false) {
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
  public getId(): string {
    return this.id;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string {
    return this.socketId;
  }

  /**
   * Get player name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Check if player is ready
   */
  public isReady(): boolean {
    return this.ready;
  }

  /**
   * Set player ready state
   */
  public setReady(ready: boolean): void {
    this.ready = ready;
  }

  /**
   * Check if player is the host
   */
  public isHost(): boolean {
    return this.host;
  }

  /**
   * Set player host status
   */
  public setHost(host: boolean): void {
    this.host = host;
  }

  /**
   * Get player score
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Set player score
   */
  public setScore(score: number): void {
    this.score = score;
  }

  /**
   * Increment player score
   */
  public incrementScore(amount: number = 1): void {
    this.score += amount;
  }
}
