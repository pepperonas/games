document.addEventListener('DOMContentLoaded', function () {
    // Database functionality
    let db;

    // Initialize the database on page load
    function initDatabase() {
        const request = indexedDB.open('DartCounterDB', 1);

        // Handle database upgrade/creation
        request.onupgradeneeded = function (event) {
            db = event.target.result;

            // Create throws store
            if (!db.objectStoreNames.contains('throws')) {
                const throwsStore = db.createObjectStore('throws', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                throwsStore.createIndex('gameId', 'gameId', {unique: false});
                throwsStore.createIndex('playerId', 'playerId', {unique: false});
                throwsStore.createIndex('timestamp', 'timestamp', {unique: false});
            }

            // Create games store
            if (!db.objectStoreNames.contains('games')) {
                const gamesStore = db.createObjectStore('games', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                gamesStore.createIndex('timestamp', 'timestamp', {unique: false});
            }

            // Create players store
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

            // Update database status indicator
            const dbStatus = document.getElementById('db-status');
            if (dbStatus) {
                dbStatus.textContent = 'DB: Verbunden';
                dbStatus.classList.add('connected');

                // Hide status after 3 seconds
                setTimeout(() => {
                    dbStatus.style.opacity = '0';
                    setTimeout(() => {
                        dbStatus.style.display = 'none';
                    }, 1000);
                }, 3000);
            }
        };

        request.onerror = function (event) {
            console.error('Database error:', event.target.error);
            alert('Datenbank-Fehler: ' + event.target.error);

            // Update database status indicator
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

            // Save initial player entries
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
            // Check if player already exists by name
            const nameIndex = playersStore.index('name');
            const nameRequest = nameIndex.get(player.name);

            nameRequest.onsuccess = function (event) {
                const existingPlayer = event.target.result;

                if (existingPlayer) {
                    // Player exists, store ID reference
                    player.id = existingPlayer.id;
                } else {
                    // Player doesn't exist, add new player
                    const playerData = {
                        name: player.name,
                        firstSeen: new Date()
                    };

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

        request.onsuccess = function (event) {
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

        // Get game data
        const gameRequest = gamesStore.get(gameId);

        gameRequest.onsuccess = function (event) {
            const gameData = event.target.result;

            // Get all throws for this game
            const throwsIndex = throwsStore.index('gameId');
            const throwsRequest = throwsIndex.getAll(gameId);

            throwsRequest.onsuccess = function (event) {
                const throwsData = event.target.result;

                // Combine data
                const exportData = {
                    game: gameData,
                    throws: throwsData,
                    exportVersion: "1.0",
                    exportDate: new Date().toISOString()
                };

                // Create download
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

    // Importieren von JSON-Daten
    function importGameData(jsonData) {
        if (!db) {
            alert('Keine Datenbankverbindung vorhanden.');
            return;
        }

        try {
            // Parse JSON wenn es als String übergeben wurde
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            if (!data.game || !data.throws) {
                throw new Error('Ungültiges Datenformat');
            }

            const transaction = db.transaction(['games', 'throws', 'players'], 'readwrite');
            const gamesStore = transaction.objectStore('games');
            const throwsStore = transaction.objectStore('throws');
            const playersStore = transaction.objectStore('players');

            // Zuerst das Spiel speichern
            const game = data.game;
            const gameRequest = gamesStore.add(game);

            gameRequest.onsuccess = function (event) {
                const gameId = event.target.result;
                console.log('Spiel importiert mit ID:', gameId);

                // Dann Spieler prüfen/anlegen
                const playerPromises = [];
                const playerIds = {};

                game.players.forEach(player => {
                    playerPromises.push(new Promise((resolve) => {
                        // Suche nach Spieler mit gleichem Namen
                        const nameIndex = playersStore.index('name');
                        const nameRequest = nameIndex.get(player.name);

                        nameRequest.onsuccess = function (event) {
                            const existingPlayer = event.target.result;

                            if (existingPlayer) {
                                // Spieler existiert bereits
                                playerIds[player.name] = existingPlayer.id;
                                resolve();
                            } else {
                                // Neuen Spieler anlegen
                                const playerData = {
                                    name: player.name,
                                    firstSeen: new Date()
                                };

                                const addRequest = playersStore.add(playerData);

                                addRequest.onsuccess = function (event) {
                                    playerIds[player.name] = event.target.result;
                                    resolve();
                                };

                                addRequest.onerror = function () {
                                    resolve(); // Trotzdem fortfahren
                                };
                            }
                        };

                        nameRequest.onerror = function () {
                            resolve(); // Trotzdem fortfahren
                        };
                    }));
                });

                // Wenn alle Spieler bearbeitet wurden, die Würfe importieren
                Promise.all(playerPromises).then(() => {
                    let importedThrows = 0;

                    // Alle Würfe mit den neuen IDs speichern
                    data.throws.forEach(throwData => {
                        // Aktualisiere GameID und PlayerID
                        throwData.gameId = gameId;

                        if (playerIds[throwData.playerName]) {
                            throwData.playerId = playerIds[throwData.playerName];
                        }

                        // ID entfernen, damit eine neue generiert wird
                        delete throwData.id;

                        // Wurf speichern
                        const throwRequest = throwsStore.add(throwData);

                        throwRequest.onsuccess = function () {
                            importedThrows++;

                            if (importedThrows === data.throws.length) {
                                alert(`Import abgeschlossen: 1 Spiel und ${importedThrows} Würfe importiert.`);
                            }
                        };
                    });
                });
            };

            gameRequest.onerror = function (event) {
                console.error('Fehler beim Importieren des Spiels:', event.target.error);
                alert('Beim Importieren ist ein Fehler aufgetreten.');
            };

        } catch (error) {
            console.error('Fehler beim Parsen oder Importieren:', error);
            alert('Die Datei konnte nicht importiert werden. Bitte überprüfe das Format.');
        }
    }

    // Funktion zum Verarbeiten der importierten Datei
    function handleImportFile(file) {
        if (!file) {
            return;
        }

        if (file.type !== 'application/json') {
            importStatus.textContent = 'Fehler: Bitte wähle eine JSON-Datei aus.';
            importStatus.style.color = '#e74c3c';
            return;
        }

        importStatus.textContent = 'Datei wird verarbeitet...';
        importStatus.style.color = '';

        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                const jsonData = event.target.result;
                importGameData(jsonData);

                // Erfolgreich importiert, schließe Modal nach kurzer Verzögerung
                setTimeout(() => {
                    importModal.style.display = 'none';
                }, 2000);

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

    // Reset aller Daten in der Datenbank
    function resetAllData() {
        if (!db) {
            alert('Keine Datenbankverbindung vorhanden.');
            return;
        }

        if (!confirm('Möchtest du wirklich ALLE Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
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
            alert('Alle Daten wurden erfolgreich gelöscht!');

            // Lösche auch den gespeicherten Spielstand
            sessionStorage.removeItem('dartGameState');

            // Setze die Anwendung zurück
            restartGame();
        };

        transaction.onerror = function (event) {
            console.error('Fehler beim Löschen aller Daten:', event.target.error);
            alert('Beim Löschen der Daten ist ein Fehler aufgetreten.');
        };
    }

    // Spielstand speichern bevor wir zur Statistikseite gehen
    function saveGameStateBeforeNavigation() {
        if (gameState.players.length > 0) {
            // Entferne timerInterval, da wir das nicht serialisieren können
            const timerInterval = gameState.timerInterval;
            gameState.timerInterval = null;

            // Speichere den Spielstand in sessionStorage
            sessionStorage.setItem('dartGameState', JSON.stringify(gameState));

            // Stelle timerInterval wieder her
            gameState.timerInterval = timerInterval;
        }
    }

    // Spielstand laden wenn wir zur Spielseite zurückkehren
    function loadGameStateAfterNavigation() {
        const savedState = sessionStorage.getItem('dartGameState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);

                // Stelle das gameState-Objekt wieder her
                gameState = parsedState;

                // Konvertiere Datumsstrings zurück in Date-Objekte
                gameState.turnStartTime = new Date(gameState.turnStartTime);
                gameState.gameStartTime = new Date(gameState.gameStartTime);

                // Konvertiere history timestamps zurück in Date-Objekte
                gameState.history.forEach(entry => {
                    entry.timestamp = new Date(entry.timestamp);
                });

                // Starte den Timer neu
                startTurnTimer();

                // UI aktualisieren
                renderPlayerCards();
                renderHistory();
                renderPlayerStatistics();

                // Setup verstecken, Spiel anzeigen
                setupContainer.classList.add('hidden');
                gameContainer.classList.remove('hidden');
                restartGameButton.classList.remove('hidden');

                console.log('Spielstand wiederhergestellt');
                return true;
            } catch (error) {
                console.error('Fehler beim Wiederherstellen des Spielstands:', error);
                sessionStorage.removeItem('dartGameState');
            }
        }
        return false;
    }

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

    // Import-related DOM elements
    const importDataButton = document.getElementById('import-data');
    const fileInput = document.getElementById('file-input');
    const importModal = document.getElementById('import-modal');
    const closeImportModalButton = document.getElementById('close-import-modal');
    const fileDropArea = document.getElementById('file-drop-area');
    const importStatus = document.getElementById('import-status');

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
        gameId: null // Add gameId for database reference
    };

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
            gameId: null // Add gameId for database reference
        };

        // Initialize players
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
                id: null // Add id for database reference
            });
        }

        renderPlayerCards();
        renderHistory();
        renderPlayerStatistics();

        // Save game to database
        saveGameToDatabase();

        // Start the turn timer
        startTurnTimer();

        // Show game container, hide setup
        setupContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        restartGameButton.classList.remove('hidden');
    }

    // Render player cards
    function renderPlayerCards() {
        playerCardsContainer.innerHTML = '';

        gameState.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${index === gameState.currentPlayerIndex ? 'active' : ''}`;

            // Turn indicator for active player
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

            // Leg counter
            const legCounter = document.createElement('div');
            legCounter.className = 'leg-counter';

            const legsNeeded = Math.ceil(gameState.numLegs / 2);
            for (let i = 0; i < legsNeeded; i++) {
                const leg = document.createElement('div');
                leg.className = `leg ${i < player.legsWon ? 'won' : ''}`;
                legCounter.appendChild(leg);
            }

            // Set counter
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
        player.averageScore = (totalScore / numDarts) * 3; // Multiply by 3 for the standard 3-dart average
    }

    // Submit score
    function submitScore() {
        let scoreValue = parseInt(currentInputField.value);

        // If no input, treat as 0
        if (isNaN(scoreValue)) {
            scoreValue = 0;
            currentInputField.value = "0";
        }

        // Validate score
        if (scoreValue < 0 || scoreValue > 180) {
            alert("Bitte gib eine gültige Punktzahl zwischen 0 und 180 ein.");
            return;
        }

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        // Check if the score would bust
        if (currentPlayer.score - scoreValue < 0) {
            // Show warning
            alert(`Überworfen! ${currentPlayer.name} kann nicht mehr als ${currentPlayer.score} Punkte abziehen.`);
            return; // Don't record the bust until valid score is entered
        }

        // Update highest score if applicable
        if (scoreValue > currentPlayer.highestScore) {
            currentPlayer.highestScore = scoreValue;
        }

        // Save throw to database
        saveThrowToDatabase(gameState.currentPlayerIndex, scoreValue);

        // Check for checkout
        if (currentPlayer.score - scoreValue === 0) {
            // Player wins the leg
            currentPlayer.score -= scoreValue;
            currentPlayer.scores.push(scoreValue);
            currentPlayer.dartsThrown += 3; // Always count as 3 darts for 3-dart sum
            gameState.dartsThrown.push(scoreValue);

            // Update average score
            updateAverageScore(currentPlayer);

            addHistoryEntry(`${currentPlayer.name} - Checkout mit ${scoreValue} Punkten!`);

            // Player won leg
            currentPlayer.legsWon += 1;

            // Animate win
            animateWin();

            // Check if player won set
            if (currentPlayer.legsWon >= Math.ceil(gameState.numLegs / 2)) {
                currentPlayer.setsWon += 1;
                addHistoryEntry(`${currentPlayer.name} gewinnt Set ${gameState.currentSet}!`);

                // Check if player won match
                if (currentPlayer.setsWon >= Math.ceil(gameState.numSets / 2)) {
                    addHistoryEntry(`${currentPlayer.name} gewinnt das Spiel!`);
                    renderPlayerCards();
                    renderHistory();
                    renderPlayerStatistics();
                    return;
                }

                // Reset legs for next set
                gameState.players.forEach(p => p.legsWon = 0);
                gameState.currentSet += 1;
            }

            // Reset scores for next leg
            gameState.players.forEach(p => p.score = gameState.gameType);
            gameState.currentLeg += 1;

            renderPlayerCards();
            renderHistory();
            renderPlayerStatistics();
            clearInput();
            return;
        }

        // Regular throw
        currentPlayer.score -= scoreValue;
        currentPlayer.scores.push(scoreValue);
        currentPlayer.dartsThrown += 3; // Always count as 3 darts for 3-dart sum
        gameState.dartsThrown.push(scoreValue);

        // Update average score
        updateAverageScore(currentPlayer);

        addHistoryEntry(`${currentPlayer.name} - ${scoreValue} Punkte`);

        // Move to next player (always after 3 darts in this mode)
        nextPlayer();

        clearInput();
        renderPlayerCards();
        renderHistory();
        renderPlayerStatistics();
    }

    // Move to next player
    function nextPlayer() {
        // Record turn time for current player
        const currentTime = new Date();
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const turnDuration = (currentTime - gameState.turnStartTime) / 1000; // in seconds

        currentPlayer.turnTime += turnDuration;
        currentPlayer.turnCount += 1;
        currentPlayer.averageTurnTime = currentPlayer.turnTime / currentPlayer.turnCount;

        // Move to next player
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

        // Reset turn timer for next player
        gameState.turnStartTime = new Date();

        // Update statistics
        renderPlayerStatistics();
    }

    // Clear input
    function clearInput() {
        currentInputField.value = '';
    }

    // Add history entry
    function addHistoryEntry(text) {
        gameState.history.push({
            text: text,
            timestamp: new Date()
        });
    }

    // Render history
    function renderHistory() {
        historyContainer.innerHTML = '';

        // Show most recent entries first
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

            // Limit history to last 20 entries
            if (historyContainer.children.length >= 20) {
                break;
            }
        }
    }

    // Animation for win
    function animateWin() {
        // Play victory sound
        const relightSound = document.getElementById('relight-sound');
        relightSound.currentTime = 0; // Reset sound to start
        relightSound.play();

        // Add winner class to current player card
        const playerCards = document.querySelectorAll('.player-card');
        playerCards[gameState.currentPlayerIndex].classList.add('winner');

        // Remove the class after animation completes
        setTimeout(() => {
            playerCards[gameState.currentPlayerIndex].classList.remove('winner');
        }, 2000);

        // Create confetti effect
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

            // Remove confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, 6000);
        }
    }

    // Undo last throw
    function undoLastThrow() {
        if (gameState.dartsThrown.length === 0) {
            return; // Nothing to undo
        }

        // Remove last entry from history
        if (gameState.history.length > 0) {
            gameState.history.pop();
        }

        // Get last throw
        const lastThrow = gameState.dartsThrown.pop();

        // Determine whose throw to undo
        let playerIndex = gameState.currentPlayerIndex;

        // We're at the start of a player's turn, so the last throw was from previous player
        playerIndex = (playerIndex - 1 + gameState.players.length) % gameState.players.length;
        gameState.currentPlayerIndex = playerIndex;

        const player = gameState.players[playerIndex];

        // Restore score if it wasn't a bust
        if (lastThrow !== 0) {
            // Ensure score doesn't exceed game type (starting score)
            player.score = Math.min(player.score + lastThrow, gameState.gameType);
            player.dartsThrown -= 3;

            // Remove the last score from the player's scores array
            if (player.scores.length > 0) {
                player.scores.pop();
            }

            // Update average
            updateAverageScore(player);

            // Revert turn time tracking
            if (player.turnCount > 0) {
                player.turnCount -= 1;
                // This is approximate since we don't store individual turn times
                if (player.turnCount > 0) {
                    player.averageTurnTime = player.turnTime / player.turnCount;
                } else {
                    player.turnTime = 0;
                    player.averageTurnTime = 0;
                }
            }
        }

        // Reset the turn timer for the current player
        gameState.turnStartTime = new Date();

        renderPlayerCards();
        renderHistory();
        renderPlayerStatistics();
    }

    // Reset all settings
    function resetSettings() {
        numPlayersSelect.value = '2';
        gameTypeSelect.value = '501';
        numSetsSelect.value = '3';
        numLegsSelect.value = '3';

        initPlayerNameInputs();
    }

    // Restart game
    function restartGame() {
        // Clear timer interval if it exists
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }

        // Löschen des gespeicherten Spielstands
        sessionStorage.removeItem('dartGameState');

        setupContainer.classList.remove('hidden');
        gameContainer.classList.add('hidden');
        restartGameButton.classList.add('hidden');

        initPlayerNameInputs();
    }

    // Start turn timer
    function startTurnTimer() {
        // Clear existing timer if any
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }

        // Set initial turn time
        gameState.turnStartTime = new Date();

        // Update timer display every second
        const timerInterval = setInterval(() => {
            renderPlayerStatistics();
        }, 1000);

        // Store interval ID in game state to clear it later if needed
        gameState.timerInterval = timerInterval;
    }

    // Render player statistics
    function renderPlayerStatistics() {
        const statisticsContainer = document.getElementById('player-statistics');
        statisticsContainer.innerHTML = '';

        // Calculate game duration
        const gameTimeInSeconds = Math.floor((new Date() - gameState.gameStartTime) / 1000);
        const gameHours = Math.floor(gameTimeInSeconds / 3600);
        const gameMinutes = Math.floor((gameTimeInSeconds % 3600) / 60);
        const gameSeconds = gameTimeInSeconds % 60;
        const gameTimeFormatted =
            `${gameHours > 0 ? gameHours + 'h ' : ''}${gameMinutes}m ${gameSeconds.toString().padStart(2, '0')}s`;

        // Game duration statistic
        const gameDurationDiv = document.createElement('div');
        gameDurationDiv.className = 'player-statistic';

        const gameDurationTitle = document.createElement('div');
        gameDurationTitle.className = 'statistic-name';
        gameDurationTitle.textContent = 'Spieldauer';

        const gameDurationValue = document.createElement('div');
        gameDurationValue.className = 'statistic-value';
        gameDurationValue.textContent = gameTimeFormatted;

        gameDurationDiv.appendChild(gameDurationTitle);
        gameDurationDiv.appendChild(gameDurationValue);
        statisticsContainer.appendChild(gameDurationDiv);

        // Player statistics
        gameState.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-statistic';

            const playerName = document.createElement('div');
            playerName.className = 'statistic-name';

            // Add turn indicator for current player
            if (index === gameState.currentPlayerIndex) {
                const turnTime = Math.floor((new Date() - gameState.turnStartTime) / 1000);
                const minutes = Math.floor(turnTime / 60);
                const seconds = turnTime % 60;
                const timeFormatted = `${minutes > 0 ? minutes + 'm ' : ''}${seconds.toString().padStart(2, '0')}s`;

                playerName.innerHTML = `${player.name} <span class="turn-timer">${timeFormatted}</span>`;
            } else {
                playerName.textContent = player.name;
            }

            // Statistic details container
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'statistic-details';

            // Average score
            const avgScoreDiv = document.createElement('div');
            avgScoreDiv.className = 'statistic-item';

            const avgScoreLabel = document.createElement('span');
            avgScoreLabel.className = 'statistic-label';
            avgScoreLabel.textContent = 'Durchschnitt';

            const avgScoreValue = document.createElement('div');
            avgScoreValue.className = 'statistic-value';
            avgScoreValue.textContent = player.averageScore.toFixed(1);

            avgScoreDiv.appendChild(avgScoreLabel);
            avgScoreDiv.appendChild(avgScoreValue);

            // Highest score
            const highScoreDiv = document.createElement('div');
            highScoreDiv.className = 'statistic-item';

            const highScoreLabel = document.createElement('span');
            highScoreLabel.className = 'statistic-label';
            highScoreLabel.textContent = 'Höchste Aufnahme';

            const highScoreValue = document.createElement('div');
            highScoreValue.className = 'statistic-value';
            highScoreValue.textContent = player.highestScore || "0";

            highScoreDiv.appendChild(highScoreLabel);
            highScoreDiv.appendChild(highScoreValue);

            // Average turn time
            const avgTimeDiv = document.createElement('div');
            avgTimeDiv.className = 'statistic-item';

            const avgTimeLabel = document.createElement('span');
            avgTimeLabel.className = 'statistic-label';
            avgTimeLabel.textContent = 'Ø Zeit pro Zug';

            const avgTimeValue = document.createElement('div');
            avgTimeValue.className = 'statistic-value';

            if (player.turnCount > 0) {
                const avgSeconds = Math.floor(player.averageTurnTime);
                avgTimeValue.textContent = `${avgSeconds}s`;
            } else {
                avgTimeValue.textContent = '-';
            }

            avgTimeDiv.appendChild(avgTimeLabel);
            avgTimeDiv.appendChild(avgTimeValue);

            // Total turn time
            const totalTimeDiv = document.createElement('div');
            totalTimeDiv.className = 'statistic-item';

            const totalTimeLabel = document.createElement('span');
            totalTimeLabel.className = 'statistic-label';
            totalTimeLabel.textContent = 'Gesamtzeit';

            const totalTimeValue = document.createElement('div');
            totalTimeValue.className = 'statistic-value';

            const totalSeconds = Math.floor(player.turnTime);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            totalTimeValue.textContent = `${minutes > 0 ? minutes + 'm ' : ''}${seconds.toString().padStart(2, '0')}s`;

            totalTimeDiv.appendChild(totalTimeLabel);
            totalTimeDiv.appendChild(totalTimeValue);

            // Add all statistics to details container
            detailsDiv.appendChild(avgScoreDiv);
            detailsDiv.appendChild(highScoreDiv);
            detailsDiv.appendChild(avgTimeDiv);
            detailsDiv.appendChild(totalTimeDiv);

            // Add to player div
            playerDiv.appendChild(playerName);
            playerDiv.appendChild(detailsDiv);

            // Add to statistics container
            statisticsContainer.appendChild(playerDiv);
        });
    }

    // Open statistics page
    function openStatisticsPage() {
        saveGameStateBeforeNavigation();
        window.location.href = 'statistics.html';
    }

    // Check if there's a saved game state to restore
    function checkForSavedGameState() {
        if (!loadGameStateAfterNavigation()) {
            // Kein gespeicherter Spielstand, normale Initialisierung fortsetzen
            initPlayerNameInputs();
        }
    }

    // Event listeners
    numPlayersSelect.addEventListener('change', initPlayerNameInputs);
    startGameButton.addEventListener('click', initGame);
    resetSettingsButton.addEventListener('click', resetSettings);
    restartGameButton.addEventListener('click', restartGame);

    clearInputButton.addEventListener('click', clearInput);
    submitScoreButton.addEventListener('click', submitScore);
    undoThrowButton.addEventListener('click', undoLastThrow);

    // Add Enter key event listener for score input
    currentInputField.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
            submitScore();
        }
    });

    // Add export button and view stats button event listeners
    const exportButton = document.getElementById('export-data');
    if (exportButton) {
        exportButton.addEventListener('click', exportGameData);
    }

    if (viewStatsButton) {
        viewStatsButton.addEventListener('click', openStatisticsPage);
    }

    // Add event listener for reset data button
    const resetDataButton = document.getElementById('reset-data');
    if (resetDataButton) {
        resetDataButton.addEventListener('click', resetAllData);
    }

    // Import-related event listeners
    if (importDataButton) {
        importDataButton.addEventListener('click', function () {
            // Modal öffnen
            importModal.style.display = 'block';
            importStatus.textContent = '';
        });
    }

    if (closeImportModalButton) {
        closeImportModalButton.addEventListener('click', function () {
            importModal.style.display = 'none';
        });
    }

    // Schließe Modal wenn außerhalb geklickt wird
    window.addEventListener('click', function (event) {
        if (event.target === importModal) {
            importModal.style.display = 'none';
        }
    });

    // File Input Event-Listener
    if (fileInput) {
        fileInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            handleImportFile(file);
        });
    }

    // Drag & Drop für Dateiupload
    if (fileDropArea) {
        // Verbinde den Button mit dem versteckten file input
        const fileSelectButton = fileDropArea.querySelector('.file-select-button');
        if (fileSelectButton) {
            fileSelectButton.addEventListener('click', function () {
                fileInput.click();
            });
        }

        // Drag-Events für Styling
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

        // Drop-Event
        fileDropArea.addEventListener('drop', function (e) {
            const file = e.dataTransfer.files[0];
            handleImportFile(file);
        }, false);
    }

    // Initialize database
    initDatabase();

    // Check for saved game state, then initialize
    checkForSavedGameState();
});