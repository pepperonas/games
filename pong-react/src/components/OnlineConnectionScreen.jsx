// components/OnlineConnectionScreen.jsx
import React, {useEffect, useRef, useState} from 'react';
import io from 'socket.io-client';
import './OnlineConnectionScreen.css';

const SIGNALING_SERVER = 'https://mrx3k1.de';

const OnlineConnectionScreen = ({onStartGame, onBack}) => {
    const [connectionId, setConnectionId] = useState('Wird generiert...');
    const [isConnecting, setIsConnecting] = useState(false);
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
            // Raum erstellen
            socketRef.current.emit('createRoom');
        });

        socketRef.current.on('roomCreated', ({roomId}) => {
            setConnectionId(roomId);
        });

        socketRef.current.on('gameReady', () => {
            // Spiel kann beginnen
            console.log('Spiel ist bereit!');
        });

        socketRef.current.on('playerRole', ({isHost}) => {
            // Starte das Spiel mit der zugewiesenen Rolle
            onStartGame(isHost);
        });

        socketRef.current.on('error', ({message}) => {
            setError(message);
            setIsConnecting(false);
        });

        return () => {
            // Aufräumen beim Unmount
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [onStartGame]);

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
        setError('');

        // Einem Raum beitreten
        socketRef.current.emit('joinRoom', {roomId});
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

            <button onClick={onBack} className="button back-btn">Zurück</button>
        </div>
    );
};

export default OnlineConnectionScreen;