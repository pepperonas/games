import React, { useState, forwardRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const ScoreInput = forwardRef((props, ref) => {
    const { submitScore, gameState } = useGame();
    const [message, setMessage] = useState(null);
    const [inputValue, setInputValue] = useState('');

    // Reagiere auf Spielerwechsel
    useEffect(() => {
        // Leere das Eingabefeld bei Spielerwechsel
        setInputValue('');
    }, [gameState.currentPlayerIndex]);

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
        const scoreValue = parseInt(inputValue, 10) || 0;

        // Validierung der Punktzahl
        if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 180) {
            setMessage("Bitte gib eine gültige Punktzahl zwischen 0 und 180 ein.");
            return;
        }

        const result = submitScore(scoreValue);

        if (result.success) {
            setInputValue(''); // Eingabefeld leeren

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
        setInputValue('');
        setMessage(null);
        if (ref && ref.current) {
            ref.current.focus();
        }
    };

    return (
        <div className="input-container">
            <div className="input-group">
                <input
                    type="text"
                    id="current-input"
                    ref={ref}
                    placeholder="Gesamtpunkte für 3 Würfe"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
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