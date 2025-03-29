// ========== src/App.tsx ==========
import {ReactNode, useEffect} from 'react'
import {BrowserRouter, Route, Routes, useLocation, useNavigate} from 'react-router-dom'
import {AnimatePresence} from 'framer-motion'

// Pages
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import MultiplayerPage from './pages/MultiplayerPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

// Components
import Layout from './components/ui/Layout'
import {useGame} from './store/GameContext'

// Wrapper component that handles refresh warnings
interface RefreshWarningHandlerProps {
    children: ReactNode;
}

const RefreshWarningHandler = ({children}: RefreshWarningHandlerProps) => {
    const location = useLocation();

    useEffect(() => {
        // Only attach the event listener if we're not on the home page
        if (location.pathname !== '/') {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                // Show warning dialog when user tries to refresh
                const message = "Möchten Sie wirklich die Seite neu laden? Alle ungespeicherten Änderungen gehen verloren.";
                e.returnValue = message;
                return message;
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [location.pathname]);

    return children;
};

// Custom 404 handler component
const NotFoundHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // If the page is accessed directly (not through React Router navigation)
        // and results in a 404, redirect to home
        if (document.referrer === '') {
            navigate('/games/brain-buster/');
        }
    }, [navigate]);

    return <NotFoundPage/>;
};

function App() {
    const {initGameState} = useGame()

    useEffect(() => {
        // Initialisiere den Spielstand beim App-Start
        initGameState()
    }, [initGameState])

    return (
        <BrowserRouter basename="/games/brain-buster">
            <RefreshWarningHandler>
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<Layout/>}>
                            <Route index element={<HomePage/>}/>
                            <Route path="game" element={<GamePage/>}/>
                            <Route path="multiplayer" element={<MultiplayerPage/>}/>
                            <Route path="stats" element={<StatsPage/>}/>
                            <Route path="settings" element={<SettingsPage/>}/>
                            <Route path="*" element={<NotFoundHandler/>}/>
                        </Route>
                    </Routes>
                </AnimatePresence>
            </RefreshWarningHandler>
        </BrowserRouter>
    )
}

export default App