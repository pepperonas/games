// ========== src/App.tsx ==========
import {useEffect} from 'react'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
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

function App() {
    const {initGameState} = useGame()

    useEffect(() => {
        // Initialisiere den Spielstand beim App-Start
        initGameState()
    }, [initGameState])

    return (
        <BrowserRouter>
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<Layout/>}>
                        <Route index element={<HomePage/>}/>
                        <Route path="game" element={<GamePage/>}/>
                        <Route path="multiplayer" element={<MultiplayerPage/>}/>
                        <Route path="stats" element={<StatsPage/>}/>
                        <Route path="settings" element={<SettingsPage/>}/>
                        <Route path="*" element={<NotFoundPage/>}/>
                    </Route>
                </Routes>
            </AnimatePresence>
        </BrowserRouter>
    )
}

export default App
