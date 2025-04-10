// components/StartScreen.jsx
import React, {useEffect, useState} from 'react';
import './StartScreen.css';

const StartScreen = ({
                         // Original-Props
                         onStartGame,
                         onViewStats,
                         onEditProfile,
                         onDebug,
                         playerName,

                         // Alternativ-Props (für Kompatibilität)
                         onStartSinglePlayer,
                         onStartLocalMultiplayer,
                         onSetupOnlineMultiplayer,
                         onShowStats,
                         onShowDebug,
                         isMobile,
                         isLandscape,
                         onSwitchPlayer
                     }) => {
    const [showPlayerMenu, setShowPlayerMenu] = useState(false);
    const [savedPlayers, setSavedPlayers] = useState([]);

    // Lade gespeicherte Spieler aus localStorage
    useEffect(() => {
        const loadSavedPlayers = () => {
            const players = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Nur Spieler-Einträge berücksichtigen (nicht die Einträge für andere Daten)
                if (key && key.startsWith('pongPlayer_')) {
                    const playerName = key.replace('pongPlayer_', '');
                    players.push(playerName);
                }
            }
            setSavedPlayers(players);
        };

        loadSavedPlayers();
    }, []);

    // Kompatibilitätsfunktionen: Verwendung der verfügbaren Funktionen
    const startSinglePlayer = (difficulty) => {
        if (onStartSinglePlayer) {
            onStartSinglePlayer(difficulty);
        } else if (onStartGame) {
            onStartGame('singleplayer', difficulty);
        }
    };

    const startLocalMultiplayer = () => {
        if (onStartLocalMultiplayer) {
            onStartLocalMultiplayer();
        } else if (onStartGame) {
            onStartGame('local-multiplayer', null);
        }
    };

    const setupOnlineMultiplayer = () => {
        if (onSetupOnlineMultiplayer) {
            onSetupOnlineMultiplayer();
        } else if (onStartGame) {
            onStartGame('online-multiplayer', null);
        }
    };

    const showStats = () => {
        if (onShowStats) {
            onShowStats();
        } else if (onViewStats) {
            onViewStats();
        }
    };

    const showDebug = () => {
        if (onShowDebug) {
            onShowDebug();
        } else if (onDebug) {
            onDebug();
        }
    };

    const handlePlayerSelect = (playerName) => {
        if (onSwitchPlayer) {
            onSwitchPlayer(playerName);
        } else if (onEditProfile) {
            onEditProfile();
        }
        setShowPlayerMenu(false);
    };

    const handleNewPlayer = () => {
        if (onSwitchPlayer) {
            onSwitchPlayer();
        } else if (onEditProfile) {
            onEditProfile();
        }
        setShowPlayerMenu(false);
    };

    return (
        <div className="start-screen">
            <h1>Pong</h1>

            <div className="player-welcome">
                <p>Willkommen, <strong
                    onClick={() => setShowPlayerMenu(!showPlayerMenu)}>{playerName} ▼</strong></p>

                {showPlayerMenu && (
                    <div className="player-menu">
                        <div className="player-list">
                            {savedPlayers.map((name) => (
                                <div
                                    key={name}
                                    className={`player-item ${name === playerName ? 'active' : ''}`}
                                    onClick={() => handlePlayerSelect(name)}
                                >
                                    {name}
                                </div>
                            ))}
                            <div className="player-item new-player" onClick={handleNewPlayer}>
                                + Neuer Spieler
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="game-modes">
                <h2>Spielmodus wählen</h2>

                <div className="mode-section">
                    <h3>Einzelspieler</h3>
                    <div className="difficulty-buttons">
                        <button onClick={() => startSinglePlayer(2)}>Einfach</button>
                        <button onClick={() => startSinglePlayer(3)}>Mittel</button>
                        <button onClick={() => startSinglePlayer(5)}>Schwer</button>
                    </div>
                </div>

                <div className="mode-section">
                    <h3>Mehrspieler</h3>
                    <div className="multiplayer-buttons">
                        <button onClick={startLocalMultiplayer}>Lokal (2 Spieler)</button>
                        <button onClick={setupOnlineMultiplayer}>Online-Multiplayer</button>
                    </div>
                </div>
            </div>

            <div className="bottom-buttons">
                <button className="stats-button" onClick={showStats}>Statistiken</button>
                {/* Debug-Button hinzufügen */}
                <button className="debug-button" onClick={showDebug}>WebRTC Debug</button>
            </div>

            {isMobile && !isLandscape && (
                <div className="orientation-warning">
                    <p>Für ein besseres Spielerlebnis, drehe dein Gerät ins Querformat.</p>
                </div>
            )}
        </div>
    );
};

export default StartScreen;