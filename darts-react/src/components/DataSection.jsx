import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useGame } from '../context/GameContext';
import ImportModal from './ImportModal.jsx';

const DataSection = () => {
    const {
        exportGameData,
        exportAllPlayers,
        exportAllGames,
        clearAllData
    } = useDatabase();

    const { gameState } = useGame();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [showImportModal, setShowImportModal] = useState(false);

    const handleViewStats = () => {
        navigate('/statistics');
    };

    const handleExportCurrentGame = async () => {
        if (!gameState.gameId) {
            alert('Kein aktives Spiel zum Exportieren.');
            return;
        }

        const exportData = await exportGameData(gameState.gameId);
        if (exportData) {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileName = 'dart-game-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileName);
            linkElement.click();
        } else {
            alert('Fehler beim Exportieren des Spiels.');
        }
    };

    const handleExportAllPlayers = async () => {
        const exportData = await exportAllPlayers();
        if (exportData) {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileName = 'dart-players-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileName);
            linkElement.click();
        } else {
            alert('Fehler beim Exportieren der Spielerdaten.');
        }
    };

    const handleExportAllGames = async () => {
        const exportData = await exportAllGames();
        if (exportData) {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileName = 'dart-games-all-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileName);
            linkElement.click();
        } else {
            alert('Fehler beim Exportieren aller Spieldaten.');
        }
    };

    const handleImportData = () => {
        setShowImportModal(true);
    };

    const handleResetData = () => {
        if (window.confirm('Möchtest du wirklich ALLE Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
            clearAllData().then(success => {
                if (success) {
                    alert('Alle Daten wurden erfolgreich gelöscht!');
                    // Refresh the page to reset the app state
                    window.location.reload();
                } else {
                    alert('Fehler beim Löschen der Daten.');
                }
            });
        }
    };

    return (
        <div className="data-section" id="data-section">
            <h3>Datenbank</h3>
            <div className="data-controls">
                <button id="view-stats" onClick={handleViewStats}>
                    Statistiken anzeigen
                </button>
                <button id="export-data" onClick={handleExportCurrentGame}>
                    Aktuelles Spiel exportieren
                </button>
                <button id="export-players" onClick={handleExportAllPlayers}>
                    Alle Spielerdaten exportieren
                </button>
                <button id="export-all-games" onClick={handleExportAllGames}>
                    Alle Spiele exportieren
                </button>
                <button id="import-data" onClick={handleImportData}>
                    Daten importieren
                </button>
                <button id="reset-data" className="btn-danger" onClick={handleResetData}>
                    Alle Daten zurücksetzen
                </button>
            </div>

            <input
                type="file"
                id="file-input"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
            />

            {showImportModal && (
                <ImportModal onClose={() => setShowImportModal(false)} />
            )}
        </div>
    );
};

export default DataSection;