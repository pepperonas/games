// components/StartScreen.jsx - Mit Statistik-Button
import React, { useEffect, useState } from 'react';
import './StartScreen.css';

const StartScreen = ({
                         onStartSinglePlayer,
                         onStartLocalMultiplayer,
                         onSetupOnlineMultiplayer,
                         onShowStats,
                         playerName,
                         isMobile,
                         isLandscape
                     }) => {
    const [isWideDevice, setIsWideDevice] = useState(false);

    // Prüft, ob das Gerät sehr breit ist (wie S24 Ultra)
    useEffect(() => {
        const checkWideDevice = () => {
            const isWide = window.innerWidth >= 1200 && window.innerHeight <= 500;
            setIsWideDevice(isWide);
        };

        checkWideDevice();
        window.addEventListener('resize', checkWideDevice);
        window.addEventListener('orientationchange', () => {
            setTimeout(checkWideDevice, 100);
        });

        return () => {
            window.removeEventListener('resize', checkWideDevice);
            window.removeEventListener('orientationchange', checkWideDevice);
        };
    }, []);

    // CSS-Klassen basierend auf Gerätetyp und Orientierung
    const screenClasses = `start-screen ${isLandscape ? 'landscape-mode' : ''} ${isWideDevice ? 'wide-device' : ''}`;

    return (
        <div className={screenClasses}>
            <h1>PONG</h1>

            <div className="player-welcome">
                Willkommen, <span className="player-name">{playerName}</span>!
            </div>

            <div className="button-group">
                {/* Die drei Schwierigkeits-Buttons immer in einer horizontalen Reihe */}
                <div className="difficulty-buttons">
                    <button onClick={() => onStartSinglePlayer(2)} className="button easy-btn">Einfach</button>
                    <button onClick={() => onStartSinglePlayer(3)} className="button medium-btn">Mittel</button>
                    <button onClick={() => onStartSinglePlayer(5)} className="button hard-btn">Schwer</button>
                </div>

                {/* Die Multiplayer-Buttons darunter */}
                <div className="multiplayer-buttons">
                    <button onClick={onStartLocalMultiplayer} className="button multiplayer-local-btn">Multiplayer (Lokal)</button>
                    <button onClick={onSetupOnlineMultiplayer} className="button multiplayer-online-btn">Multiplayer (Online)</button>
                </div>

                {/* Statistik-Button */}
                <div className="stats-button-container">
                    <button onClick={onShowStats} className="button stats-btn">Statistiken</button>
                </div>
            </div>

            {(!isLandscape || (isLandscape && !isWideDevice) || (isLandscape && window.innerHeight > 450)) && (
                <div className="controls-info">
                    {isMobile ? (
                        <>
                            <p>Bedienung über Touch-Steuerelemente am Bildschirmrand</p>
                            <p>Tippe auf die Pfeile ▲▼</p>
                        </>
                    ) : (
                        <>
                            <p>Einzelspieler: Pfeiltasten (Hoch/Runter)</p>
                            <p>Multiplayer (Lokal): Spieler 1 - W/S, Spieler 2 - Pfeiltasten (Hoch/Runter)</p>
                            <p>Multiplayer (Online): W/S oder Pfeiltasten (Hoch/Runter)</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default StartScreen;