import React from 'react';
import ThemeToggle from '../components/ThemeToggle';
import GameSetup from '../components/GameSetup';
import GameBoard from '../components/GameBoard';
import DataSection from '../components/DataSection';
import { useGame } from '../context/GameContext';
import { Link } from 'react-router-dom';

const HomePage = () => {
    const { gameState } = useGame();

    return (
        <>
            <ThemeToggle />

            <div className="container">
                <header>
                    <div className="app-logo">
                        <span className="app-logo-icon">🎯</span>
                        <h1 className="app-logo-text">Darts<span>3k1</span></h1>
                    </div>

                    <nav className="app-navigation">
                        <Link to="/" className="nav-item active">Home</Link>
                        <Link to="/statistics" className="nav-item">Statistiken</Link>
                        <a href="#" className="nav-item">Einstellungen</a>
                    </nav>
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