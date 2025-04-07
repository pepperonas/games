// components/StartScreen.jsx
import React from 'react';
import './StartScreen.css';

const StartScreen = ({ onStartSinglePlayer, onStartLocalMultiplayer, onSetupOnlineMultiplayer }) => {
    return (
        <div className="start-screen">
            <h1>PONG</h1>
            <div className="button-group">
                <div>
                    <button onClick={() => onStartSinglePlayer(2)} className="button easy-btn">Einfach</button>
                    <button onClick={() => onStartSinglePlayer(3)} className="button medium-btn">Mittel</button>
                    <button onClick={() => onStartSinglePlayer(5)} className="button hard-btn">Schwer</button>
                </div>
                <div>
                    <button onClick={onStartLocalMultiplayer} className="button multiplayer-local-btn">Multiplayer (Lokal)</button>
                    <button onClick={onSetupOnlineMultiplayer} className="button multiplayer-online-btn">Multiplayer (Online)</button>
                </div>
            </div>
            <div className="controls-info">
                <p>Einzelspieler: Pfeiltasten (Hoch/Runter)</p>
                <p>Multiplayer (Lokal): Spieler 1 - W/S Tasten, Spieler 2 - Pfeiltasten (Hoch/Runter)</p>
                <p>Multiplayer (Online): W/S oder Pfeiltasten (Hoch/Runter)</p>
            </div>
        </div>
    );
};

export default StartScreen;