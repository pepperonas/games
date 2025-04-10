import React, {useEffect, useState} from 'react';
import './PlayerProfile.css';

const PlayerProfile = ({playerName: initialPlayerName, onSave, onProfileSubmit, onBack}) => {
    const [playerName, setPlayerName] = useState(initialPlayerName || '');
    const [errorMessage, setErrorMessage] = useState('');
    const [savedProfiles, setSavedProfiles] = useState([]);

    useEffect(() => {
        // Lade gespeicherte Profile aus dem localStorage
        const profiles = JSON.parse(localStorage.getItem('pongProfiles')) || [];
        setSavedProfiles(profiles);

        // Versuche, den zuletzt verwendeten Namen zu laden
        const lastProfile = localStorage.getItem('pongLastProfile');
        if (lastProfile) {
            setPlayerName(lastProfile);
        } else if (initialPlayerName) {
            setPlayerName(initialPlayerName);
        }
    }, [initialPlayerName]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!playerName.trim()) {
            setErrorMessage('Bitte gib einen Namen ein');
            return;
        }

        // Speichere den Namen für künftige Sitzungen
        localStorage.setItem('pongLastProfile', playerName);

        // Überprüfe, ob das Profil bereits existiert, wenn nicht, füge es hinzu
        const profiles = JSON.parse(localStorage.getItem('pongProfiles')) || [];
        if (!profiles.includes(playerName)) {
            profiles.push(playerName);
            localStorage.setItem('pongProfiles', JSON.stringify(profiles));
        }

        // Erstelle oder aktualisiere Statistik-Objekt für diesen Spieler
        const playerStats = JSON.parse(localStorage.getItem(`pongStats_${playerName}`)) || {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            totalBallExchanges: 0,
            totalPlayTime: 0,
            lastPlayed: new Date().toISOString(),
            history: []
        };

        localStorage.setItem(`pongStats_${playerName}`, JSON.stringify(playerStats));

        // Übermittle den Namen an die Parent-Komponente (Unterstützt beide Callback-Namen)
        if (onSave) {
            onSave(playerName);
        }
        if (onProfileSubmit) {
            onProfileSubmit(playerName);
        }
    };

    const handleProfileSelect = (name) => {
        setPlayerName(name);
    };

    return (
        <div className="player-profile">
            <h2>Spielerprofil</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Dein Name"
                        className="name-input"
                    />
                </div>

                {errorMessage && <div className="error-message">{errorMessage}</div>}

                {savedProfiles.length > 0 && (
                    <div className="saved-profiles">
                        <p>Gespeicherte Profile:</p>
                        <div className="profile-list">
                            {savedProfiles.map((profile, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className="profile-button"
                                    onClick={() => handleProfileSelect(profile)}
                                >
                                    {profile}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button type="submit" className="button">Spielen</button>
                {onBack && (
                    <button type="button" className="button" onClick={onBack}
                            style={{marginTop: '10px', backgroundColor: '#757575'}}>
                        Zurück
                    </button>
                )}
            </form>
        </div>
    );
};

export default PlayerProfile;