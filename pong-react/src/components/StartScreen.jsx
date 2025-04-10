// components/StartScreen.jsx - Verbessertes Design passend zur Statistikseite
import React, {useEffect, useState} from 'react';
import './StartScreen.css';

const StartScreen = ({
                         // Original-Props
                         onStartGame,
                         onViewStats,
                         onEditProfile,
                         onDebug, // Wird weiterhin unterstützt, aber Button wird entfernt
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
            // Prüfe zuerst die Profile aus pongProfiles
            const profiles = JSON.parse(localStorage.getItem('pongProfiles')) || [];
            if (profiles.length > 0) {
                setSavedPlayers(profiles);
                return;
            }

            // Alternativ: Suche nach Spieler-Einträgen
            const players = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('pongPlayer_')) {
                    const playerName = key.replace('pongPlayer_', '');
                    players.push(playerName);
                }
            }
            setSavedPlayers(players);
        };

        loadSavedPlayers();
    }, []);

    // Außerhalb des Menüs klicken schließt das Menü
    useEffect(() => {
        if (showPlayerMenu) {
            const handleClickOutside = (event) => {
                if (!event.target.closest('.player-welcome') && !event.target.closest('.player-menu')) {
                    setShowPlayerMenu(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showPlayerMenu]);

    // Kompatibilitätsfunktionen: Verwendung der verfügbaren Callback-Funktionen
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

            <div className="player-welcome" onClick={() => setShowPlayerMenu(!showPlayerMenu)}>
                Willkommen, <span className="player-name">{playerName} ▼</span>

                {showPlayerMenu && (
                    <div className="player-menu">
                        <div className="player-list">
                            {savedPlayers.map((name, index) => (
                                <div
                                    key={index}
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
                {/* Debug-Button wurde entfernt */}
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