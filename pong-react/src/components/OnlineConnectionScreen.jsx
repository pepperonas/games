// components/OnlineConnectionScreen.jsx
import React, {useEffect, useRef, useState} from 'react';
import io from 'socket.io-client';
import './OnlineConnectionScreen.css';

const SIGNALING_SERVER = 'https://mrx3k1.de';

const OnlineConnectionScreen = ({onStartGame, onBack}) => {
    const [connectionId, setConnectionId] = useState('Wird generiert...');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isJoiningRoom, setIsJoiningRoom] = useState(false); // Neue State-Variable
    const [error, setError] = useState('');
    const connectionInputRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // Socket.io-Verbindung herstellen
        socketRef.current = io(SIGNALING_SERVER, {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        // Event-Handler für Socket.io
        socketRef.current.on('connect', () => {
            console.log('Mit Signaling-Server verbunden');

            // Raum erstellen NUR, wenn nicht im Beitrittsprozess
            if (!isJoiningRoom) {
                // Raum erstellen
                socketRef.current.emit('createRoom');
            }
        });

        socketRef.current.on('roomCreated', ({roomId}) => {
            console.log('Raum erstellt:', roomId);
            setConnectionId(roomId);
        });

        socketRef.current.on('gameReady', () => {
            // Spiel kann beginnen
            console.log('Spiel ist bereit!');
        });

        socketRef.current.on('playerRole', ({isHost}) => {
            console.log('Spielerrolle erhalten:', isHost ? 'Host' : 'Gast');
            // Starte das Spiel mit der zugewiesenen Rolle
            onStartGame(isHost);
        });

        socketRef.current.on('error', ({message}) => {
            console.error('Socket.io-Fehler:', message);
            setError(message);
            setIsConnecting(false);
            setIsJoiningRoom(false);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Verbindungsfehler:', error);
            setError('Verbindungsfehler: ' + error.message);
            setIsConnecting(false);
            setIsJoiningRoom(false);
        });

        // Diagnose-Events
        socketRef.current.onAny((event, ...args) => {
            console.log(`Socket.io-Event: ${event}`, args);
        });

        return () => {
            // Aufräumen beim Unmount
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [onStartGame, isJoiningRoom]);

    const copyRoomIdToClipboard = () => {
        navigator.clipboard.writeText(connectionId)
            .then(() => {
                // Feedback für den Benutzer
                const copyBtn = document.getElementById('copy-btn');
                if (copyBtn) {
                    copyBtn.textContent = "Kopiert!";
                    setTimeout(() => {
                        copyBtn.textContent = "Kopieren";
                    }, 2000);
                }
            })
            .catch(err => {
                console.error('Fehler beim Kopieren:', err);
            });
    };

    const connectToRoom = () => {
        const roomId = connectionInputRef.current.value.trim().toUpperCase();

        if (!roomId) {
            setError('Bitte gib eine Verbindungs-ID ein');
            return;
        }

        setIsConnecting(true);
        setIsJoiningRoom(true); // Markieren, dass wir einem Raum beitreten
        setError('');

        console.log('Versuche, Raum beizutreten:', roomId);

        // Einem Raum beitreten
        socketRef.current.emit('joinRoom', {roomId});
    };

    // Debug-Modus für Fehlerbehebung
    const startTestMode = () => {
        console.log('🧪 Starte Multiplayer-Test-Modus');

        // Wechselt zwischen Host und Gast
        const debugRole = localStorage.getItem('pongDebugRole') !== 'false';
        localStorage.setItem('pongDebugRole', !debugRole);

        console.log(`🧪 Test als ${debugRole ? 'Host' : 'Gast'}`);
        onStartGame(debugRole);
    };

    return (
        <div className="online-connection">
            <h2>Multiplayer (Online)</h2>

            <div className="host-section">
                <p>Deine Verbindungs-ID:</p>
                <div className="connection-id">{connectionId}</div>
                <button
                    id="copy-btn"
                    onClick={copyRoomIdToClipboard}
                    className="button copy-btn"
                >
                    Kopieren
                </button>
                <div className={`waiting-message pulse`}>Warte auf Verbindung...</div>
            </div>

            <div className="join-section">
                <p>Gib die Verbindungs-ID deines Gegners ein:</p>
                <input
                    type="text"
                    ref={connectionInputRef}
                    placeholder="Verbindungs-ID"
                    disabled={isConnecting}
                    className="connection-input"
                />
                <button
                    onClick={connectToRoom}
                    disabled={isConnecting}
                    className="button connect-btn"
                >
                    {isConnecting ? 'Verbinde...' : 'Verbinden'}
                </button>
            </div>

            {error && (
                <div className="error-message">{error}</div>
            )}

            {/* Debug-Button, kann für die Produktion auskommentiert werden */}
            {process.env.NODE_ENV === 'development' && (
                <button
                    onClick={startTestMode}
                    className="button debug-btn"
                    style={{
                        marginTop: '15px',
                        backgroundColor: '#8d8d8d',
                        fontSize: '12px',
                        padding: '5px 10px'
                    }}
                >
                    Test-Modus
                </button>
            )}

            <button onClick={onBack} className="button back-btn">Zurück</button>
        </div>
    );
};

export default OnlineConnectionScreen;