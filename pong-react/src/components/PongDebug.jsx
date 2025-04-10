// components/PongDebug.jsx
import React, { useState } from 'react';
import './PongGame.css';
import { socketManager } from '../socket-connection';

const PongDebug = ({ onBack }) => {
    const [logMessages, setLogMessages] = useState([]);
    const [serverStatus, setServerStatus] = useState('Nicht verbunden');
    const [roomInfo, setRoomInfo] = useState('-');

    const testSocketConnection = () => {
        try {
            const socket = socketManager.getSocket();
            addLog('🔄 Socket-Verbindung wird getestet...');

            if (!socket) {
                addLog('❌ Fehler: Keine Socket-Instanz verfügbar.');
                setServerStatus('Fehler: Keine Socket-Instanz');
                return;
            }

            addLog(`🔌 Socket-ID: ${socket.id || 'keine'}`);
            addLog(`🔌 Verbunden: ${socket.connected ? 'Ja' : 'Nein'}`);
            setServerStatus(socket.connected ? 'Verbunden' : 'Nicht verbunden');

            if (socket.connected) {
                socket.emit('ping');
                addLog('📤 Ping-Anfrage gesendet');

                socket.once('pong', () => {
                    addLog('📥 Pong-Antwort erhalten');
                    setServerStatus('Verbunden (verifiziert)');
                });

                // Nach 2 Sekunden überprüfen, ob wir eine Antwort erhalten haben
                setTimeout(() => {
                    if (socket.hasListeners('pong')) {
                        addLog('⚠️ Timeout: Keine Pong-Antwort erhalten.');
                    }
                }, 2000);
            }
        } catch (err) {
            addLog(`❌ Fehler beim Testen der Socket-Verbindung: ${err.message}`);
            setServerStatus(`Fehler: ${err.message}`);
        }
    };

    const testRoomCreation = () => {
        try {
            const socket = socketManager.getSocket();
            addLog('🏠 Versuche, einen Testraum zu erstellen...');

            if (!socket || !socket.connected) {
                addLog('❌ Fehler: Socket nicht verbunden.');
                return;
            }

            // roomCreated-Event einmal hören
            socket.once('roomCreated', ({ roomId }) => {
                addLog(`🏠 Raum erstellt: ${roomId}`);
                setRoomInfo(`Raum-ID: ${roomId}`);
                socketManager.setRoomId(roomId);
            });

            // Fehler-Event einmal hören
            socket.once('error', ({ message }) => {
                addLog(`❌ Server-Fehler: ${message}`);
                setRoomInfo(`Fehler: ${message}`);
            });

            // Testraum erstellen
            socket.emit('createRoom');
            addLog('📤 createRoom-Anfrage gesendet');

            // Nach 3 Sekunden überprüfen, ob wir eine Antwort erhalten haben
            setTimeout(() => {
                if (socket.hasListeners('roomCreated')) {
                    addLog('⚠️ Timeout: Keine roomCreated-Antwort erhalten.');
                    socket.off('roomCreated');
                    socket.off('error');
                }
            }, 3000);
        } catch (err) {
            addLog(`❌ Fehler beim Erstellen des Testraums: ${err.message}`);
        }
    };

    const cleanupConnection = () => {
        try {
            addLog('🧹 Räume Socket-Verbindung auf...');
            socketManager.cleanup();
            addLog('✅ Socket-Verbindung getrennt und zurückgesetzt.');
            setServerStatus('Getrennt');
            setRoomInfo('-');
        } catch (err) {
            addLog(`❌ Fehler beim Aufräumen der Verbindung: ${err.message}`);
        }
    };

    const getConnectionInfo = () => {
        try {
            addLog('ℹ️ Hole Verbindungsinformationen...');
            socketManager.logStatus();
            addLog(`🔌 Socket-Verbindung: ${socketManager.socket ? 'Aktiv' : 'Inaktiv'}`);
            if (socketManager.socket) {
                addLog(`🔌 Socket-ID: ${socketManager.socket.id}`);
                addLog(`🔌 Verbunden: ${socketManager.socket.connected ? 'Ja' : 'Nein'}`);
            }
            addLog(`🏠 Aktuelle Raum-ID: ${socketManager.roomId || 'keine'}`);
            addLog(`👑 Host-Status: ${socketManager.isHost ? 'Host' : 'Gast'}`);
            addLog(`🔢 Verbindungszähler: ${socketManager.connectionCount}`);

            setServerStatus(socketManager.socket?.connected ? 'Verbunden' : 'Nicht verbunden');
            setRoomInfo(socketManager.roomId ? `Raum-ID: ${socketManager.roomId}` : 'Kein Raum');
        } catch (err) {
            addLog(`❌ Fehler beim Abrufen der Verbindungsinformationen: ${err.message}`);
        }
    };

    const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogMessages(prev => [...prev, `[${timestamp}] ${message}`].slice(-50)); // Nur die letzten 50 Nachrichten behalten
    };

    return (
        <div className="debug-screen">
            <h2>WebRTC Debug</h2>

            <div className="status-panel">
                <div className="status-item">
                    <span className="status-label">Server-Status:</span>
                    <span className={`status-value ${serverStatus.includes('Verbunden') ? 'connected' : 'disconnected'}`}>
                        {serverStatus}
                    </span>
                </div>
                <div className="status-item">
                    <span className="status-label">Raum:</span>
                    <span className="status-value">{roomInfo}</span>
                </div>
            </div>

            <div className="debug-actions">
                <button onClick={testSocketConnection} className="debug-btn socket-test-btn">
                    Socket-Verbindung testen
                </button>
                <button onClick={testRoomCreation} className="debug-btn room-test-btn">
                    Raumerstellung testen
                </button>
                <button onClick={getConnectionInfo} className="debug-btn info-btn">
                    Verbindungsinfo
                </button>
                <button onClick={cleanupConnection} className="debug-btn cleanup-btn">
                    Verbindung trennen
                </button>
            </div>

            <div className="debug-log">
                <h3>Debug-Protokoll</h3>
                <div className="log-content">
                    {logMessages.length === 0 ? (
                        <p className="no-logs">Keine Protokolleinträge vorhanden.</p>
                    ) : (
                        logMessages.map((msg, index) => (
                            <div key={index} className="log-entry">{msg}</div>
                        ))
                    )}
                </div>
            </div>

            <button onClick={onBack} className="debug-back-btn">
                Zurück zum Hauptmenü
            </button>

            <style jsx>{`
                .debug-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: #2C2E3B;
                    color: white;
                    padding: 20px;
                    box-sizing: border-box;
                    overflow-y: auto;
                    z-index: 1000;
                }
                
                h2 {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .status-panel {
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                
                .status-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                
                .status-label {
                    font-weight: bold;
                }
                
                .status-value {
                    font-family: monospace;
                }
                
                .connected {
                    color: #4CAF50;
                }
                
                .disconnected {
                    color: #f44336;
                }
                
                .debug-actions {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .debug-btn {
                    background-color: #3a3c4e;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    padding: 10px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .socket-test-btn {
                    background-color: #2196F3;
                }
                
                .room-test-btn {
                    background-color: #9C27B0;
                }
                
                .info-btn {
                    background-color: #FF9800;
                }
                
                .cleanup-btn {
                    background-color: #f44336;
                }
                
                .debug-log {
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                
                .debug-log h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .log-content {
                    height: 300px;
                    overflow-y: auto;
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 5px;
                    padding: 10px;
                    font-family: monospace;
                    font-size: 12px;
                }
                
                .log-entry {
                    margin-bottom: 5px;
                    line-height: 1.4;
                }
                
                .no-logs {
                    text-align: center;
                    color: #888;
                    font-style: italic;
                }
                
                .debug-back-btn {
                    display: block;
                    width: 100%;
                    background-color: #757575;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    padding: 12px;
                    cursor: pointer;
                    font-size: 16px;
                }
                
                @media (max-width: 768px) {
                    .debug-actions {
                        grid-template-columns: 1fr;
                    }
                    
                    .log-content {
                        height: 200px;
                    }
                }
            `}</style>
        </div>
    );
};

export default PongDebug;