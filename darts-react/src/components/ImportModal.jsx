import React, { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';

const ImportModal = ({ onClose }) => {
    const { importGameData } = useDatabase();
    const [clearBeforeImport, setClearBeforeImport] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [statusColor, setStatusColor] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleDropAreaClick = () => {
        fileInputRef.current.click();
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        handleFile(file);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('highlight');
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('highlight');
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('highlight');

        const file = event.dataTransfer.files[0];
        handleFile(file);
    };

    const handleFile = (file) => {
        if (!file || file.type !== 'application/json') {
            setImportStatus('Fehler: Bitte wähle eine JSON-Datei aus.');
            setStatusColor('#e74c3c');
            return;
        }

        setIsLoading(true);
        setImportStatus('Datei wird verarbeitet...');
        setStatusColor('');

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const jsonData = event.target.result;
                const result = await importGameData(jsonData, clearBeforeImport);

                if (result.success) {
                    setImportStatus(result.message);
                    setStatusColor('#27ae60');

                    // Close modal after successful import with delay
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                } else {
                    setImportStatus(result.message);
                    setStatusColor('#e74c3c');
                }
            } catch (error) {
                console.error('Fehler beim Lesen der Datei:', error);
                setImportStatus('Die Datei konnte nicht gelesen werden.');
                setStatusColor('#e74c3c');
            } finally {
                setIsLoading(false);
            }
        };

        reader.onerror = () => {
            setImportStatus('Fehler beim Lesen der Datei.');
            setStatusColor('#e74c3c');
            setIsLoading(false);
        };

        reader.readAsText(file);
    };

    const handleOutsideClick = (event) => {
        if (event.target.className === 'modal') {
            onClose();
        }
    };

    return (
        <div className="modal" id="import-modal" onClick={handleOutsideClick}>
            <div className="modal-content">
                <div className="modal-title">Daten importieren</div>
                <p>Um ein vorher exportiertes Spiel zu importieren, wähle eine JSON-Datei aus:</p>

                <div
                    className="file-drop-area"
                    id="file-drop-area"
                    onClick={handleDropAreaClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <span className="file-message">Datei hier ablegen oder</span>
                    <button className="file-select-button">Datei auswählen</button>
                    <input
                        type="file"
                        id="file-input"
                        ref={fileInputRef}
                        accept=".json"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                <div className="import-options">
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            id="clear-before-import"
                            checked={clearBeforeImport}
                            onChange={() => setClearBeforeImport(!clearBeforeImport)}
                        />
                        <span className="checkmark"></span>
                        Alle Daten vor dem Import löschen (Vollständiger Reset)
                    </label>
                    <p className="warning-text">
                        Achtung: Dies löscht alle vorhandenen Spiele, Spieler und Würfe!
                    </p>
                </div>

                <div
                    className="import-status"
                    id="import-status"
                    style={{ color: statusColor }}
                >
                    {importStatus}
                </div>

                <div className="modal-actions">
                    <button
                        id="close-import-modal"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Importiere...' : 'Abbrechen'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;