/**
 * StatsService - Verwaltet Spielstatistiken für Pong
 *
 * Erfasst Daten zu:
 * - Gewonnene/verlorene Runden
 * - Verstrichene Spielzeit
 * - Anzahl der Ballwechsel
 */
class StatsService {
    constructor(playerName) {
        this.playerName = playerName;
        this.currentGame = {
            startTime: new Date(),
            ballExchanges: 0,
            result: null, // 'won' oder 'lost'
            gameMode: null, // 'singleplayer', 'local-multiplayer', 'online-multiplayer'
            difficulty: null, // Bei Singleplayer: 2 (einfach), 3 (mittel), 5 (schwer)
            opponent: null // Bei Multiplayer: Name des Gegners
        };
    }

    /**
     * Setzt das aktuelle Spielobjekt zurück
     */
    startNewGame(gameMode, difficulty = null, opponent = null) {
        this.currentGame = {
            startTime: new Date(),
            ballExchanges: 0,
            result: null,
            gameMode: gameMode,
            difficulty: difficulty,
            opponent: opponent
        };
    }

    /**
     * Erhöht den Zähler für Ballwechsel
     */
    incrementBallExchanges() {
        this.currentGame.ballExchanges++;
    }

    /**
     * Beendet das aktuelle Spiel und speichert die Statistiken
     * @param {boolean} isWinner - Gibt an, ob der Spieler gewonnen hat
     */
    endGame(isWinner) {
        // Spielende markieren
        const endTime = new Date();
        const playDuration = (endTime - this.currentGame.startTime) / 1000; // in Sekunden

        this.currentGame.result = isWinner ? 'won' : 'lost';
        this.currentGame.endTime = endTime;
        this.currentGame.duration = playDuration;

        // Bestehende Statistiken laden
        let playerStats = JSON.parse(localStorage.getItem(`pongStats_${this.playerName}`)) || {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            totalBallExchanges: 0,
            totalPlayTime: 0,
            lastPlayed: new Date().toISOString(),
            history: []
        };

        // Statistiken aktualisieren
        playerStats.gamesPlayed++;
        playerStats.totalBallExchanges += this.currentGame.ballExchanges;
        playerStats.totalPlayTime += playDuration;
        playerStats.lastPlayed = endTime.toISOString();

        if (isWinner) {
            playerStats.gamesWon++;
        } else {
            playerStats.gamesLost++;
        }

        // Spielverlauf speichern
        playerStats.history.push({
            date: endTime.toISOString(),
            gameMode: this.currentGame.gameMode,
            difficulty: this.currentGame.difficulty,
            opponent: this.currentGame.opponent,
            duration: playDuration,
            ballExchanges: this.currentGame.ballExchanges,
            result: this.currentGame.result
        });

        // Statistiken speichern
        localStorage.setItem(`pongStats_${this.playerName}`, JSON.stringify(playerStats));

        return {
            duration: playDuration,
            ballExchanges: this.currentGame.ballExchanges,
            result: this.currentGame.result
        };
    }

    /**
     * Holt alle Statistiken für einen Spieler
     */
    static getPlayerStats(playerName) {
        return JSON.parse(localStorage.getItem(`pongStats_${playerName}`)) || null;
    }

    /**
     * Holt die Namen aller gespeicherten Spieler
     */
    static getAllPlayers() {
        return JSON.parse(localStorage.getItem('pongProfiles')) || [];
    }

    /**
     * Exportiert die Statistiken eines Spielers als JSON
     */
    static exportStats(playerName) {
        const stats = this.getPlayerStats(playerName);
        if (!stats) return null;

        const dataStr = JSON.stringify(stats, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `pong_stats_${playerName}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        return true;
    }

    /**
     * Importiert Statistiken aus einer JSON-Datei
     */
    static async importStats(file, playerName) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const stats = JSON.parse(event.target.result);

                    // Validiere die Grundstruktur
                    if (!stats.gamesPlayed || !Array.isArray(stats.history)) {
                        reject(new Error('Ungültiges Statistik-Format'));
                        return;
                    }

                    // Speichere die importierten Daten
                    localStorage.setItem(`pongStats_${playerName}`, JSON.stringify(stats));

                    // Stelle sicher, dass der Spieler in der Profile-Liste ist
                    const profiles = JSON.parse(localStorage.getItem('pongProfiles')) || [];
                    if (!profiles.includes(playerName)) {
                        profiles.push(playerName);
                        localStorage.setItem('pongProfiles', JSON.stringify(profiles));
                    }

                    resolve(stats);
                } catch (error) {
                    reject(new Error('Fehler beim Parsen der Statistik-Datei'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Fehler beim Lesen der Datei'));
            };

            reader.readAsText(file);
        });
    }
}

export default StatsService;