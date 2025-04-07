import React, {useEffect, useRef, useState} from 'react';
import StatsService from '../services/StatsService';
import StatsChart from './StatsChart';
import './StatsScreen.css';

const StatsScreen = ({playerName, onBack}) => {
    const [stats, setStats] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(playerName);
    const [importError, setImportError] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Lade die Statistiken des aktuellen Spielers
        if (selectedPlayer) {
            const playerStats = StatsService.getPlayerStats(selectedPlayer);
            setStats(playerStats);
        }

// Lade alle verfügbaren Spieler
        const players = StatsService.getAllPlayers();
        setAllPlayers(players);
    }, [selectedPlayer]);

    const handlePlayerChange = (e) => {
        setSelectedPlayer(e.target.value);
    };

    const handleExportStats = () => {
        StatsService.exportStats(selectedPlayer);
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setImportError('');
            await StatsService.importStats(file, selectedPlayer);
            // Aktualisiere die Statistiken nach dem Import
            const updatedStats = StatsService.getPlayerStats(selectedPlayer);
            setStats(updatedStats);
        } catch (error) {
            setImportError(error.message);
        }

        // Setze das Datei-Input-Feld zurück, damit der gleiche Import erneut funktioniert
        e.target.value = null;
    };

    // Rendere die Spielzeit in einem lesbaren Format
    const formatPlayTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return [
            hours > 0 ? `${hours}h` : null,
            minutes > 0 ? `${minutes}m` : null,
            `${secs}s`
        ].filter(Boolean).join(' ');
    };

    // Formatiere das Datum für die Anzeige
    const formatDate = (isoDate) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Generiere Daten für das Balkendiagramm (Gewonnen/Verloren)
    const getWinLossData = () => {
        if (!stats) return null;

        return {
            labels: ['Gewonnen', 'Verloren'],
            datasets: [{
                label: 'Spielergebnis',
                data: [stats.gamesWon, stats.gamesLost],
                backgroundColor: ['#4CAF50', '#f44336']
            }]
        };
    };

    // Generiere Daten für das Liniendiagramm (Ballwechsel pro Spiel)
    const getBallExchangesData = () => {
        if (!stats || stats.history.length === 0) return null;

        // Nehme bis zu 10 der letzten Spiele
        const recentGames = [...stats.history].reverse().slice(0, 10);

        return {
            labels: recentGames.map((_, index) => `Spiel ${index + 1}`),
            datasets: [{
                label: 'Ballwechsel',
                data: recentGames.map(game => game.ballExchanges),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        };
    };

    // Generiere Daten für das Kreisdiagramm (Spielzeit nach Spielmodus)
    const getPlayTimeByModeData = () => {
        if (!stats || stats.history.length === 0) return null;

        // Gruppiere Spielzeit nach Spielmodus
        const timeByMode = stats.history.reduce((acc, game) => {
            const mode = game.gameMode || 'unbekannt';
            acc[mode] = (acc[mode] || 0) + game.duration;
            return acc;
        }, {});

        const labels = Object.keys(timeByMode);
        const modeLabels = {
            'singleplayer': 'Einzelspieler',
            'local-multiplayer': 'Lokaler Multiplayer',
            'online-multiplayer': 'Online Multiplayer',
            'unbekannt': 'Unbekannt'
        };

        return {
            labels: labels.map(mode => modeLabels[mode] || mode),
            datasets: [{
                data: Object.values(timeByMode),
                backgroundColor: [
                    '#4CAF50',
                    '#2196F3',
                    '#9C27B0',
                    '#757575'
                ]
            }]
        };
    };

    // Generiere Daten für die Gewinnrate über Zeit
    const getWinRateOverTimeData = () => {
        if (!stats || stats.history.length < 3) return null;

        // Maximal die letzten 20 Spiele nehmen
        const games = [...stats.history].slice(-20);

        // Berechne die Gewinnrate als gleitenden Durchschnitt
        const winRates = [];
        let wins = 0;
        let total = 0;

        games.forEach(game => {
            total++;
            if (game.result === 'won') wins++;
            winRates.push((wins / total) * 100);
        });

        return {
            labels: games.map((_, i) => `Spiel ${i + 1}`),
            datasets: [{
                label: 'Gewinnrate (%)',
                data: winRates,
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        };
    };

    const gameModeLabel = (mode) => {
        const modes = {
            'singleplayer': 'Einzelspieler',
            'local-multiplayer': 'Lokaler Multiplayer',
            'online-multiplayer': 'Online Multiplayer'
        };
        return modes[mode] || mode;
    };

    const difficultyLabel = (diff) => {
        const difficulties = {
            2: 'Einfach',
            3: 'Mittel',
            5: 'Schwer'
        };
        return difficulties[diff] || diff;
    };

    return (
        <div className="stats-screen">
            <h2>Spielstatistiken</h2>

            <div className="player-selection">
                <label htmlFor="player-select">Spieler:</label>
                <select
                    id="player-select"
                    value={selectedPlayer}
                    onChange={handlePlayerChange}
                    className="player-select"
                >
                    {allPlayers.map((player, index) => (
                        <option key={index} value={player}>{player}</option>
                    ))}
                </select>

                <div className="stats-actions">
                    <button className="button export-btn" onClick={handleExportStats}>
                        Exportieren
                    </button>
                    <button className="button import-btn" onClick={handleImportClick}>
                        Importieren
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        style={{display: 'none'}}
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {importError && <div className="import-error">{importError}</div>}

            {stats ? (
                <div className="stats-content">
                    <div className="stats-overview">
                        <div className="stat-card">
                            <h3>Spiele gespielt</h3>
                            <div className="stat-value">{stats.gamesPlayed}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Gewonnen</h3>
                            <div className="stat-value win">{stats.gamesWon}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Verloren</h3>
                            <div className="stat-value loss">{stats.gamesLost}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Gewinnrate</h3>
                            <div className="stat-value">
                                {stats.gamesPlayed > 0
                                    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                                    : 0}%
                            </div>
                        </div>
                    </div>

                    <div className="stats-details">
                        <div className="stat-detail-card">
                            <h3>Gesamte Spielzeit</h3>
                            <div
                                className="stat-detail-value">{formatPlayTime(stats.totalPlayTime)}</div>
                        </div>
                        <div className="stat-detail-card">
                            <h3>Ballwechsel insgesamt</h3>
                            <div className="stat-detail-value">{stats.totalBallExchanges}</div>
                        </div>
                        <div className="stat-detail-card">
                            <h3>Ø Ballwechsel pro Spiel</h3>
                            <div className="stat-detail-value">
                                {stats.gamesPlayed > 0
                                    ? Math.round(stats.totalBallExchanges / stats.gamesPlayed)
                                    : 0}
                            </div>
                        </div>
                        <div className="stat-detail-card">
                            <h3>Zuletzt gespielt</h3>
                            <div className="stat-detail-value">{formatDate(stats.lastPlayed)}</div>
                        </div>
                    </div>

                    <div className="charts-container">
                        <div className="chart-card win-loss-chart">
                            <h3>Gewonnen/Verloren</h3>
                            <div className="chart-container">
                                {getWinLossData() ? (
                                    <StatsChart type="bar" data={getWinLossData()}/>
                                ) : (
                                    <div className="no-data">Keine Daten verfügbar</div>
                                )}
                            </div>
                        </div>

                        <div className="chart-card ball-exchanges-chart">
                            <h3>Ballwechsel der letzten Spiele</h3>
                            <div className="chart-container">
                                {getBallExchangesData() ? (
                                    <StatsChart type="line" data={getBallExchangesData()}/>
                                ) : (
                                    <div className="no-data">Keine Daten verfügbar</div>
                                )}
                            </div>
                        </div>

                        <div className="chart-card playtime-chart">
                            <h3>Spielzeit nach Modus</h3>
                            <div className="chart-container">
                                {getPlayTimeByModeData() ? (
                                    <StatsChart type="doughnut" data={getPlayTimeByModeData()}/>
                                ) : (
                                    <div className="no-data">Keine Daten verfügbar</div>
                                )}
                            </div>
                        </div>

                        <div className="chart-card winrate-chart">
                            <h3>Gewinnrate-Entwicklung</h3>
                            <div className="chart-container">
                                {getWinRateOverTimeData() ? (
                                    <StatsChart type="line" data={getWinRateOverTimeData()}/>
                                ) : (
                                    <div className="no-data">Mindestens 3 Spiele benötigt</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="game-history">
                        <h3>Spielhistorie</h3>
                        {stats.history.length > 0 ? (
                            <div className="history-table-container">
                                <table className="history-table">
                                    <thead>
                                    <tr>
                                        <th>Datum</th>
                                        <th>Modus</th>
                                        <th>Ergebnis</th>
                                        <th>Dauer</th>
                                        <th>Ballwechsel</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {[...stats.history].reverse().map((game, index) => (
                                        <tr key={index}
                                            className={game.result === 'won' ? 'won' : 'lost'}>
                                            <td>{formatDate(game.date)}</td>
                                            <td>
                                                {gameModeLabel(game.gameMode)}
                                                {game.gameMode === 'singleplayer' && game.difficulty && (
                                                    <span className="difficulty">
                                                            {" (" + difficultyLabel(game.difficulty) + ")"}
                                                        </span>
                                                )}
                                            </td>
                                            <td>{game.result === 'won' ? 'Gewonnen' : 'Verloren'}</td>
                                            <td>{formatPlayTime(game.duration)}</td>
                                            <td>{game.ballExchanges}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="no-history">Noch keine Spiele gespielt</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="no-stats">
                    <p>Keine Statistiken für {selectedPlayer} gefunden.</p>
                    <p>Spiele ein paar Runden, um Statistiken zu erfassen!</p>
                </div>
            )}

            <button className="button back-btn" onClick={onBack}>Zurück zum Hauptmenü</button>
        </div>
    );
};

export default StatsScreen;