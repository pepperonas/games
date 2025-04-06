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

    function togglePage() {
        const currentPage = window.location.pathname;
        if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
            window.location.href = 'statistics.html';
        } else if (currentPage.includes('statistics.html')) {
            window.location.href = 'index.html';
        }
    }

    document.getElementById('back-to-game').addEventListener('click', function () {
        window.location.href = 'index.html';
    });

    const pageToggleButton = document.getElementById('page-toggle');
    if (pageToggleButton) {
        pageToggleButton.addEventListener('click', togglePage);
    }

    // Modal elements
    const playerManagementModal = document.getElementById('player-management-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationMessage = document.getElementById('confirmation-message');
    const confirmActionBtn = document.getElementById('confirm-action');
    const cancelActionBtn = document.getElementById('cancel-action');

    // Action to perform when confirmed
    let pendingAction = null;

    // Database functionality
    let db;
    let chart = null; // Reference to Chart.js instance

    // Initialize the database
    function initDatabase() {
        const request = indexedDB.open('DartCounterDB', 1);

        request.onsuccess = function (event) {
            db = event.target.result;
            console.log('Database initialized successfully');
            loadStatistics();
        };

        request.onerror = function (event) {
            console.error('Database error:', event.target.error);
            alert('Datenbank-Fehler: ' + event.target.error);
        };
    }

    // Load player statistics
    function loadStatistics() {
        if (!db) return;

        // Load players for dropdown
        const playerSelect = document.getElementById('player-select');
        const transaction = db.transaction(['players', 'throws', 'games'], 'readonly');
        const playersStore = transaction.objectStore('players');
        const throwsStore = transaction.objectStore('throws');
        const gamesStore = transaction.objectStore('games');

        // Get all players
        const playersRequest = playersStore.getAll();

        playersRequest.onsuccess = function (event) {
            const players = event.target.result;

            // Populate player dropdown
            playerSelect.innerHTML = '<option value="all">Alle Spieler</option>';
            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                playerSelect.appendChild(option);
            });

            // Load player stats
            loadPlayerStats('all');

            // Load games table
            loadGamesTable();
        };

        // Player selection change
        playerSelect.addEventListener('change', function () {
            loadPlayerStats(this.value);
        });
    }

    // Create score history chart mit Zoom
    function createScoreHistoryChart(throws) {
        if (throws.length === 0) {
            const chartContainer = document.getElementById('score-history-chart');
            chartContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Keine Daten vorhanden</div>';
            return;
        }

        // Sortiere alle Würfe chronologisch
        throws.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Setze Datumsgrenzen für Filter
        if (throws.length > 0) {
            const firstDate = new Date(throws[0].timestamp);
            const lastDate = new Date(throws[throws.length - 1].timestamp);
            
            const startDateInput = document.getElementById('start-date');
            const endDateInput = document.getElementById('end-date');
            
            if (!startDateInput.value) {
                startDateInput.valueAsDate = firstDate;
            }
            if (!endDateInput.value) {
                endDateInput.valueAsDate = lastDate;
            }
        }

        // Erstelle einen gemeinsamen Zeitstrahl für alle Würfe
        const allTimeLabels = [];
        const timeData = {};

        // Extrahiere alle Zeitstempel und erstelle einen gemeinsamen Zeitstrahl
        throws.forEach(t => {
            const throwDate = new Date(t.timestamp);
            const timeLabel = throwDate.toLocaleDateString() + ' ' +
                throwDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

            if (!allTimeLabels.includes(timeLabel)) {
                allTimeLabels.push(timeLabel);
            }

            // Speichere den Zeitstempel und den zugehörigen Score
            if (!timeData[timeLabel]) {
                timeData[timeLabel] = {};
            }

            if (!timeData[timeLabel][t.playerName]) {
                timeData[timeLabel][t.playerName] = t.score;
            }
        });

        // Erstelle die Datasets für jeden Spieler
        const datasets = [];
        const colors = ['#2980b9', '#e74c3c', '#27ae60', '#f39c12', '#8e44ad', '#16a085'];

        // Sammle alle eindeutigen Spielernamen
        const allPlayers = [...new Set(throws.map(t => t.playerName))];

        allPlayers.forEach((playerName, index) => {
            // Gruppiere die Daten nach Spiel-ID, um Sessions zu identifizieren
            const playerGames = {};

            throws.forEach(t => {
                if (t.playerName === playerName) {
                    if (!playerGames[t.gameId]) {
                        playerGames[t.gameId] = [];
                    }
                    playerGames[t.gameId].push({
                        x: new Date(t.timestamp),
                        y: t.score,
                        timeLabel: new Date(t.timestamp).toLocaleDateString() + ' ' +
                            new Date(t.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                    });
                }
            });

            // Sortiere die Datenpunkte jedes Spiels chronologisch
            Object.values(playerGames).forEach(game => {
                game.sort((a, b) => a.x - b.x);
            });

            // Erstelle separate Datasets für jede Spielsession des Spielers
            Object.entries(playerGames).forEach(([gameId, gameTurns], gameIndex) => {
                datasets.push({
                    label: `${playerName} (Spiel ${gameIndex + 1})`,
                    data: gameTurns.map(turn => ({
                        x: turn.timeLabel,
                        y: turn.y
                    })),
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length] + '33',
                    tension: 0.1,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true // Verbinde alle Punkte innerhalb einer Session
                });
            });
        });

        // Destroy previous chart if it exists
        if (chart) {
            chart.destroy();
        }

        // Create chart with zoom plugin
        const ctx = document.getElementById('scoreChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allTimeLabels.sort(),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Punktzahl'
                        }
                    },
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Zeitpunkt'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            callback: function (value, index, values) {
                                // Zeige nur das Datum für den ersten Eintrag des Tages
                                const label = allTimeLabels[index];
                                if (!label) return '';
                                
                                const datePart = label.split(' ')[0];
                                // Prüfen, ob dies der erste Eintrag für dieses Datum ist
                                if (index === 0 || !allTimeLabels[index - 1]?.startsWith(datePart)) {
                                    return label;
                                }
                                // Für die weiteren Einträge des Tages nur die Uhrzeit anzeigen
                                return label.split(' ')[1] || '';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function (tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function (context) {
                                // Entferne "(Spiel X)" aus dem Label für die Anzeige
                                const playerName = context.dataset.label.split(' (Spiel')[0];
                                return `${playerName}: ${context.parsed.y} Punkte`;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy',
                            onZoomComplete: function() {
                                // Update UI to show current zoom state
                                const zoomResetBtn = document.getElementById('zoom-reset');
                                if (zoomResetBtn) {
                                    zoomResetBtn.disabled = false;
                                }
                            }
                        },
                        limits: {
                            y: {min: 0, max: 180}
                        }
                    }
                }
            }
        });

        // Event-Listener für Zoom-Buttons
        document.getElementById('zoom-in')?.addEventListener('click', function() {
            if (chart) {
                try {
                    chart.zoom(1.1);
                    document.getElementById('zoom-reset').disabled = false;
                } catch (e) {
                    console.error('Zoom-In-Fehler:', e);
                }
            }
        });

        document.getElementById('zoom-out')?.addEventListener('click', function() {
            if (chart) {
                try {
                    chart.zoom(0.9);
                    document.getElementById('zoom-reset').disabled = false;
                } catch (e) {
                    console.error('Zoom-Out-Fehler:', e);
                }
            }
        });

        document.getElementById('zoom-reset')?.addEventListener('click', function() {
            if (chart) {
                try {
                    chart.resetZoom();
                    this.disabled = true;
                } catch (e) {
                    console.error('Zoom-Reset-Fehler:', e);
                }
            }
        });
        
        // Event-Listener für Datumsfilter
        document.getElementById('apply-filter')?.addEventListener('click', function() {
            const startDate = document.getElementById('start-date')?.valueAsDate;
            const endDate = document.getElementById('end-date')?.valueAsDate;
            
            if (startDate && endDate) {
                // Setze Endzeit auf Ende des Tages
                const endDateWithTime = new Date(endDate);
                endDateWithTime.setHours(23, 59, 59, 999);
                
                // Filtere Würfe nach Datumsbereich
                const filteredThrows = throws.filter(t => {
                    const throwDate = new Date(t.timestamp);
                    return throwDate >= startDate && throwDate <= endDateWithTime;
                });
                
                // Aktualisiere Chart mit gefilterten Daten
                if (filteredThrows.length === 0) {
                    alert('Keine Daten im ausgewählten Zeitraum gefunden.');
                } else {
                    createScoreHistoryChart(filteredThrows);
                }
            } else {
                alert('Bitte wähle sowohl ein Start- als auch ein Enddatum.');
            }
        });
        
        // Stelle sicher, dass keine Überlappung stattfindet
        fixLayoutOverlap();
    }

    // Load player statistics
    function loadPlayerStats(playerId) {
        if (!db) return;

        const playerStatsContainer = document.getElementById('player-stats');
        playerStatsContainer.innerHTML = '<div class="stat-card"><div class="stat-title">Wird geladen...</div></div>';

        const transaction = db.transaction(['throws'], 'readonly');
        const throwsStore = transaction.objectStore('throws');

        let throwsRequest;

        if (playerId === 'all') {
            throwsRequest = throwsStore.getAll();
        } else {
            const playerIndex = throwsStore.index('playerId');
            throwsRequest = playerIndex.getAll(parseInt(playerId));
        }

        throwsRequest.onsuccess = function (event) {
            const throws = event.target.result;
            if (throws.length === 0) {
                playerStatsContainer.innerHTML = '<div class="stat-card"><div class="stat-title">Keine Daten vorhanden</div></div>';
                return;
            }

            // Calculate statistics
            const totalThrows = throws.length;
            const totalPoints = throws.reduce((sum, t) => sum + t.score, 0);
            const avgScore = totalPoints / totalThrows;
            const highestScore = Math.max(...throws.map(t => t.score));

            // Group by player name only (ignoriere playerId)
            const playerStats = {};
            throws.forEach(t => {
                const playerName = t.playerName;

                if (!playerStats[playerName]) {
                    playerStats[playerName] = {
                        scores: [],
                        totalScore: 0,
                        throwCount: 0,
                        highest: 0
                    };
                }

                playerStats[playerName].scores.push(t.score);
                playerStats[playerName].totalScore += t.score;
                playerStats[playerName].throwCount++;
                playerStats[playerName].highest = Math.max(playerStats[playerName].highest, t.score);
            });

            // Render player stats
            playerStatsContainer.innerHTML = '';

            // Overall stats
            if (playerId === 'all') {
                const overallStatsCard = document.createElement('div');
                overallStatsCard.className = 'stat-card';
                overallStatsCard.innerHTML = `
                  <div class="stat-title">Gesamtstatistik</div>
                  <div class="stat-value">${avgScore.toFixed(1)}</div>
                  <div>Durchschnitt über ${totalThrows} Würfe</div>
                  <div>Höchste Aufnahme: ${highestScore}</div>
                `;
                playerStatsContainer.appendChild(overallStatsCard);
            }

            // Create stat cards for each player or selected player
            Object.keys(playerStats).forEach(playerName => {
                const stats = playerStats[playerName];
                const playerAvg = stats.totalScore / stats.throwCount;

                const statCard = document.createElement('div');
                statCard.className = 'stat-card';

                // Lösch-Icon nur anzeigen, wenn wir alle Spieler anzeigen
                let deleteIconHtml = '';
                if (playerId === 'all') {
                    // Hier keine playerId mehr verwenden - Namen direkt übergeben
                    deleteIconHtml = `
                      <svg class="delete-icon" data-player-name="${playerName}" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    `;
                }

                statCard.innerHTML = `
                  ${deleteIconHtml}
                  <div class="stat-title">${playerName}</div>
                  <div class="stat-value">${playerAvg.toFixed(1)}</div>
                  <div>Durchschnitt über ${stats.throwCount} Würfe</div>
                  <div>Höchste Aufnahme: ${stats.highest}</div>
                `;
                playerStatsContainer.appendChild(statCard);
            });

            // Add event listeners to delete icons
            const deleteIcons = document.querySelectorAll('.delete-icon');
            deleteIcons.forEach(icon => {
                icon.addEventListener('click', function () {
                    const playerName = this.getAttribute('data-player-name');
                    showDeletePlayerConfirmation(null, playerName);
                });
            });

            // Create score history chart
            createScoreHistoryChart(throws);
            
            // Fix layout overlap
            fixLayoutOverlap();
        };
    }

    // Fix für Layout-Überlappung
    function fixLayoutOverlap() {
        setTimeout(() => {
            const statsGrid = document.getElementById('player-stats');
            if (statsGrid) {
                statsGrid.style.marginTop = '70px';
            }
            
            const chartContainer = document.getElementById('score-history-chart');
            if (chartContainer) {
                chartContainer.style.minHeight = '400px';
                chartContainer.style.marginBottom = '60px';
            }
        }, 100);
    }

    // Load games table
    function loadGamesTable() {
        if (!db) return;

        const tableBody = document.querySelector('#games-table tbody');
        tableBody.innerHTML = '<tr><td colspan="7">Wird geladen...</td></tr>';

        const transaction = db.transaction(['games'], 'readonly');
        const gamesStore = transaction.objectStore('games');

        const gamesRequest = gamesStore.getAll();

        gamesRequest.onsuccess = function (event) {
            const games = event.target.result;

            if (games.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">Keine Spiele gefunden</td></tr>';
                return;
            }

            // Sort games by timestamp (newest first)
            games.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            tableBody.innerHTML = '';

            games.forEach(game => {
                const row = document.createElement('tr');

                // Find winner if possible
                let winner = 'Nicht abgeschlossen';
                game.players.forEach(player => {
                    if (player.setsWon >= Math.ceil(game.numSets / 2)) {
                        winner = player.name;
                    }
                });

                const gameDate = new Date(game.timestamp);

                row.innerHTML = `
                <td>${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                })}</td>
                <td>${game.gameType}</td>
                <td>${game.players.map(p => p.name).join(', ')}</td>
                <td>${winner}</td>
                <td>${game.numSets}</td>
                <td>${game.numLegs}</td>
                <td><button class="btn-danger delete-game" data-game-id="${game.id}">Löschen</button></td>
            `;

                tableBody.appendChild(row);
            });

            // Add event listeners to delete buttons
            const deleteButtons = document.querySelectorAll('.delete-game');
            deleteButtons.forEach(button => {
                button.addEventListener('click', function () {
                    const gameId = this.getAttribute('data-game-id');
                    showDeleteGameConfirmation(gameId);
                });
            });
        };
    }

    // Load players for management modal
    function loadPlayersForManagement() {
        if (!db) return;

        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '<div>Wird geladen...</div>';

        const transaction = db.transaction(['players', 'throws'], 'readonly');
        const playersStore = transaction.objectStore('players');
        const throwsStore = transaction.objectStore('throws');

        const playersRequest = playersStore.getAll();

        playersRequest.onsuccess = function (event) {
            const players = event.target.result;

            if (players.length === 0) {
                playerList.innerHTML = '<div>Keine Spieler gefunden</div>';
                return;
            }

            // Get throw counts for each player
            const playerThrowCounts = {};

            // We'll use promises to handle asynchronous operations
            const promises = players.map(player => {
                return new Promise(resolve => {
                    const playerIndex = throwsStore.index('playerId');
                    const throwsRequest = playerIndex.count(player.id);

                    throwsRequest.onsuccess = function (event) {
                        playerThrowCounts[player.id] = event.target.result;
                        resolve();
                    };

                    throwsRequest.onerror = function (event) {
                        console.error('Error getting throw count:', event.target.error);
                        playerThrowCounts[player.id] = 0;
                        resolve();
                    };
                });
            });

            Promise.all(promises).then(() => {
                playerList.innerHTML = '';

                // Sort players by name
                players.sort((a, b) => a.name.localeCompare(b.name));

                players.forEach(player => {
                    const playerItem = document.createElement('div');
                    playerItem.className = 'player-item';

                    playerItem.innerHTML = `
                    <div>
                        <strong>${player.name}</strong>
                        <div>${playerThrowCounts[player.id] || 0} Würfe</div>
                    </div>
                    <button class="btn-danger delete-player-btn" data-player-id="${player.id}" data-player-name="${player.name}">Löschen</button>
                `;

                    playerList.appendChild(playerItem);
                });

                // Add event listeners to delete buttons
                const deleteButtons = document.querySelectorAll('.delete-player-btn');
                deleteButtons.forEach(button => {
                    button.addEventListener('click', function () {
                        const playerId = this.getAttribute('data-player-id');
                        const playerName = this.getAttribute('data-player-name');
                        showDeletePlayerConfirmation(playerId, playerName);
                    });
                });
            });
        };
    }

    // Delete player data
    function deletePlayerData(playerName) {
        if (!db) return;

        const transaction = db.transaction(['throws', 'players'], 'readwrite');
        const throwsStore = transaction.objectStore('throws');
        const playersStore = transaction.objectStore('players');

        // Alle Würfe mit diesem Spielernamen löschen
        const throwsRequest = throwsStore.openCursor();

        throwsRequest.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.playerName === playerName) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };

        // Alle Spieler mit diesem Namen löschen
        const nameIndex = playersStore.index('name');
        const nameCursorRequest = nameIndex.openCursor(IDBKeyRange.only(playerName));

        nameCursorRequest.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };

        transaction.oncomplete = function () {
            loadStatistics();
            loadPlayersForManagement();
        };

        transaction.onerror = function (event) {
            console.error('Error deleting player data:', event.target.error);
            alert('Fehler beim Löschen der Spielerdaten');
        };
    }

    // Delete game data
    function deleteGameData(gameId) {
        if (!db) return;

        const transaction = db.transaction(['throws', 'games'], 'readwrite');
        const throwsStore = transaction.objectStore('throws');
        const gamesStore = transaction.objectStore('games');

        // First, delete all throws from this game
        const gameIndex = throwsStore.index('gameId');
        const throwsRequest = gameIndex.openCursor(IDBKeyRange.only(parseInt(gameId)));

        throwsRequest.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };

        // Then delete the game
        const deleteGameRequest = gamesStore.delete(parseInt(gameId));

        transaction.oncomplete = function () {
            // alert('Spieldaten erfolgreich gelöscht');
            loadStatistics();
            loadGamesTable();
        };

        transaction.onerror = function (event) {
            console.error('Error deleting game data:', event.target.error);
            alert('Fehler beim Löschen der Spieldaten');
        };
    }

    // Delete all statistics
    function deleteAllStatistics() {
        if (!db) return;

        const transaction = db.transaction(['throws', 'games', 'players'], 'readwrite');
        const throwsStore = transaction.objectStore('throws');
        const gamesStore = transaction.objectStore('games');
        const playersStore = transaction.objectStore('players');

        // Clear all object stores
        throwsStore.clear();
        gamesStore.clear();
        playersStore.clear();

        transaction.oncomplete = function () {
            // alert('Alle Statistiken erfolgreich gelöscht');
            loadStatistics();
        };

        transaction.onerror = function (event) {
            console.error('Error deleting all statistics:', event.target.error);
            alert('Fehler beim Löschen aller Statistiken');
        };
    }

    // Show confirmation modal for deleting a player
    function showDeletePlayerConfirmation(playerId, playerName) {
        confirmationMessage.textContent = `Möchtest du die Statistiken für ${playerName} wirklich löschen?`;

        pendingAction = () => deletePlayerData(playerName);

        confirmationModal.style.display = 'block';
    }

    // Show confirmation modal for deleting a game
    function showDeleteGameConfirmation(gameId) {
        confirmationMessage.textContent = `Möchtest du dieses Spiel wirklich löschen?`;

        pendingAction = () => deleteGameData(gameId);

        confirmationModal.style.display = 'block';
    }

    // Show confirmation modal for deleting all statistics
    function showDeleteAllConfirmation() {
        confirmationMessage.textContent = `Möchtest du wirklich ALLE Statistiken löschen? Diese Aktion kann nicht rückgängig gemacht werden!`;

        pendingAction = deleteAllStatistics;

        confirmationModal.style.display = 'block';
    }

    // Event Listeners for modals
    document.getElementById('manage-players').addEventListener('click', function () {
        loadPlayersForManagement();
        playerManagementModal.style.display = 'block';
    });

    document.getElementById('close-player-modal').addEventListener('click', function () {
        playerManagementModal.style.display = 'none';
    });

    document.getElementById('clear-all-stats').addEventListener('click', function () {
        showDeleteAllConfirmation();
    });

    // Confirmation modal buttons
    confirmActionBtn.addEventListener('click', function () {
        if (pendingAction) {
            pendingAction();
            pendingAction = null;
        }
        confirmationModal.style.display = 'none';
    });

    cancelActionBtn.addEventListener('click', function () {
        pendingAction = null;
        confirmationModal.style.display = 'none';
    });

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === playerManagementModal) {
            playerManagementModal.style.display = 'none';
        }
        if (event.target === confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    });

    // Back to game button
    document.getElementById('back-to-game').addEventListener('click', function () {
        window.location.href = 'index.html';
    });

    // Beim Ändern der Fenstergröße das Layout anpassen
    window.addEventListener('resize', fixLayoutOverlap);

    // Initialize
    initDatabase();
});