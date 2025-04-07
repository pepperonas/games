import React, { useState, forwardRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const ScoreInput = forwardRef((props, ref) => {
    const { submitScore } = useGame();
    const [score, setScore] = useState('');
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
        const scoreValue = parseInt(score) || 0;

        const result = submitScore(scoreValue);
        if (result.success) {
            setScore('');
            if (result.message && result.message !== 'score_updated') {
                setMessage(result.message);
            }
        } else {
            setMessage(result.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleClear = () => {
        setScore('');
        ref.current.focus();
    };

    return (
        <div className="input-container">
            <div className="input-group">
                <input
                    type="number"
                    id="current-input"
                    ref={ref}
                    placeholder="Gesamtpunkte für 3 Würfe"
                    min="0"
                    max="180"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    onKeyPress={handleKeyPress}
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