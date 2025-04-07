// components/TouchControls.jsx
import React from 'react';

const TouchControls = ({ onMoveUp, onMoveDown, position }) => {
    return (
        <div className="touch-controls">
            <button
                className="touch-button up-button"
                onTouchStart={onMoveUp}
                onTouchEnd={() => {}}
                onMouseDown={onMoveUp}
                onMouseUp={() => {}}
            >
                ▲
            </button>
            <button
                className="touch-button down-button"
                onTouchStart={onMoveDown}
                onTouchEnd={() => {}}
                onMouseDown={onMoveDown}
                onMouseUp={() => {}}
            >
                ▼
            </button>
        </div>
    );
};

export default TouchControls;