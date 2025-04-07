// components/TouchControls.jsx - Vereinfachte Version mit nur einem Paar Buttons
import React from 'react';
import './TouchControls.css';

const TouchControls = ({ onMoveUp, onMoveDown }) => {
    return (
        <div className="touch-controls">
            <button
                className="touch-button up-button"
                onTouchStart={onMoveUp}
                onTouchEnd={() => {}}
            >
                ▲
            </button>
            <button
                className="touch-button down-button"
                onTouchStart={onMoveDown}
                onTouchEnd={() => {}}
            >
                ▼
            </button>
        </div>
    );
};

export default TouchControls;