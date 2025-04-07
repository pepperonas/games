import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

const GameSetup = () => {
    const { initGame } = useGame();

    const [numPlayers, setNumPlayers] = useState(2);
    const [gameType, setGameType] = useState(501);
    const [numSets, setNumSets] = useState(3);
    const [numLegs, setNumLegs] = useState(3);
    const [players, setPlayers] = useState(['Spieler 1', 'Spieler 2']);

    const handleNumPlayersChange = (e) => {
        const count = parseInt(e.target.value);
        setNumPlayers(count);

        // Update player array to match the new count
        const newPlayers = [...players];
        if (count > players.length) {
            // Add additional players
            for (let i = players.length; i < count; i++) {
                newPlayers.push(`Spieler ${i + 1}`);
            }
        } else {
            // Remove excess players
            newPlayers.splice(count);
        }
        setPlayers(newPlayers);
    };

    const handlePlayerNameChange = (index, name) => {
        const newPlayers = [...players];
        newPlayers[index] = name;
        setPlayers(newPlayers);
    };

    const handleStartGame = () => {
        const gameSettings = {
            players,
            gameType,
            numSets,
            numLegs
        };

        initGame(gameSettings);
    };

    const handleResetSettings = () => {
        setNumPlayers(2);
        setGameType(501);
        setNumSets(3);
        setNumLegs(3);
        setPlayers(['Spieler 1', 'Spieler 2']);
    };

    return (
        <div className="setup-container" id="setup">
            <h2>Spiel-Einstellungen</h2>

            <div className="game-settings">
                <div className="setting-group">
                    <label htmlFor="game-type">Spieltyp:</label>
                    <select
                        id="game-type"
                        value={gameType}
                        onChange={(e) => setGameType(parseInt(e.target.value))}
                    >
                        <option value="301">301</option>
                        <option value="501">501</option>
                        <option value="701">701</option>
                    </select>
                </div>

                <div className="setting-group">
                    <label htmlFor="num-players">Anzahl Spieler:</label>
                    <select
                        id="num-players"
                        value={numPlayers}
                        onChange={handleNumPlayersChange}
                    >
                        <option value="1">1 Spieler</option>
                        <option value="2">2 Spieler</option>
                        <option value="3">3 Spieler</option>
                        <option value="4">4 Spieler</option>
                    </select>
                </div>

                <div className="setting-group">
                    <label htmlFor="num-sets">Sets:</label>
                    <select
                        id="num-sets"
                        value={numSets}
                        onChange={(e) => setNumSets(parseInt(e.target.value))}
                    >
                        <option value="1">Best of 1</option>
                        <option value="3">Best of 3</option>
                        <option value="5">Best of 5</option>
                        <option value="7">Best of 7</option>
                    </select>
                </div>

                <div className="setting-group">
                    <label htmlFor="num-legs">Legs pro Set:</label>
                    <select
                        id="num-legs"
                        value={numLegs}
                        onChange={(e) => setNumLegs(parseInt(e.target.value))}
                    >
                        <option value="1">Best of 1</option>
                        <option value="3">Best of 3</option>
                        <option value="5">Best of 5</option>
                        <option value="7">Best of 7</option>
                    </select>
                </div>
            </div>

            <div id="player-names-container">
                {players.map((player, index) => (
                    <div className="setting-group" key={index}>
                        <label htmlFor={`player-${index + 1}-name`}>Spieler {index + 1} Name:</label>
                        <input
                            type="text"
                            id={`player-${index + 1}-name`}
                            placeholder={`Spieler ${index + 1}`}
                            value={player}
                            onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="btn-group">
                <button id="start-game" onClick={handleStartGame}>
                    Spiel starten
                </button>
                <button id="reset-settings" className="accent" onClick={handleResetSettings}>
                    Zurücksetzen
                </button>
            </div>
        </div>
    );
};

export default GameSetup;