import React from 'react';
import ThemeToggle from '../components/ThemeToggle';
import GameSetup from '../components/GameSetup';
import GameBoard from '../components/GameBoard';
import DataSection from '../components/DataSection';
import { useGame } from '../context/GameContext';

const HomePage = () => {
    const { gameState } = useGame();

    return (
        <>
            <ThemeToggle />

            <div className="container">
                <header>
                    <h1>🎯 Darts3k1</h1>
                </header>

                {!gameState.isGameActive ? (
                    <GameSetup />
                ) : (
                    <GameBoard />
                )}

                <DataSection />
            </div>

            <footer className="footer">
                Made with ❤️ by Martin Pfeffer
            </footer>

            {/* Konfiguriere das Audio-Element mit der korrekten Pfadeinstellung */}
            <audio id="relight-sound" preload="auto" style={{ display: 'none' }}>
                <source src="assets/relight.m4a" type="audio/mp4" />
                Ihr Browser unterstützt das Audio-Element nicht.
            </audio>
        </>
    );
};

export default HomePage;