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
        </>
    );
};

export default HomePage;