// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {GameProvider} from './store/GameContext'
import {WebSocketProvider} from './store/WebSocketContext'
import {WebRTCProvider} from './store/WebRTCContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <WebSocketProvider>
            <WebRTCProvider>
                <GameProvider>
                    <App/>
                </GameProvider>
            </WebRTCProvider>
        </WebSocketProvider>
    </React.StrictMode>,
)