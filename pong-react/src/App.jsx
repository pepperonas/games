// App.jsx - Modifizierte Version ohne PongDebug
import React, { useState, useEffect } from 'react';
import './App.css';
import StartScreen from './components/StartScreen';
import PongGame from './components/PongGame';
import GameOverScreen from './components/GameOverScreen';
import OnlineConnectionScreen from './components/OnlineConnectionScreen';
import StatsScreen from './components/StatsScreen';
import PlayerProfile from './components/PlayerProfile';
import { socketManager } from './socket-connection';

function App() {
    const [currentScreen, setCurrentScreen] = useState('start');
    const [gameMode, setGameMode] = useState('singleplayer');
    const [difficulty, setDifficulty] = useState(5);
    const [isHost, setIsHost] = useState(false);
    const [resetCount, setResetCount] = useState(0);
    const [winData, setWinData] = useState({ winner: '', isLocalPlayerWinner: false });
    const [ballExchangeCount, setBallExchangeCount] = useState(0);
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || 'Spieler');
    const [gameStartTime, setGameStartTime] = useState(null); // Hinzugefügt für GameOverScreen

    // Beim ersten Laden den Spielernamen aus dem lokalen Speicher laden
    useEffect(() => {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            setPlayerName(savedName);
        }

        // Aufräumen beim Beenden der App
        return () => {
            // Socket-Verbindung trennen, aber nur beim vollständigen App-Unmount
            socketManager.cleanup();
        };
    }, []);

    const handleStartGame = (selectedGameMode, selectedDifficulty) => {
        if (selectedGameMode === 'online-multiplayer') {
            // Online-Multiplayer-Modus: Zuerst zur Verbindungsseite
            setGameMode(selectedGameMode);
            setDifficulty(selectedDifficulty);
            setCurrentScreen('online-connection');
        } else {
            // Direkt zum Spiel für Singleplayer und lokalen Multiplayer
            setGameMode(selectedGameMode);
            setDifficulty(selectedDifficulty);
            setCurrentScreen('game');
            setBallExchangeCount(0);
            setGameStartTime(new Date()); // Spielstartzeit setzen
        }
    };

    const handleStartOnlineGame = (host) => {
        console.log(`Starte Online-Spiel als ${host ? 'Host' : 'Gast'}`);
        setIsHost(host);
        socketManager.setIsHost(host);
        setCurrentScreen('game');
        setBallExchangeCount(0);
        setGameStartTime(new Date()); // Spielstartzeit setzen
    };

    const handleGameOver = (winner, isLocalPlayerWinner) => {
        console.log(`Spiel beendet! Gewinner: ${winner}, Lokaler Spieler gewonnen: ${isLocalPlayerWinner}`);
        setWinData({ winner, isLocalPlayerWinner });
        setCurrentScreen('game-over');
    };

    const handleMainMenu = () => {
        // Beim Zurückkehren zum Hauptmenü die Socket-Verbindung behalten
        // aber die Spielstatus-Daten zurücksetzen
        setCurrentScreen('start');
    };

    const handleRestart = () => {
        // Spiel mit aktuellen Einstellungen neu starten
        setResetCount(prev => prev + 1);
        setCurrentScreen('game');
        setBallExchangeCount(0);
        setGameStartTime(new Date()); // Spielstartzeit zurücksetzen
    };

    const handleBallExchange = () => {
        setBallExchangeCount(prev => prev + 1);
    };

    const handleViewStats = () => {
        setCurrentScreen('stats');
    };

    const handleEditProfile = () => {
        setCurrentScreen('profile');
    };

    const handleSaveProfile = (name) => {
        setPlayerName(name);
        localStorage.setItem('playerName', name);
        setCurrentScreen('start');
    };

    return (
        <div className="App">
            {currentScreen === 'start' && (
                <StartScreen
                    onStartGame={handleStartGame}
                    onViewStats={handleViewStats}
                    onEditProfile={handleEditProfile}
                    playerName={playerName}
                />
            )}

            {currentScreen === 'profile' && (
                <PlayerProfile
                    playerName={playerName}
                    onSave={handleSaveProfile}
                    onBack={() => setCurrentScreen('start')}
                    onProfileSubmit={handleSaveProfile} // Zusätzlicher Prop für Kompatibilität
                />
            )}

            {currentScreen === 'online-connection' && (
                <OnlineConnectionScreen
                    onStartGame={handleStartOnlineGame}
                    onBack={() => setCurrentScreen('start')}
                />
            )}

            {currentScreen === 'game' && (
                <PongGame
                    gameMode={gameMode}
                    difficulty={difficulty}
                    isHost={isHost}
                    onGameOver={handleGameOver}
                    onBallExchange={handleBallExchange}
                    resetCount={resetCount}
                    playerName={playerName}
                    onMainMenu={handleMainMenu}
                    socket={socketManager.getSocket()} // Socket über socketManager
                    roomId={socketManager.roomId} // Raum-ID aus socketManager
                />
            )}

            {currentScreen === 'game-over' && (
                <GameOverScreen
                    winner={winData.winner}
                    isLocalPlayerWinner={winData.isLocalPlayerWinner}
                    gameMode={gameMode}
                    isHost={isHost} // Zusätzlich
                    ballExchangeCount={ballExchangeCount}
                    ballExchanges={ballExchangeCount} // Für Kompatibilität beide Namen
                    onRestart={handleRestart}
                    onMainMenu={handleMainMenu}
                    gameStartTime={gameStartTime} // Zusätzlich
                />
            )}

            {currentScreen === 'stats' && (
                <StatsScreen
                    onBack={() => setCurrentScreen('start')}
                    playerName={playerName} // Zusätzlich
                />
            )}
        </div>
    );
}

export default App;