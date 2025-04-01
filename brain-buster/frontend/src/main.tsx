// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {GameProvider} from './store/GameContext'
import {SocketProvider} from './store/SocketContext'
import {WebRTCProvider} from './store/WebRTCContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SocketProvider>
            <WebRTCProvider>
                <GameProvider>
                    <App/>
                </GameProvider>
            </WebRTCProvider>
        </SocketProvider>
    </React.StrictMode>,
)