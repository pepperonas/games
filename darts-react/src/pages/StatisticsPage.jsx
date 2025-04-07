import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import ThemeToggle from '../components/ThemeToggle';
import { useDatabase } from '../context/DatabaseContext';
import { useTheme } from '../context/ThemeContext';

// Register Chart.js components
Chart.register(...registerables);

const StatisticsPage = () => {
    const { getAllPlayers, getAllThrows, getAllGames, deletePlayer, deleteGame, clearAllData } = useDatabase();
    const { darkMode } = useTheme();
    const navigate = useNavigate();

    const [players, setPlayers] = useState([]);
    const [throws, setThrows] = useState([]);
    const [games, setGames] = useState([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState('all');
    const [filteredThrows, setFilteredThrows] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [pendingAction, setPendingAction] = useState(null);

    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, []);

    // Update filtered throws when player selection or throws change
    useEffect(() => {
        filterThrows();
    }, [selectedPlayerId, throws]);

    // Create or update chart when filtered throws change
    useEffect(() => {
        if (filteredThrows.length > 0) {
            createScoreHistoryChart();
        }
    }, [filteredThrows, darkMode]);

    const loadData = async () => {
        const playersData = await getAllPlayers();
        const throwsData = await getAllThrows();
        const gamesData = await getAllGames();

        setPlayers(playersData);
        setThrows(throwsData);
        setGames(gamesData);

        // Set initial date range
        if (throwsData.length > 0) {
            const sortedThrows = [...throwsData].sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            const firstDate = new Date(sortedThrows[0].timestamp);
            const lastDate = new Date(sortedThrows[sortedThrows.length - 1].timestamp);

            setStartDate(firstDate);
            setEndDate(lastDate);
        }
    };

    const filterThrows = () => {
        let filtered = [...throws];

        // Filter by player
        if (selectedPlayerId !== 'all') {
            filtered = filtered.filter(t => t.playerId === parseInt(selectedPlayerId));
        }

        // Filter by date range
        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999); // End of day

            filtered = filtered.filter(t => {
                const throwDate = new Date(t.timestamp);
                return throwDate >= startDateTime && throwDate <= endDateTime;
            });
        }

        setFilteredThrows(filtered);
    };

    const createScoreHistoryChart = () => {
        if (!chartRef.current) return;

        // Destroy previous chart if it exists
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        // Sort throws chronologically
        const sortedThrows = [...filteredThrows].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Group throws by game and player
        const playerGames = {};

        sortedThrows.forEach(t => {
            const key = `${t.playerName}-${t.gameId}`;
            if (!playerGames[key]) {
                playerGames[key] = [];
            }

            playerGames[key].push({
                x: new Date(t.timestamp),
                y: t.score,
                timeLabel: new Date(t.timestamp).toLocaleDateString() + ' ' +
                    new Date(t.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
            });
        });

        // Sort throws within each game
        Object.values(playerGames).forEach(game => {
            game.sort((a, b) => a.x - b.x);
        });

        // Create datasets for each player's games
        const datasets = [];
        const colors = ['#2980b9', '#e74c3c', '#27ae60', '#f39c12', '#8e44ad', '#16a085'];

        // Get all unique player names
        const playerNames = [...new Set(sortedThrows.map(t => t.playerName))];

        playerNames.forEach((playerName, playerIndex) => {
            // Get all games for this player
            const playerKeys = Object.keys(playerGames).filter(key =>
                key.startsWith(`${playerName}-`)
            );

            // Create a dataset for each game
            playerKeys.forEach((key, gameIndex) => {
                const gameData = playerGames[key];
                const gameId = key.split('-')[1];

                datasets.push({
                    label: `${playerName} (Spiel ${gameIndex + 1})`,
                    data: gameData.map(point => ({
                        x: point.timeLabel,
                        y: point.y
                    })),
                    borderColor: colors[playerIndex % colors.length],
                    backgroundColor: colors[playerIndex % colors.length] + '33',
                    tension: 0.1,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true
                });
            });
        });

        // Create the chart
        const allTimeLabels = sortedThrows.map(t => {
            const date = new Date(t.timestamp);
            return date.toLocaleDateString() + ' ' +
                date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        });

        const uniqueLabels = [...new Set(allTimeLabels)].sort();

        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: uniqueLabels,
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
                            text: 'Punktzahl',
                            color: darkMode ? '#f5f5f5' : '#333'
                        },
                        ticks: {
                            color: darkMode ? '#f5f5f5' : '#333'
                        },
                        grid: {
                            color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Zeitpunkt',
                            color: darkMode ? '#f5f5f5' : '#333'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            color: darkMode ? '#f5f5f5' : '#333',
                            callback: function(value, index, values) {
                                // Show only date for first entry of the day
                                const label = uniqueLabels[index];
                                if (!label) return '';

                                const datePart = label.split(' ')[0];
                                if (index === 0 || !uniqueLabels[index - 1]?.startsWith(datePart)) {
                                    return label;
                                }
                                return label.split(' ')[1] || '';
                            }
                        },
                        grid: {
                            color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                const playerName = context.dataset.label.split(' (Spiel')[0];
                                return `${playerName}: ${context.parsed.y} Punkte`;
                            }
                        }
                    },
                    legend: {
                        labels: {
                            color: darkMode ? '#f5f5f5' : '#333'
                        }
                    }
                }
            }
        });
    };

    const handlePlayerChange = (e) => {
        setSelectedPlayerId(e.target.value);
    };

    const applyDateFilter = () => {
        filterThrows();
    };

    const handleZoomIn = () => {
        if (chartInstance.current) {
            const chart = chartInstance.current;
            const scales = chart.scales;
            const newOptions = {...chart.options};

            // Zoom in by reducing the visible data range by 20%
            const yRange = scales.y.max - scales.y.min;
            const newYMin = scales.y.min + yRange * 0.1;
            const newYMax = scales.y.max - yRange * 0.1;

            newOptions.scales.y.min = newYMin;
            newOptions.scales.y.max = newYMax;

            chart.options = newOptions;
            chart.update();
        }
    };

    const handleZoomOut = () => {
        if (chartInstance.current) {
            const chart = chartInstance.current;
            const scales = chart.scales;
            const newOptions = {...chart.options};

            // Zoom out by increasing the visible data range by 20%
            const yRange = scales.y.max - scales.y.min;
            const newYMin = Math.max(0, scales.y.min - yRange * 0.1);
            const newYMax = Math.min(180, scales.y.max + yRange * 0.1);

            newOptions.scales.y.min = newYMin;
            newOptions.scales.y.max = newYMax;

            chart.options = newOptions;
            chart.update();
        }
    };

    const handleZoomReset = () => {
        if (chartInstance.current) {
            const chart = chartInstance.current;
            const newOptions = {...chart.options};

            // Reset zoom
            delete newOptions.scales.y.min;
            delete newOptions.scales.y.max;

            chart.options = newOptions;
            chart.update();
        }
    };

    const handleManagePlayers = () => {
        setShowPlayerModal(true);
    };

    const handleClosePlayerModal = () => {
        setShowPlayerModal(false);
    };

    const showDeletePlayerConfirmation = (playerId, playerName) => {
        setConfirmationMessage(`Möchtest du die Statistiken für ${playerName} wirklich löschen?`);
        setPendingAction(() => () => handleDeletePlayer(playerId, playerName));
        setShowConfirmationModal(true);
    };

    const showDeleteGameConfirmation = (gameId) => {
        setConfirmationMessage(`Möchtest du dieses Spiel wirklich löschen?`);
        setPendingAction(() => () => handleDeleteGame(gameId));
        setShowConfirmationModal(true);
    };

    const showDeleteAllConfirmation = () => {
        setConfirmationMessage(`Möchtest du wirklich ALLE Statistiken löschen? Diese Aktion kann nicht rückgängig gemacht werden!`);
        setPendingAction(() => handleDeleteAllStats);
        setShowConfirmationModal(true);
    };

    const handleConfirmAction = () => {
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
        setShowConfirmationModal(false);
    };

    const handleCancelAction = () => {
        setPendingAction(null);
        setShowConfirmationModal(false);
    };

    const handleDeletePlayer = async (playerId, playerName) => {
        const success = await deletePlayer(playerId, playerName);
        if (success) {
            await loadData();
            setShowPlayerModal(false);
        } else {
            alert('Fehler beim Löschen des Spielers');
        }
    };

    const handleDeleteGame = async (gameId) => {
        const success = await deleteGame(gameId);
        if (success) {
            await loadData();
        } else {
            alert('Fehler beim Löschen des Spiels');
        }
    };

    const handleDeleteAllStats = async () => {
        const success = await clearAllData();
        if (success) {
            await loadData();
        } else {
            alert('Fehler beim Löschen aller Statistiken');
        }
    };

    const handleBackToGame = () => {
        navigate('/');
    };

    // Calculate player statistics
    const calculatePlayerStats = () => {
        if (players.length === 0 || throws.length === 0) return [];

        const playerStats = {};

        // Initialize stats for each player
        players.forEach(player => {
            playerStats[player.id] = {
                id: player.id,
                name: player.name,
                scores: [],
                totalScore: 0,
                throwCount: 0,
                highest: 0
            };
        });

        // Aggregate throw data
        throws.forEach(t => {
            // Handle throws that might not have a valid playerId
            if (!playerStats[t.playerId]) return;

            playerStats[t.playerId].scores.push(t.score);
            playerStats[t.playerId].totalScore += t.score;
            playerStats[t.playerId].throwCount++;
            playerStats[t.playerId].highest = Math.max(playerStats[t.playerId].highest, t.score);
        });

        // Convert to array and calculate averages
        return Object.values(playerStats)
            .filter(stats => stats.throwCount > 0)
            .map(stats => ({
                ...stats,
                average: stats.totalScore / stats.throwCount
            }));
    };

    const playerStatsData = calculatePlayerStats();

    return (
        <>
            <ThemeToggle />

            <div className="container">
                <header>
                    <h1>📈 Statistiken</h1>
                </header>

                <button className="back-btn" id="back-to-game" onClick={handleBackToGame}>
                    Zurück zum Spiel
                </button>

                <div className="stats-container">
                    <h2>Spielerstatistiken</h2>

                    <div id="player-filter">
                        <label htmlFor="player-select">Spieler auswählen:</label>
                        <select
                            id="player-select"
                            value={selectedPlayerId}
                            onChange={handlePlayerChange}
                        >
                            <option value="all">Alle Spieler</option>
                            {players.map(player => (
                                <option key={player.id} value={player.id}>
                                    {player.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="chart-container" id="score-history-chart">
                        <div className="chart-zoom-controls">
                            <div className="date-filter">
                                <label htmlFor="start-date">Von:</label>
                                <input
                                    type="date"
                                    id="start-date"
                                    value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setStartDate(new Date(e.target.value))}
                                />

                                <label htmlFor="end-date">Bis:</label>
                                <input
                                    type="date"
                                    id="end-date"
                                    value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEndDate(new Date(e.target.value))}
                                />

                                <button id="apply-filter" className="filter-btn" onClick={applyDateFilter}>
                                    Filter anwenden
                                </button>

                                <div id="zoom-buttons" className="zoom-buttons">
                                    <button id="zoom-in" className="zoom-btn" title="Hineinzoomen" onClick={handleZoomIn}>
                                        <svg viewBox="0 0 24 24" width="20" height="20">
                                            <path
                                                fill="currentColor"
                                                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z"
                                            />
                                        </svg>
                                    </button>

                                    <button id="zoom-out" className="zoom-btn" title="Herauszoomen" onClick={handleZoomOut}>
                                        <svg viewBox="0 0 24 24" width="20" height="20">
                                            <path
                                                fill="currentColor"
                                                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"
                                            />
                                        </svg>
                                    </button>

                                    <button id="zoom-reset" className="zoom-btn" title="Zoom zurücksetzen" onClick={handleZoomReset}>
                                        <svg viewBox="0 0 24 24" width="20" height="20">
                                            <path
                                                fill="currentColor"
                                                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {filteredThrows.length > 0 ? (
                            <canvas id="scoreChart" ref={chartRef}></canvas>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                Keine Daten vorhanden
                            </div>
                        )}
                    </div>

                    <div className="section-divider"></div>

                    <div className="stats-grid" id="player-stats">
                        {selectedPlayerId === 'all' && playerStatsData.length > 0 && (
                            <div className="stat-card">
                                <div className="stat-title">Gesamtstatistik</div>
                                <div className="stat-value">
                                    {(playerStatsData.reduce((sum, p) => sum + p.totalScore, 0) /
                                        playerStatsData.reduce((sum, p) => sum + p.throwCount, 0)).toFixed(1)}
                                </div>
                                <div className="stat-detail">
                                    Durchschnitt über {playerStatsData.reduce((sum, p) => sum + p.throwCount, 0)} Würfe
                                </div>
                                <div className="stat-detail">
                                    Höchste Aufnahme: {Math.max(...playerStatsData.map(p => p.highest))}
                                </div>
                            </div>
                        )}

                        {playerStatsData
                            .filter(stats => selectedPlayerId === 'all' || stats.id === parseInt(selectedPlayerId))
                            .map(stats => (
                                <div className="stat-card" key={stats.id}>
                                    {selectedPlayerId === 'all' && (
                                        <svg
                                            className="delete-icon"
                                            viewBox="0 0 24 24"
                                            onClick={() => showDeletePlayerConfirmation(stats.id, stats.name)}
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                            />
                                        </svg>
                                    )}

                                    <div className="stat-title">{stats.name}</div>
                                    <div className="stat-value">{stats.average.toFixed(1)}</div>
                                    <div className="stat-detail">
                                        Durchschnitt über {stats.throwCount} Würfe
                                    </div>
                                    <div className="stat-detail">
                                        Höchste Aufnahme: {stats.highest}
                                    </div>
                                </div>
                            ))}

                        {playerStatsData.length === 0 && (
                            <div className="stat-card">
                                <div className="stat-title">Keine Daten vorhanden</div>
                                <div className="stat-detail">
                                    Starte ein Spiel und wirf ein paar Darts, um Statistiken zu sehen.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="actions-row">
                        <button id="manage-players" className="accent" onClick={handleManagePlayers}>
                            Spieler verwalten
                        </button>
                        <button id="clear-all-stats" className="btn-danger" onClick={showDeleteAllConfirmation}>
                            Alle Statistiken löschen
                        </button>
                    </div>
                </div>

                <div className="stats-container">
                    <h2>Spielübersicht</h2>
                    <table id="games-table">
                        <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Spieltyp</th>
                            <th>Spieler</th>
                            <th>Gewinner</th>
                            <th>Sets</th>
                            <th>Legs</th>
                            <th>Aktionen</th>
                        </tr>
                        </thead>
                        <tbody>
                        {games.length > 0 ? (
                            games
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .map(game => {
                                    // Find winner if possible
                                    let winner = 'Nicht abgeschlossen';
                                    if (game.players) {
                                        game.players.forEach(player => {
                                            if (player.setsWon >= Math.ceil(game.numSets / 2)) {
                                                winner = player.name;
                                            }
                                        });
                                    }

                                    const gameDate = new Date(game.timestamp);

                                    return (
                                        <tr key={game.id}>
                                            <td>
                                                {gameDate.toLocaleDateString()} {gameDate.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                            </td>
                                            <td>{game.gameType}</td>
                                            <td>{game.players ? game.players.map(p => p.name).join(', ') : 'Unbekannt'}</td>
                                            <td>{winner}</td>
                                            <td>{game.numSets}</td>
                                            <td>{game.numLegs}</td>
                                            <td>
                                                <button
                                                    className="btn-danger delete-game"
                                                    onClick={() => showDeleteGameConfirmation(game.id)}
                                                >
                                                    Löschen
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                        ) : (
                            <tr>
                                <td colSpan="7">Keine Spiele gefunden</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Player Management Modal */}
            {showPlayerModal && (
                <div id="player-management-modal" className="modal">
                    <div className="modal-content">
                        <div className="modal-title">Spieler verwalten</div>
                        <p>Hier kannst du die Statistiken für einzelne Spieler löschen.</p>

                        <div className="player-list" id="player-list">
                            {players.length > 0 ? (
                                players
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(player => {
                                        const playerThrows = throws.filter(t => t.playerId === player.id);

                                        return (
                                            <div className="player-item" key={player.id}>
                                                <div>
                                                    <strong>{player.name}</strong>
                                                    <div>{playerThrows.length} Würfe</div>
                                                </div>
                                                <button
                                                    className="btn-danger delete-player-btn"
                                                    onClick={() => showDeletePlayerConfirmation(player.id, player.name)}
                                                >
                                                    Löschen
                                                </button>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div>Keine Spieler gefunden</div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button id="close-player-modal" onClick={handleClosePlayerModal}>
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmationModal && (
                <div id="confirmation-modal" className="modal">
                    <div className="modal-content">
                        <div className="modal-title">Bestätigung</div>
                        <p id="confirmation-message">{confirmationMessage}</p>

                        <div className="modal-actions">
                            <button id="confirm-action" className="btn-danger" onClick={handleConfirmAction}>
                                Löschen
                            </button>
                            <button id="cancel-action" onClick={handleCancelAction}>
                                Abbrechen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StatisticsPage;