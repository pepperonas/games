import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { GameProvider } from './context/GameContext';
import { DatabaseProvider } from './context/DatabaseContext';
import HomePage from './pages/HomePage';
import StatisticsPage from './pages/StatisticsPage';
import './assets/styles.css';

function App() {
    useEffect(() => {
        // Set title and other document properties
        document.title = 'Darts3k1';
    }, []);

    return (
        <ThemeProvider>
            <DatabaseProvider>
                <GameProvider>
                    <Router basename="/games/darts-react">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/statistics" element={<StatisticsPage />} />
                        </Routes>
                    </Router>
                </GameProvider>
            </DatabaseProvider>
        </ThemeProvider>
    );
}

export default App;