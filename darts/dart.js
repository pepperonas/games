document.addEventListener('DOMContentLoaded', function () {
    // Theme Toggle
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const lightIcon = document.getElementById('light-icon');
    const darkIcon = document.getElementById('dark-icon');

    // Check if user already has a theme preference stored
    const savedTheme = localStorage.getItem('dartTheme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        themeToggleCheckbox.checked = true;
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
    } else {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
    }

    // Theme toggle event listener
    themeToggleCheckbox.addEventListener('change', function () {
        if (this.checked) {
            document.documentElement.classList.add('dark-theme');
            localStorage.setItem('dartTheme', 'dark');
            lightIcon.style.display = 'block';
            darkIcon.style.display = 'none';
        } else {
            document.documentElement.classList.remove('dark-theme');
            localStorage.setItem('dartTheme', 'light');
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'block';
        }
    });

    // DOM Elements
    const setupContainer = document.getElementById('setup');
    const gameContainer = document.getElementById('game');
    const playerNamesContainer = document.getElementById('player-names-container');
    const playerCardsContainer = document.getElementById('player-cards');
    const startGameButton = document.getElementById('start-game');
    const resetSettingsButton = document.getElementById('reset-settings');
    const restartGameButton = document.getElementById('restart-game');
    const confirmationDialog = document.getElementById('restart-confirmation');
    const confirmRestartButton = document.getElementById('confirm-restart');
    const cancelRestartButton = document.getElementById('cancel-restart');
    const numPlayersSelect = document.getElementById('num-players');
    const gameTypeSelect = document.getElementById('game-type');
    const numSetsSelect = document.getElementById('num-sets');
    const numLegsSelect = document.getElementById('num-legs');
    const currentInputField = document.getElementById('current-input');
    const clearInputButton = document.getElementById('clear-input');
    const submitScoreButton = document.getElementById('submit-score');
    const undoThrowButton = document.getElementById('undo-throw');
    const historyContainer = document.getElementById('history-container');
    const viewStatsButton = document.getElementById('view-stats');
    const importDataButton = document.getElementById('import-data');
    const fileInput = document.getElementById('file-input');
    const importModal = document.getElementById('import-modal');
    const closeImportModalButton = document.getElementById('close-import-modal');
    const fileDropArea = document.getElementById('file-drop-area');
    const importStatus = document.getElementById('import-status');
    const exportButton = document.getElementById('export-data');
    const exportPlayersButton = document.getElementById('export-players');
    const exportAllGamesButton = document.getElementById('export-all-games');
    const resetDataButton = document.getElementById('reset-data');

    // Game state
    let gameState = {
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
        timerInterval: null,
        gameId: null
    };

    // Database functionality
    let db;

    // Initialize the database on page load
    function initDatabase() {
        const request = indexedDB.open('DartCounterDB', 1);

        request.onupgradeneeded = function (event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains('throws')) {
                const throwsStore = db.createObjectStore('throws', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                throwsStore.createIndex('gameId', 'gameId', {unique: false});
                throwsStore.createIndex('playerId', 'playerId', {unique: false});
                throwsStore.createIndex('timestamp', 'timestamp', {unique: false});
            }
            if (!db.objectStoreNames.contains('games')) {
                const gamesStore = db.createObjectStore('games', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                gamesStore.createIndex('timestamp', 'timestamp', {unique: false});
            }
            if (!db.objectStoreNames.contains('players')) {
                const playersStore = db.createObjectStore('players', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                playersStore.createIndex('name', 'name', {unique: false});
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            console.log('Database initialized successfully');
            const dbStatus = document.getElementById('db-status');
            if (dbStatus) {
                dbStatus.textContent = 'DB: Verbunden';
                dbStatus.classList.add('connected');
                setTimeout(() => {
                    dbStatus.style.opacity = '0';
                    setTimeout(() => dbStatus.style.display = 'none', 1000);
                }, 3000);
            }
        };

        request.onerror = function (event) {
            console.error('Database error:', event.target.error);
            alert('Datenbank-Fehler: ' + event.target.error);
            const dbStatus = document.getElementById('db-status');
            if (dbStatus) {
                dbStatus.textContent = 'DB: Fehler';
                dbStatus.classList.add('error');
            }
        };
    }

    // Save game to database
    function saveGameToDatabase() {
        if (!db) return;
        const transaction = db.transaction(['games'], 'readwrite');
        const gamesStore = transaction.objectStore('games');

        const gameData = {
            gameType: gameState.gameType,
            numSets: gameState.numSets,
            numLegs: gameState.numLegs,
            startTime: gameState.gameStartTime,
            timestamp: new Date(),
            players: gameState.players.map(player => ({
                name: player.name,
                finalScore: player.score,
                legsWon: player.legsWon,
                setsWon: player.setsWon
            }))
        };

        const request = gamesStore.add(gameData);
        request.onsuccess = function (event) {
            gameState.gameId = event.target.result;
            console.log('Game saved to database with ID:', gameState.gameId);
            savePlayersToDatabase();
        };
        request.onerror = function (event) {
            console.error('Error saving game:', event.target.error);
        };
    }

    // Save players to database
    function savePlayersToDatabase() {
        if (!db || !gameState.gameId) return;
        const transaction = db.transaction(['players'], 'readwrite');
        const playersStore = transaction.objectStore('players');

        gameState.players.forEach((player, index) => {
            const nameIndex = playersStore.index('name');
            const nameRequest = nameIndex.get(player.name);

            nameRequest.onsuccess = function (event) {
                const existingPlayer = event.target.result;
                if (existingPlayer) {
                    player.id = existingPlayer.id;
                } else {
                    const playerData = {name: player.name, firstSeen: new Date()};
                    const addRequest = playersStore.add(playerData);
                    addRequest.onsuccess = function (event) {
                        player.id = event.target.result;
                        console.log('Player saved to database:', player.name, player.id);
                    };
                }
            };
        });
    }

    // Save throw to database
    function saveThrowToDatabase(playerIndex, scoreValue) {
        if (!db || !gameState.gameId) return;
        const player = gameState.players[playerIndex];
        if (!player || !player.id) return;

        const transaction = db.transaction(['throws'], 'readwrite');
        const throwsStore = transaction.objectStore('throws');

        const throwData = {
            gameId: gameState.gameId,
            playerId: player.id,
            playerName: player.name,
            score: scoreValue,
            remainingScore: player.score,
            timestamp: new Date(),
            set: gameState.currentSet,
            leg: gameState.currentLeg,
            throwNumber: player.dartsThrown / 3
        };

        const request = throwsStore.add(throwData);
        request.onsuccess = function () {
            console.log('Throw saved to database:', throwData);
        };
        request.onerror = function (event) {
            console.error('Error saving throw:', event.target.error);
        };
    }

    // Export game data as JSON
    function exportGameData() {
        if (!db) return;
        const transaction = db.transaction(['games', 'throws'], 'readonly');
        const gamesStore = transaction.objectStore('games');
        const throwsStore = transaction.objectStore('throws');

        const gameId = gameState.gameId;
        if (!gameId) return;

        const gameRequest = gamesStore.get(gameId);
        gameRequest.onsuccess = function (event) {
            const gameData = event.target.result;
            const throwsIndex = throwsStore.index('gameId');
            const throwsRequest = throwsIndex.getAll(gameId);

            throwsRequest.onsuccess = function (event) {
                const throwsData = event.target.result;
                const exportData = {
                    game: gameData,
                    throws: throwsData,
                    exportVersion: "1.0",
                    exportDate: new Date().toISOString()
                };

                const dataStr = JSON.stringify(exportData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                const exportFileName = 'dart-game-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';

                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileName);
                linkElement.click();
            };
        };
    }

    // Export all player data as JSON
    function exportAllPlayerData() {
        if (!db) {
            alert('Keine Datenbankverbindung vorhanden.');
            return;
        }

        const transaction = db.transaction(['players', 'throws', 'games'], 'readonly');
        const playersStore = transaction.objectStore('players');
        const throwsStore = transaction.objectStore('throws');
        const gamesStore = transaction.objectStore('games');

        // Alle Spieler laden
        const playersRequest = playersStore.getAll();

        playersRequest.onsuccess = function (event) {
            const players = event.target.result;
            if (players.length === 0) {
                alert('Keine Spielerdaten vorhanden.');
                return;
            }

            // Alle Spiele laden
            const gamesRequest = gamesStore.getAll();
            gamesRequest.onsuccess = function (event) {
                const games = event.target.result;

                // Alle Würfe laden
                const throwsRequest = throwsStore.getAll();
                throwsRequest.onsuccess = function (event) {
                    const throws = event.target.result;

                    // Spieler mit ihren Würfen und Spielen verknüpfen
                    const enrichedPlayers = players.map(player => {
                        const playerThrows = throws.filter(t => t.playerId === player.id);

                        // Spiele finden, in denen der Spieler teilgenommen hat
                        const playerGames = games.filter(game =>
                            game.players && game.players.some(p => p.name === player.name)
                        );

                        // Statistiken berechnen
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
                            games: playerGames.map(g => g.id) // Nur die IDs der Spiele speichern
                        };
                    });

                    // Export-Daten zusammenstellen
                    const exportData = {
                        players: enrichedPlayers,
                        exportVersion: "1.0",
                        exportDate: new Date().toISOString(),
                        exportType: "players"
                    };

                    // Als JSON-Datei exportieren
                    const dataStr = JSON.stringify(exportData, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                    const exportFileName = 'dart-players-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';

                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileName);
                    linkElement.click();
                };
            };
        };

        playersRequest.onerror = function (event) {
            console.error('Fehler beim Laden der Spielerdaten:', event.target.error);
            alert('Fehler beim Laden der Spielerdaten.');
        };
    }

    // Funktion zum Exportieren aller Spieldaten
    function exportAllGames() {
        if (!db) {
            alert('Keine Datenbankverbindung vorhanden.');
            return;
        }

        const transaction = db.transaction(['games', 'throws', 'players'], 'readonly');
        const gamesStore = transaction.objectStore('games');
        const throwsStore = transaction.objectStore('throws');
        const playersStore = transaction.objectStore('players');

        // Alle Spiele laden
        const gamesRequest = gamesStore.getAll();

        gamesRequest.onsuccess = function (event) {
            const games = event.target.result;
            if (games.length === 0) {
                alert('Keine Spieldaten vorhanden.');
                return;
            }

            // Alle Würfe laden
            const throwsRequest = throwsStore.getAll();
            throwsRequest.onsuccess = function (event) {
                const allThrows = event.target.result;

                // Spieler zum Referenzieren laden
                const playersRequest = playersStore.getAll();
                playersRequest.onsuccess = function (event) {
                    const allPlayers = event.target.result;

                    // Spieler-Lookup erstellen
                    const playerLookup = {};
                    allPlayers.forEach(player => {
                        playerLookup[player.id] = player;
                    });

                    // Anreicherung der Spieldaten mit zugehörigen Würfen
                    const enrichedGames = games.map(game => {
                        // Würfe für dieses Spiel finden
                        const gameThrows = allThrows.filter(t => t.gameId === game.id);

                        // Spielerdetails anreichern
                        const enrichedPlayers = game.players.map(player => {
                            // Spieler-ID finden, falls vorhanden
                            const playerId = allPlayers.find(p => p.name === player.name)?.id;

                            // Spielerwürfe für dieses Spiel
                            const playerThrows = gameThrows.filter(t => t.playerName === player.name);

                            return {
                                ...player,
                                id: playerId,
                                throws: playerThrows.length, // Anzahl der Würfe
                                totalScore: playerThrows.reduce((sum, t) => sum + t.score, 0)
                            };
                        });

                        return {
                            ...game,
                            players: enrichedPlayers,
                            throws: gameThrows,
                            throwCount: gameThrows.length
                        };
                    });

                    // Export-Daten zusammenstellen
                    const exportData = {
                        games: enrichedGames,
                        exportVersion: "1.0",
                        exportDate: new Date().toISOString(),
                        exportType: "all_games"
                    };

                    // Als JSON-Datei exportieren
                    const dataStr = JSON.stringify(exportData, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                    const exportFileName = 'dart-games-all-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';

                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileName);
                    linkElement.click();
                };
            };
        };

        gamesRequest.onerror = function (event) {
            console.error('Fehler beim Laden der Spieldaten:', event.target.error);
            alert('Fehler beim Laden der Spieldaten.');
        };
    }

    // Funktion zum Löschen aller Daten in der Datenbank
    function clearAllDataBeforeImport() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Keine Datenbankverbindung vorhanden.'));
                return;
            }

            const transaction = db.transaction(['throws', 'games', 'players'], 'readwrite');
            const throwsStore = transaction.objectStore('throws');
            const gamesStore = transaction.objectStore('games');
            const playersStore = transaction.objectStore('players');

            // Alle Object Stores leeren
            throwsStore.clear();
            gamesStore.clear();
            playersStore.clear();

            transaction.oncomplete = function () {
                console.log('Alle Daten wurden vor dem Import gelöscht');
                resolve();
            };

            transaction.onerror = function (event) {
                console.error('Fehler beim Löschen aller Daten:', event.target.error);
                reject(new Error('Beim Löschen der Daten ist ein Fehler aufgetreten.'));
            };
        });
    }

    function openStatisticsPage() {
        saveGameStateBeforeNavigation();
        window.location.href = 'statistics.html';
    }

    // Toggle between game and statistics pages
    function togglePage() {
        const currentPage = window.location.pathname;
        if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
            openStatisticsPage();
        } else if (currentPage.includes('statistics.html')) {
            window.location.href = 'index.html';
        }
    }

    // Add event listener for page toggle button
    const pageToggleButton = document.getElementById('page-toggle');
    if (pageToggleButton) {
        pageToggleButton.addEventListener('click', togglePage);
    }

    // Verbesserte Import-Funktion mit Option zum vorherigen Löschen der Daten
    function importGameData(jsonData, clearBeforeImport = false) {
        if (!db) {
            alert('Keine Datenbankverbindung vorhanden.');
            return;
        }

        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Bestimme den Typ des Exports basierend auf der Struktur
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

            // Funktion zum eigentlichen Import
            const performImport = () => {
                const transaction = db.transaction(['games', 'throws', 'players'], 'readwrite');
                const gamesStore = transaction.objectStore('games');
                const throwsStore = transaction.objectStore('throws');
                const playersStore = transaction.objectStore('players');

                let importStats = {
                    games: 0,
                    throws: 0,
                    players: 0
                };

                // Funktion zum Importieren eines einzelnen Spiels
                const importSingleGame = (gameData, throwsData) => {
                    return new Promise((resolveGame) => {
                        // Spielerdaten aus dem Spiel extrahieren
                        const playerPromises = [];
                        const playerIds = {};

                        const gameRequest = gamesStore.add(gameData);

                        gameRequest.onsuccess = function (event) {
                            const gameId = event.target.result;
                            importStats.games++;
                            console.log('Spiel importiert mit ID:', gameId);

                            if (gameData.players && Array.isArray(gameData.players)) {
                                gameData.players.forEach(player => {
                                    playerPromises.push(new Promise((resolve) => {
                                        const nameIndex = playersStore.index('name');
                                        const nameRequest = nameIndex.get(player.name);

                                        nameRequest.onsuccess = function (event) {
                                            const existingPlayer = event.target.result;
                                            if (existingPlayer) {
                                                playerIds[player.name] = existingPlayer.id;
                                                resolve();
                                            } else {
                                                const playerData = {
                                                    name: player.name,
                                                    firstSeen: player.firstSeen || new Date()
                                                };
                                                const addRequest = playersStore.add(playerData);
                                                addRequest.onsuccess = function (event) {
                                                    importStats.players++;
                                                    playerIds[player.name] = event.target.result;
                                                    resolve();
                                                };
                                                addRequest.onerror = function () {
                                                    resolve();
                                                };
                                            }
                                        };
                                        nameRequest.onerror = function () {
                                            resolve();
                                        };
                                    }));
                                });
                            }

                            Promise.all(playerPromises).then(() => {
                                let importedThrows = 0;
                                const throws = Array.isArray(throwsData) ? throwsData : [];

                                if (throws.length === 0) {
                                    resolveGame();
                                    return;
                                }

                                throws.forEach(throwData => {
                                    // Kopie erstellen und ID löschen (wird neu generiert)
                                    const throwCopy = {...throwData};
                                    delete throwCopy.id;

                                    // GameID aktualisieren
                                    throwCopy.gameId = gameId;

                                    // PlayerID aktualisieren falls möglich
                                    if (playerIds[throwCopy.playerName]) {
                                        throwCopy.playerId = playerIds[throwCopy.playerName];
                                    }

                                    const throwRequest = throwsStore.add(throwCopy);
                                    throwRequest.onsuccess = function () {
                                        importedThrows++;
                                        importStats.throws++;
                                        if (importedThrows === throws.length) {
                                            resolveGame();
                                        }
                                    };
                                    throwRequest.onerror = function (e) {
                                        console.error('Fehler beim Importieren eines Wurfs:', e);
                                        importedThrows++;
                                        if (importedThrows === throws.length) {
                                            resolveGame();
                                        }
                                    };
                                });
                            });
                        };

                        gameRequest.onerror = function (event) {
                            console.error('Fehler beim Importieren des Spiels:', event.target.error);
                            resolveGame();
                        };
                    });
                };

                // Import basierend auf dem Typ starten
                switch (exportType) {
                    case 'single_game':
                        // Einzelnes Spiel importieren
                        importSingleGame(data.game, data.throws).then(() => {
                            alert(`Import abgeschlossen: ${importStats.games} Spiel und ${importStats.throws} Würfe importiert.`);
                        });
                        break;

                    case 'all_games':
                        // Mehrere Spiele importieren
                        const gamePromises = [];

                        data.games.forEach(game => {
                            // Für jedes Spiel Würfe extrahieren
                            const gameThrows = game.throws || [];

                            // Spieldaten bereinigen (throws entfernen, da diese separat importiert werden)
                            const gameCopy = {...game};
                            delete gameCopy.throws;
                            delete gameCopy.throwCount; // Nicht in der Datenbank benötigt

                            // Spiel importieren
                            gamePromises.push(importSingleGame(gameCopy, gameThrows));
                        });

                        Promise.all(gamePromises).then(() => {
                            alert(`Import abgeschlossen: ${importStats.games} Spiele, ${importStats.throws} Würfe und ${importStats.players} Spieler importiert.`);
                        });
                        break;

                    case 'players':
                        // Spielerdaten importieren
                        const playerPromises = [];

                        data.players.forEach(player => {
                            // Kopie erstellen und Würfe entfernen (werden separat behandelt)
                            const playerCopy = {
                                name: player.name,
                                firstSeen: player.firstSeen || new Date()
                            };

                            playerPromises.push(new Promise(resolvePlayer => {
                                // Prüfen, ob Spieler bereits existiert
                                const nameIndex = playersStore.index('name');
                                const nameRequest = nameIndex.get(player.name);

                                nameRequest.onsuccess = function (event) {
                                    const existingPlayer = event.target.result;
                                    let playerId = null;

                                    if (existingPlayer) {
                                        // Spieler existiert bereits
                                        playerId = existingPlayer.id;
                                        resolvePlayer(playerId);
                                    } else {
                                        // Neuen Spieler anlegen
                                        const addRequest = playersStore.add(playerCopy);
                                        addRequest.onsuccess = function (event) {
                                            importStats.players++;
                                            playerId = event.target.result;
                                            resolvePlayer(playerId);
                                        };
                                        addRequest.onerror = function () {
                                            resolvePlayer(null);
                                        };
                                    }
                                };
                            }));
                        });

                        Promise.all(playerPromises).then(() => {
                            alert(`Import abgeschlossen: ${importStats.players} Spieler importiert.`);
                        });
                        break;

                    default:
                        throw new Error('Unbekanntes Format');
                }
            };

            // Wenn gewünscht, erst alle Daten löschen
            if (clearBeforeImport) {
                clearAllDataBeforeImport()
                    .then(() => {
                        performImport();
                    })
                    .catch(error => {
                        alert(`Fehler beim Löschen der Daten: ${error.message}`);
                    });
            } else {
                // Direkt mit dem Import fortfahren
                performImport();
            }

        } catch (error) {
            console.error('Fehler beim Parsen oder Importieren:', error);
            alert('Die Datei konnte nicht importiert werden. Bitte überprüfe das Format: ' + error.message);
        }
    }

    // Aktualisierter Code für den Import-Handler
    function handleImportFile(file) {
        if (!file || file.type !== 'application/json') {
            importStatus.textContent = 'Fehler: Bitte wähle eine JSON-Datei aus.';
            importStatus.style.color = '#e74c3c';
            return;
        }

        importStatus.textContent = 'Datei wird verarbeitet...';
        importStatus.style.color = '';

        // Prüfen, ob alle Daten vor dem Import gelöscht werden sollen
        const clearBeforeImport = document.getElementById('clear-before-import').checked;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const jsonData = event.target.result;
                importGameData(jsonData, clearBeforeImport);
                setTimeout(() => importModal.style.display = 'none', 2000);
            } catch (error) {
                console.error('Fehler beim Lesen der Datei:', error);
                importStatus.textContent = 'Die Datei konnte nicht gelesen werden.';
                importStatus.style.color = '#e74c3c';
            }
        };
        reader.onerror = function () {
            importStatus.textContent = 'Fehler beim Lesen der Datei.';
            importStatus.style.color = '#e74c3c';
        };
        reader.readAsText(file);
    }

    // Reset all data in database
    function resetAllData() {
        if (!db || !confirm('Möchtest du wirklich ALLE Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;

        const transaction = db.transaction(['throws', 'games', 'players'], 'readwrite');
        const throwsStore = transaction.objectStore('throws');
        const gamesStore = transaction.objectStore('games');
        const playersStore = transaction.objectStore('players');

        throwsStore.clear();
        gamesStore.clear();
        playersStore.clear();

        transaction.oncomplete = function () {
            alert('Alle Daten wurden erfolgreich gelöscht!');
            sessionStorage.removeItem('dartGameState');
            restartGame();
        };
        transaction.onerror = function (event) {
            console.error('Fehler beim Löschen aller Daten:', event.target.error);
            alert('Beim Löschen der Daten ist ein Fehler aufgetreten.');
        };
    }

    // Save game state before navigation
    function saveGameStateBeforeNavigation() {
        if (gameState.players.length > 0) {
            const timerInterval = gameState.timerInterval;
            gameState.timerInterval = null;
            sessionStorage.setItem('dartGameState', JSON.stringify(gameState));
            gameState.timerInterval = timerInterval;
        }
    }

    // Load game state after navigation
    function loadGameStateAfterNavigation() {
        const savedState = sessionStorage.getItem('dartGameState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                gameState = parsedState;
                gameState.turnStartTime = new Date(gameState.turnStartTime);
                gameState.gameStartTime = new Date(gameState.gameStartTime);
                gameState.history.forEach(entry => entry.timestamp = new Date(entry.timestamp));
                startTurnTimer();
                renderPlayerCards();
                renderHistory();
                renderPlayerStatistics();
                setupContainer.classList.add('hidden');
                gameContainer.classList.remove('hidden');
                restartGameButton.classList.remove('hidden');
                console.log('Spielstand wiederhergestellt');

                // Setze den Fokus auf das Eingabefeld
                if (currentInputField) {
                    currentInputField.focus();
                }

                return true;
            } catch (error) {
                console.error('Fehler beim Wiederherstellen des Spielstands:', error);
                sessionStorage.removeItem('dartGameState');
            }
        }
        return false;
    }

    // Initialize player name inputs
    function initPlayerNameInputs() {
        const numPlayers = parseInt(numPlayersSelect.value);
        playerNamesContainer.innerHTML = '';
        for (let i = 0; i < numPlayers; i++) {
            const playerGroup = document.createElement('div');
            playerGroup.className = 'setting-group';

            const label = document.createElement('label');
            label.setAttribute('for', `player-${i + 1}-name`);
            label.textContent = `Spieler ${i + 1} Name:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `player-${i + 1}-name`;
            input.placeholder = `Spieler ${i + 1}`;
            input.value = `Spieler ${i + 1}`;

            playerGroup.appendChild(label);
            playerGroup.appendChild(input);
            playerNamesContainer.appendChild(playerGroup);
        }
    }

    // Initialize game
    function initGame() {
        const numPlayers = parseInt(numPlayersSelect.value);
        const gameType = parseInt(gameTypeSelect.value);
        const numSets = parseInt(numSetsSelect.value);
        const numLegs = parseInt(numLegsSelect.value);

        gameState = {
            players: [],
            currentPlayerIndex: 0,
            dartsThrown: [],
            gameType: gameType,
            numSets: numSets,
            numLegs: numLegs,
            currentLeg: 1,
            currentSet: 1,
            history: [],
            turnStartTime: new Date(),
            gameStartTime: new Date(),
            timerInterval: null,
            gameId: null
        };

        for (let i = 0; i < numPlayers; i++) {
            const nameInput = document.getElementById(`player-${i + 1}-name`);
            const playerName = nameInput.value.trim() || `Spieler ${i + 1}`;
            gameState.players.push({
                name: playerName,
                score: gameType,
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

        renderPlayerCards();
        renderHistory();
        renderPlayerStatistics();
        saveGameToDatabase();
        startTurnTimer();
        setupContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        restartGameButton.classList.remove('hidden');

        // Setze den Fokus auf das Eingabefeld
        if (currentInputField) {
            currentInputField.focus();
        }
    }

    // Render player cards
    function renderPlayerCards() {
        playerCardsContainer.innerHTML = '';
        gameState.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${index === gameState.currentPlayerIndex ? 'active' : ''}`;

            if (index === gameState.currentPlayerIndex) {
                const turnIndicator = document.createElement('div');
                turnIndicator.className = 'player-turn-indicator';
                turnIndicator.textContent = 'Aktuell am Zug';
                playerCard.appendChild(turnIndicator);
            }

            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = player.name;

            const playerScore = document.createElement('div');
            playerScore.className = 'player-score';
            playerScore.textContent = player.score;

            const averageScore = document.createElement('div');
            averageScore.className = 'average-score';
            averageScore.textContent = `Ø ${player.averageScore.toFixed(1)}`;

            const legCounter = document.createElement('div');
            legCounter.className = 'leg-counter';
            const legsNeeded = Math.ceil(gameState.numLegs / 2);
            for (let i = 0; i < legsNeeded; i++) {
                const leg = document.createElement('div');
                leg.className = `leg ${i < player.legsWon ? 'won' : ''}`;
                legCounter.appendChild(leg);
            }

            const setCounter = document.createElement('div');
            setCounter.className = 'set-counter';
            const setsNeeded = Math.ceil(gameState.numSets / 2);
            for (let i = 0; i < setsNeeded; i++) {
                const set = document.createElement('div');
                set.className = `set ${i < player.setsWon ? 'won' : ''}`;
                setCounter.appendChild(set);
            }

            const playerStats = document.createElement('div');
            playerStats.className = 'player-stats';
            const dartsThrown = document.createElement('span');
            dartsThrown.textContent = `Darts: ${player.dartsThrown}`;
            const aufnahmenInfo = document.createElement('span');
            aufnahmenInfo.textContent = `Aufnahmen: ${Math.floor(player.dartsThrown / 3)}`;
            playerStats.appendChild(dartsThrown);
            playerStats.appendChild(aufnahmenInfo);

            playerCard.appendChild(playerName);
            playerCard.appendChild(playerScore);
            playerCard.appendChild(averageScore);
            playerCard.appendChild(legCounter);
            playerCard.appendChild(setCounter);
            playerCard.appendChild(playerStats);
            playerCardsContainer.appendChild(playerCard);
        });
    }

    // Update player's average score
    function updateAverageScore(player) {
        if (player.scores.length === 0) return;
        const totalScore = player.scores.reduce((sum, score) => sum + score, 0);
        const numDarts = player.dartsThrown;
        player.averageScore = (totalScore / numDarts) * 3;
    }

    // Submit score
    function submitScore() {
        let scoreValue = parseInt(currentInputField.value) || 0;
        currentInputField.value = scoreValue.toString();

        if (scoreValue < 0 || scoreValue > 180) {
            alert("Bitte gib eine gültige Punktzahl zwischen 0 und 180 ein.");
            return;
        }

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer.score - scoreValue < 0) {
            alert(`Überworfen! ${currentPlayer.name} kann nicht mehr als ${currentPlayer.score} Punkte abziehen.`);
            return;
        }

        if (scoreValue > currentPlayer.highestScore) currentPlayer.highestScore = scoreValue;
        saveThrowToDatabase(gameState.currentPlayerIndex, scoreValue);

        if (currentPlayer.score - scoreValue === 0) {
            currentPlayer.score -= scoreValue;
            currentPlayer.scores.push(scoreValue);
            currentPlayer.dartsThrown += 3;
            gameState.dartsThrown.push(scoreValue);
            updateAverageScore(currentPlayer);
            addHistoryEntry(`${currentPlayer.name} - Checkout mit ${scoreValue} Punkten!`);
            currentPlayer.legsWon += 1;
            animateWin();

            if (currentPlayer.legsWon >= Math.ceil(gameState.numLegs / 2)) {
                currentPlayer.setsWon += 1;
                addHistoryEntry(`${currentPlayer.name} gewinnt Set ${gameState.currentSet}!`);
                if (currentPlayer.setsWon >= Math.ceil(gameState.numSets / 2)) {
                    addHistoryEntry(`${currentPlayer.name} gewinnt das Spiel!`);
                    renderPlayerCards();
                    renderHistory();
                    renderPlayerStatistics();
                    return;
                }
                gameState.players.forEach(p => p.legsWon = 0);
                gameState.currentSet += 1;
            }

            gameState.players.forEach(p => p.score = gameState.gameType);
            gameState.currentLeg += 1;
            renderPlayerCards();
            renderHistory();
            renderPlayerStatistics();
            clearInput();
            currentInputField.focus(); // Fokus auf Eingabefeld setzen
            return;
        }

        currentPlayer.score -= scoreValue;
        currentPlayer.scores.push(scoreValue);
        currentPlayer.dartsThrown += 3;
        gameState.dartsThrown.push(scoreValue);
        updateAverageScore(currentPlayer);
        addHistoryEntry(`${currentPlayer.name} - ${scoreValue} Punkte`);
        nextPlayer();
        clearInput();
        renderPlayerCards();
        renderHistory();
        renderPlayerStatistics();
        currentInputField.focus(); // Fokus auf Eingabefeld setzen
    }

    // Move to next player
    function nextPlayer() {
        const currentTime = new Date();
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const turnDuration = (currentTime - gameState.turnStartTime) / 1000;
        currentPlayer.turnTime += turnDuration;
        currentPlayer.turnCount += 1;
        currentPlayer.averageTurnTime = currentPlayer.turnTime / currentPlayer.turnCount;

        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        gameState.turnStartTime = new Date();
        renderPlayerStatistics();
    }

    // Clear input
    function clearInput() {
        currentInputField.value = '';
        currentInputField.focus(); // Fokus auf Eingabefeld setzen
    }

    // Add history entry
    function addHistoryEntry(text) {
        gameState.history.push({text: text, timestamp: new Date()});
    }

    // Render history
    function renderHistory() {
        historyContainer.innerHTML = '';
        for (let i = gameState.history.length - 1; i >= 0; i--) {
            const entry = gameState.history[i];
            const historyEntry = document.createElement('div');
            historyEntry.className = 'history-entry';
            const time = entry.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            historyEntry.textContent = `${time} - ${entry.text}`;
            historyContainer.appendChild(historyEntry);
            if (historyContainer.children.length >= 20) break;
        }
    }

    // Animation for win
    function animateWin() {
        const relightSound = document.getElementById('relight-sound');
        relightSound.currentTime = 0;
        relightSound.play();

        const playerCards = document.querySelectorAll('.player-card');
        playerCards[gameState.currentPlayerIndex].classList.add('winner');
        setTimeout(() => playerCards[gameState.currentPlayerIndex].classList.remove('winner'), 2000);
        createConfetti();
    }

    // Create confetti animation
    function createConfetti() {
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
    }

    // Undo last throw
    function undoLastThrow() {
        if (gameState.dartsThrown.length === 0) return;

        if (gameState.history.length > 0) gameState.history.pop();
        const lastThrow = gameState.dartsThrown.pop();
        let playerIndex = (gameState.currentPlayerIndex - 1 + gameState.players.length) % gameState.players.length;
        gameState.currentPlayerIndex = playerIndex;

        const player = gameState.players[playerIndex];
        if (lastThrow !== 0) {
            player.score = Math.min(player.score + lastThrow, gameState.gameType);
            player.dartsThrown -= 3;
            if (player.scores.length > 0) player.scores.pop();
            updateAverageScore(player);
            if (player.turnCount > 0) {
                player.turnCount -= 1;
                player.averageTurnTime = player.turnCount > 0 ? player.turnTime / player.turnCount : 0;
                if (player.turnCount === 0) player.turnTime = 0;
            }
        }

        gameState.turnStartTime = new Date();
        renderPlayerCards();
        renderHistory();
        renderPlayerStatistics();
        currentInputField.focus(); // Fokus auf Eingabefeld setzen
    }

    // Reset all settings
    function resetSettings() {
        numPlayersSelect.value = '2';
        gameTypeSelect.value = '501';
        numSetsSelect.value = '3';
        numLegsSelect.value = '3';
        initPlayerNameInputs();
    }

    // Restart game with confirmation
    if (restartGameButton) {
        restartGameButton.addEventListener('click', function (e) {
            if (this.getAttribute('data-confirmed') !== 'true') {
                e.preventDefault();
                confirmationDialog.classList.remove('hidden');
            } else {
                restartGame();
                this.setAttribute('data-confirmed', 'false');
            }
        });
    }

    if (confirmRestartButton) {
        confirmRestartButton.addEventListener('click', function () {
            restartGameButton.setAttribute('data-confirmed', 'true');
            confirmationDialog.classList.add('hidden');
            restartGameButton.dispatchEvent(new Event('click'));
        });
    }

    if (cancelRestartButton) {
        cancelRestartButton.addEventListener('click', function () {
            confirmationDialog.classList.add('hidden');
        });
    }

    document.addEventListener('click', function (e) {
        if (!confirmationDialog.classList.contains('hidden') &&
            !confirmationDialog.contains(e.target) &&
            e.target !== restartGameButton) {
            confirmationDialog.classList.add('hidden');
        }
    });

    function restartGame() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }

        sessionStorage.removeItem('dartGameState');
        setupContainer.classList.remove('hidden');
        gameContainer.classList.add('hidden');
        restartGameButton.classList.add('hidden');

        gameState = {
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
            timerInterval: null,
            gameId: null
        };

        initPlayerNameInputs();
        clearInput();
    }

    // Start turn timer
    function startTurnTimer() {
        if (gameState.timerInterval) clearInterval(gameState.timerInterval);
        gameState.turnStartTime = new Date();
        gameState.timerInterval = setInterval(() => renderPlayerStatistics(), 1000);
    }

    // Render player statistics
    function renderPlayerStatistics() {
        const statisticsContainer = document.getElementById('player-statistics');
        statisticsContainer.innerHTML = '';

        const gameTimeInSeconds = Math.floor((new Date() - gameState.gameStartTime) / 1000);
        const gameHours = Math.floor(gameTimeInSeconds / 3600);
        const gameMinutes = Math.floor((gameTimeInSeconds % 3600) / 60);
        const gameSeconds = gameTimeInSeconds % 60;
        const gameTimeFormatted = `${gameHours > 0 ? gameHours + 'h ' : ''}${gameMinutes}m ${gameSeconds.toString().padStart(2, '0')}s`;

        const gameDurationDiv = document.createElement('div');
        gameDurationDiv.className = 'player-statistic';
        gameDurationDiv.innerHTML = `<div class="statistic-name">Spieldauer</div><div class="statistic-value">${gameTimeFormatted}</div>`;
        statisticsContainer.appendChild(gameDurationDiv);

        gameState.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-statistic';

            const playerName = document.createElement('div');
            playerName.className = 'statistic-name';
            if (index === gameState.currentPlayerIndex) {
                const turnTime = Math.floor((new Date() - gameState.turnStartTime) / 1000);
                const minutes = Math.floor(turnTime / 60);
                const seconds = turnTime % 60;
                const timeFormatted = `${minutes > 0 ? minutes + 'm ' : ''}${seconds.toString().padStart(2, '0')}s`;
                playerName.innerHTML = `${player.name} <span class="turn-timer">${timeFormatted}</span>`;
            } else {
                playerName.textContent = player.name;
            }

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'statistic-details';
            detailsDiv.innerHTML = `
                <div class="statistic-item">
                    <span class="statistic-label">Durchschnitt</span>
                    <div class="statistic-value">${player.averageScore.toFixed(1)}</div>
                </div>
                <div class="statistic-item">
                    <span class="statistic-label">Höchste Aufnahme</span>
                    <div class="statistic-value">${player.highestScore || "0"}</div>
                </div>
                <div class="statistic-item">
                    <span class="statistic-label">Ø Zeit pro Zug</span>
                    <div class="statistic-value">${player.turnCount > 0 ? Math.floor(player.averageTurnTime) + 's' : '-'}</div>
                </div>
                <div class="statistic-item">
                    <span class="statistic-label">Gesamtzeit</span>
                    <div class="statistic-value">${Math.floor(player.turnTime / 60) > 0 ? Math.floor(player.turnTime / 60) + 'm ' : ''}${Math.floor(player.turnTime % 60).toString().padStart(2, '0')}s</div>
                </div>
            `;

            playerDiv.appendChild(playerName);
            playerDiv.appendChild(detailsDiv);
            statisticsContainer.appendChild(playerDiv);
        });
    }

    // Open statistics page
    function openStatisticsPage() {
        saveGameStateBeforeNavigation();
        window.location.href = 'statistics.html';
    }

    // Check for saved game state
    function checkForSavedGameState() {
        if (!loadGameStateAfterNavigation()) initPlayerNameInputs();
    }

    // Save game state before navigation
    function saveGameStateBeforeNavigation() {
        if (gameState.players.length > 0) {
            const timerInterval = gameState.timerInterval;
            gameState.timerInterval = null;
            sessionStorage.setItem('dartGameState', JSON.stringify(gameState));
            gameState.timerInterval = timerInterval;
        }
    }

    // Load game state after navigation
    function loadGameStateAfterNavigation() {
        const savedState = sessionStorage.getItem('dartGameState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                gameState = parsedState;
                gameState.turnStartTime = new Date(gameState.turnStartTime);
                gameState.gameStartTime = new Date(gameState.gameStartTime);
                gameState.history.forEach(entry => entry.timestamp = new Date(entry.timestamp));
                startTurnTimer();
                renderPlayerCards();
                renderHistory();
                renderPlayerStatistics();
                setupContainer.classList.add('hidden');
                gameContainer.classList.remove('hidden');
                restartGameButton.classList.remove('hidden');
                console.log('Spielstand wiederhergestellt');

                // Setze den Fokus auf das Eingabefeld
                if (currentInputField) {
                    currentInputField.focus();
                }

                return true;
            } catch (error) {
                console.error('Fehler beim Wiederherstellen des Spielstands:', error);
                sessionStorage.removeItem('dartGameState');
            }
        }
        return false;
    }

    function loadGameStateAfterNavigation() {
        const savedState = sessionStorage.getItem('dartGameState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                gameState = parsedState;
                gameState.turnStartTime = new Date(gameState.turnStartTime);
                gameState.gameStartTime = new Date(gameState.gameStartTime);
                gameState.history.forEach(entry => entry.timestamp = new Date(entry.timestamp));
                startTurnTimer();
                renderPlayerCards();
                renderHistory();
                renderPlayerStatistics();

                //  **WICHTIG:** Stelle sicher, dass gameContainer angezeigt und setupContainer ausgeblendet ist
                setupContainer.classList.add('hidden');
                gameContainer.classList.remove('hidden');
                restartGameButton.classList.remove('hidden');

                console.log('Spielstand wiederhergestellt');

                // Setze den Fokus auf das Eingabefeld
                if (currentInputField) {
                    currentInputField.focus();
                }

                return true;
            } catch (error) {
                console.error('Fehler beim Wiederherstellen des Spielstands:', error);
                sessionStorage.removeItem('dartGameState');
            }
        }
        return false;
    }

    // Check for saved game state
    function checkForSavedGameState() {
        if (!loadGameStateAfterNavigation()) initPlayerNameInputs();
    }

    window.addEventListener('beforeunload', saveGameStateBeforeNavigation);
    window.addEventListener('load', checkForSavedGameState);

    // Event listeners
    numPlayersSelect.addEventListener('change', initPlayerNameInputs);
    startGameButton.addEventListener('click', initGame);
    resetSettingsButton.addEventListener('click', resetSettings);
    clearInputButton.addEventListener('click', clearInput);
    submitScoreButton.addEventListener('click', submitScore);
    undoThrowButton.addEventListener('click', undoLastThrow);
    currentInputField.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitScore();
        }
    });
    if (exportButton) exportButton.addEventListener('click', exportGameData);
    if (exportPlayersButton) exportPlayersButton.addEventListener('click', exportAllPlayerData);
    if (exportAllGamesButton) exportAllGamesButton.addEventListener('click', exportAllGames);
    if (viewStatsButton) viewStatsButton.addEventListener('click', openStatisticsPage);
    if (resetDataButton) resetDataButton.addEventListener('click', resetAllData);
    if (importDataButton) {
        importDataButton.addEventListener('click', function () {
            importModal.style.display = 'block';
            importStatus.textContent = '';
        });
    }
    if (closeImportModalButton) {
        closeImportModalButton.addEventListener('click', function () {
            importModal.style.display = 'none';
        });
    }
    window.addEventListener('click', function (event) {
        if (event.target === importModal) importModal.style.display = 'none';
    });
    if (fileInput) {
        fileInput.addEventListener('change', function (event) {
            handleImportFile(event.target.files[0]);
        });
    }
    if (fileDropArea) {
        const fileSelectButton = fileDropArea.querySelector('.file-select-button');
        if (fileSelectButton) fileSelectButton.addEventListener('click', function () {
            fileInput.click();
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, function () {
                fileDropArea.classList.add('highlight');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, function () {
                fileDropArea.classList.remove('highlight');
            }, false);
        });

        fileDropArea.addEventListener('drop', function (e) {
            handleImportFile(e.dataTransfer.files[0]);
        }, false);
    }

    // Initialize
    initDatabase();
    checkForSavedGameState();
});
