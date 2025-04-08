import React, { useState, forwardRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const ScoreInput = forwardRef((props, ref) => {
    const { submitScore } = useGame();
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // Clear message after 3 seconds
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSubmit = () => {
        // Imperativ den DOM-Wert direkt auslesen
        const inputElement = document.getElementById('current-input');
        if (!inputElement) return;

        const scoreValue = parseInt(inputElement.value, 10) || 0;

        // Validierung der Punktzahl
        if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 180) {
            setMessage("Bitte gib eine gültige Punktzahl zwischen 0 und 180 ein.");
            return;
        }

        const result = submitScore(scoreValue);

        if (result.success) {
            // Imperativ das Eingabefeld zurücksetzen
            inputElement.value = '';

            // Fehlermeldungen anzeigen wenn nötig
            if (result.message && result.message !== 'score_updated') {
                setMessage(result.message);
            }
        } else {
            setMessage(result.message);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleClear = () => {
        // Imperativ das Eingabefeld leeren
        const inputElement = document.getElementById('current-input');
        if (inputElement) {
            inputElement.value = '';
            inputElement.focus();
        }
        setMessage(null);
    };

    return (
        <div className="input-container">
            <div className="input-group">
                <input
                    type="text"
                    id="current-input"
                    ref={ref}
                    placeholder="Gesamtpunkte für 3 Würfe"
                    defaultValue="" // Wir verwenden defaultValue statt value
                    onKeyDown={handleKeyDown}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                />
                <button
                    id="clear-input"
                    className="accent"
                    onClick={handleClear}
                >
                    Löschen
                </button>
            </div>
            <button
                id="submit-score"
                onClick={handleSubmit}
            >
                Punkte eingeben
            </button>

            {message && (
                <div className="message">
                    {message}
                </div>
            )}
        </div>
    );
});

export default ScoreInput;