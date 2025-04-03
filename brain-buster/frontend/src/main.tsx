import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { GameProvider } from './store/GameContext'  // Stelle sicher, dass dieser Import korrekt ist

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GameProvider>
            <BrowserRouter basename="/games/brain-buster">
                <App />
            </BrowserRouter>
        </GameProvider>
    </React.StrictMode>,
)