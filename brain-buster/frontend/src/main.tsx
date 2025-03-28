// ========== src/main.tsx ==========
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GameProvider } from './store/GameContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GameProvider>
            <App />
        </GameProvider>
    </React.StrictMode>,
)









