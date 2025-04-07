import React from 'react';

const RestartGameDialog = ({onConfirm, onCancel}) => {
    return (
        <div id="restart-confirmation" className="confirmation-dialog">
            <p>Wirklich neues Spiel starten?</p>
            <div className="confirmation-buttons">
                <button id="confirm-restart" onClick={onConfirm}>Ja</button>
                <button id="cancel-restart" onClick={onCancel}>Nein</button>
            </div>
        </div>
    );
};

export default RestartGameDialog;