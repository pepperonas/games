import React, { createContext, useState, useEffect, useContext } from 'react';
import { openDB } from 'idb';

const DatabaseContext = createContext();

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting', 'connected', 'error'

    useEffect(() => {
        const initDatabase = async () => {
            try {
                const database = await openDB('DartCounterDB', 1, {
                    upgrade(db) {
                        // Create throws store if it doesn't exist
                        if (!db.objectStoreNames.contains('throws')) {
                            const throwsStore = db.createObjectStore('throws', {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                            throwsStore.createIndex('gameId', 'gameId', { unique: false });
                            throwsStore.createIndex('playerId', 'playerId', { unique: false });
                            throwsStore.createIndex('timestamp', 'timestamp', { unique: false });
                        }

                        // Create games store if it doesn't exist
                        if (!db.objectStoreNames.contains('games')) {
                            const gamesStore = db.createObjectStore('games', {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                            gamesStore.createIndex('timestamp', 'timestamp', { unique: false });
                        }

                        // Create players store if it doesn't exist
                        if (!db.objectStoreNames.contains('players')) {
                            const playersStore = db.createObjectStore('players', {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                            playersStore.createIndex('name', 'name', { unique: false });
                        }
                    }
                });

                setDb(database);
                setDbStatus('connected');
                console.log('Database initialized successfully');

                // Auto-hide the status after 3 seconds
                setTimeout(() => {
                    setDbStatus('hidden');
                }, 3000);
            } catch (error) {
                console.error('Error initializing database:', error);
                setDbStatus('error');
            }
        };

        initDatabase();
    }, []);

    // Function to save a game
    const saveGame = async (gameData) => {
        if (!db) return null;

        try {
            const gameId = await db.add('games', {
                ...gameData,
                timestamp: new Date()
            });
            return gameId;
        } catch (error) {
            console.error('Error saving game:', error);
            return null;
        }
    };

    // Function to save player data
    const savePlayer = async (playerData) => {
        if (!db) return null;

        try {
            // Check if player already exists
            const tx = db.transaction('players', 'readwrite');
            const playerStore = tx.objectStore('players');
            const index = playerStore.index('name');
            const existingPlayer = await index.get(playerData.name);

            if (existingPlayer) {
                return existingPlayer.id;
            } else {
                const playerId = await playerStore.add({
                    name: playerData.name,
                    firstSeen: new Date()
                });
                return playerId;
            }
        } catch (error) {
            console.error('Error saving player:', error);
            return null;
        }
    };

    // Function to save a throw
    const saveThrow = async (throwData) => {
        if (!db) return null;

        try {
            const throwId = await db.add('throws', {
                ...throwData,
                timestamp: new Date()
            });
            return throwId;
        } catch (error) {
            console.error('Error saving throw:', error);
            return null;
        }
    };

    // Function to get all players
    const getAllPlayers = async () => {
        if (!db) return [];

        try {
            return await db.getAll('players');
        } catch (error) {
            console.error('Error getting players:', error);
            return [];
        }
    };

    // Function to get all games
    const getAllGames = async () => {
        if (!db) return [];

        try {
            return await db.getAll('games');
        } catch (error) {
            console.error('Error getting games:', error);
            return [];
        }
    };

    // Function to get all throws
    const getAllThrows = async () => {
        if (!db) return [];

        try {
            return await db.getAll('throws');
        } catch (error) {
            console.error('Error getting throws:', error);
            return [];
        }
    };

    // Function to get throws by player ID
    const getThrowsByPlayerId = async (playerId) => {
        if (!db) return [];

        try {
            const index = db.transaction('throws').store.index('playerId');
            return await index.getAll(playerId);
        } catch (error) {
            console.error('Error getting throws by player ID:', error);
            return [];
        }
    };

    // Function to get throws by game ID
    const getThrowsByGameId = async (gameId) => {
        if (!db) return [];

        try {
            const index = db.transaction('throws').store.index('gameId');
            return await index.getAll(gameId);
        } catch (error) {
            console.error('Error getting throws by game ID:', error);
            return [];
        }
    };

    // Function to delete a player and their throws
    const deletePlayer = async (playerId, playerName) => {
        if (!db) return false;

        try {
            const tx = db.transaction(['players', 'throws'], 'readwrite');

            // Delete player
            if (playerId) {
                await tx.objectStore('players').delete(playerId);
            }

            // Delete all throws of this player
            const throwsStore = tx.objectStore('throws');
            const throwsCursor = await throwsStore.openCursor();

            while (throwsCursor) {
                if (throwsCursor.value.playerId === playerId || throwsCursor.value.playerName === playerName) {
                    await throwsCursor.delete();
                }
                await throwsCursor.continue();
            }

            await tx.done;
            return true;
        } catch (error) {
            console.error('Error deleting player:', error);
            return false;
        }
    };

    // Function to delete a game and its throws
    const deleteGame = async (gameId) => {
        if (!db) return false;

        try {
            const tx = db.transaction(['games', 'throws'], 'readwrite');

            // Delete game
            await tx.objectStore('games').delete(Number(gameId));

            // Delete all throws of this game
            const throwsIndex = tx.objectStore('throws').index('gameId');
            const throwsCursor = await throwsIndex.openCursor(IDBKeyRange.only(Number(gameId)));

            while (throwsCursor) {
                await throwsCursor.delete();
                await throwsCursor.continue();
            }

            await tx.done;
            return true;
        } catch (error) {
            console.error('Error deleting game:', error);
            return false;
        }
    };

    // Function to delete all data
    const clearAllData = async () => {
        if (!db) return false;

        try {
            const tx = db.transaction(['throws', 'games', 'players'], 'readwrite');
            await tx.objectStore('throws').clear();
            await tx.objectStore('games').clear();
            await tx.objectStore('players').clear();
            await tx.done;
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    };

    // Function to export game data
    const exportGameData = async (gameId) => {
        if (!db) return null;

        try {
            const game = await db.get('games', Number(gameId));
            const throwsIndex = db.transaction('throws').store.index('gameId');
            const throws = await throwsIndex.getAll(Number(gameId));

            return {
                game,
                throws,
                exportVersion: "1.0",
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting game data:', error);
            return null;
        }
    };

    // Function to export all players data
    const exportAllPlayers = async () => {
        if (!db) return null;

        try {
            const players = await db.getAll('players');
            const throws = await db.getAll('throws');
            const games = await db.getAll('games');

            const enrichedPlayers = players.map(player => {
                const playerThrows = throws.filter(t => t.playerId === player.id);
                const playerGames = games.filter(game =>
                    game.players && game.players.some(p => p.name === player.name)
                );

                const totalThrows = playerThrows.length;
                const totalScore = playerThrows.reduce((sum, t) => sum + t.score, 0);
                const avgScore = totalThrows > 0 ? (totalScore / totalThrows) : 0;
                const highestScore = playerThrows.length > 0 ? Math.max(...playerThrows.map(t => t.score)) : 0;

                return {
                    id: player.id,
                    name: player.name,
                    firstSeen: player.firstSeen,
                    statistics: {
                        totalThrows,
                        totalScore,
                        averageScore: avgScore,
                        highestScore
                    },
                    throws: playerThrows,
                    games: playerGames.map(g => g.id)
                };
            });

            return {
                players: enrichedPlayers,
                exportVersion: "1.0",
                exportDate: new Date().toISOString(),
                exportType: "players"
            };
        } catch (error) {
            console.error('Error exporting all players data:', error);
            return null;
        }
    };

    // Function to export all games data
    const exportAllGames = async () => {
        if (!db) return null;

        try {
            const games = await db.getAll('games');
            const throws = await db.getAll('throws');
            const players = await db.getAll('players');

            const playerLookup = {};
            players.forEach(player => {
                playerLookup[player.id] = player;
            });

            const enrichedGames = games.map(game => {
                const gameThrows = throws.filter(t => t.gameId === game.id);

                const enrichedPlayers = game.players ? game.players.map(player => {
                    const playerId = players.find(p => p.name === player.name)?.id;
                    const playerThrows = gameThrows.filter(t => t.playerName === player.name);

                    return {
                        ...player,
                        id: playerId,
                        throws: playerThrows.length,
                        totalScore: playerThrows.reduce((sum, t) => sum + t.score, 0)
                    };
                }) : [];

                return {
                    ...game,
                    players: enrichedPlayers,
                    throws: gameThrows,
                    throwCount: gameThrows.length
                };
            });

            return {
                games: enrichedGames,
                exportVersion: "1.0",
                exportDate: new Date().toISOString(),
                exportType: "all_games"
            };
        } catch (error) {
            console.error('Error exporting all games data:', error);
            return null;
        }
    };

    // Function to import game data
    const importGameData = async (jsonData, clearBefore = false) => {
        if (!db) return { success: false, message: "Keine Datenbankverbindung vorhanden." };

        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Determine export type
            let exportType = '';
            if (data.game && data.throws) {
                exportType = 'single_game';
            } else if (data.games && Array.isArray(data.games)) {
                exportType = 'all_games';
            } else if (data.players && Array.isArray(data.players)) {
                exportType = 'players';
            } else {
                throw new Error('Unbekanntes oder ungültiges Datenformat');
            }

            console.log('Erkannter Export-Typ:', exportType);

            // Clear all data if requested
            if (clearBefore) {
                await clearAllData();
            }

            const importStats = {
                games: 0,
                throws: 0,
                players: 0
            };

            // Import based on export type
            if (exportType === 'single_game') {
                // Import single game
                const game = data.game;
                const gameCopy = { ...game };
                delete gameCopy.id;

                const gameId = await db.add('games', gameCopy);
                importStats.games++;

                // Import players
                const playerIds = {};
                if (game.players && Array.isArray(game.players)) {
                    for (const player of game.players) {
                        const tx = db.transaction('players', 'readwrite');
                        const playerStore = tx.objectStore('players');
                        const index = playerStore.index('name');
                        const existingPlayer = await index.get(player.name);

                        if (existingPlayer) {
                            playerIds[player.name] = existingPlayer.id;
                        } else {
                            const playerData = {
                                name: player.name,
                                firstSeen: player.firstSeen || new Date()
                            };
                            const playerId = await playerStore.add(playerData);
                            importStats.players++;
                            playerIds[player.name] = playerId;
                        }

                        await tx.done;
                    }
                }

                // Import throws
                const throws = Array.isArray(data.throws) ? data.throws : [];
                for (const throwData of throws) {
                    const throwCopy = { ...throwData };
                    delete throwCopy.id;
                    throwCopy.gameId = gameId;

                    if (playerIds[throwCopy.playerName]) {
                        throwCopy.playerId = playerIds[throwCopy.playerName];
                    }

                    await db.add('throws', throwCopy);
                    importStats.throws++;
                }
            } else if (exportType === 'all_games') {
                // Import multiple games
                for (const game of data.games) {
                    const gameCopy = { ...game };
                    delete gameCopy.id;
                    delete gameCopy.throws;
                    delete gameCopy.throwCount;

                    const gameId = await db.add('games', gameCopy);
                    importStats.games++;

                    // Import players
                    const playerIds = {};
                    if (game.players && Array.isArray(game.players)) {
                        for (const player of game.players) {
                            const tx = db.transaction('players', 'readwrite');
                            const playerStore = tx.objectStore('players');
                            const index = playerStore.index('name');
                            const existingPlayer = await index.get(player.name);

                            if (existingPlayer) {
                                playerIds[player.name] = existingPlayer.id;
                            } else {
                                const playerData = {
                                    name: player.name,
                                    firstSeen: player.firstSeen || new Date()
                                };
                                const playerId = await playerStore.add(playerData);
                                importStats.players++;
                                playerIds[player.name] = playerId;
                            }

                            await tx.done;
                        }
                    }

                    // Import throws
                    const throws = game.throws || [];
                    for (const throwData of throws) {
                        const throwCopy = { ...throwData };
                        delete throwCopy.id;
                        throwCopy.gameId = gameId;

                        if (playerIds[throwCopy.playerName]) {
                            throwCopy.playerId = playerIds[throwCopy.playerName];
                        }

                        await db.add('throws', throwCopy);
                        importStats.throws++;
                    }
                }
            } else if (exportType === 'players') {
                // Import players
                for (const player of data.players) {
                    const playerCopy = {
                        name: player.name,
                        firstSeen: player.firstSeen || new Date()
                    };

                    const tx = db.transaction('players', 'readwrite');
                    const playerStore = tx.objectStore('players');
                    const index = playerStore.index('name');
                    const existingPlayer = await index.get(player.name);

                    if (!existingPlayer) {
                        await playerStore.add(playerCopy);
                        importStats.players++;
                    }

                    await tx.done;
                }
            }

            return {
                success: true,
                message: `Import abgeschlossen: ${importStats.games} Spiele, ${importStats.throws} Würfe und ${importStats.players} Spieler importiert.`,
                stats: importStats
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return { success: false, message: `Die Datei konnte nicht importiert werden: ${error.message}` };
        }
    };

    return (
        <DatabaseContext.Provider
            value={{
                db,
                dbStatus,
                saveGame,
                savePlayer,
                saveThrow,
                getAllPlayers,
                getAllGames,
                getAllThrows,
                getThrowsByPlayerId,
                getThrowsByGameId,
                deletePlayer,
                deleteGame,
                clearAllData,
                exportGameData,
                exportAllPlayers,
                exportAllGames,
                importGameData
            }}
        >
            {children}
            {dbStatus !== 'hidden' && (
                <div className={`database-status ${dbStatus}`}>
                    DB: {dbStatus === 'connecting'
                    ? 'Verbindung wird hergestellt...'
                    : dbStatus === 'connected'
                        ? 'Verbunden'
                        : 'Fehler'}
                </div>
            )}
        </DatabaseContext.Provider>
    );
};

export default DatabaseContext;