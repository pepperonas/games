// components/OnlineConnectionScreen.jsx
import React, {useEffect, useRef, useState} from 'react';
import './OnlineConnectionScreen.css';
import { socketManager } from '../socket-connection';

const OnlineConnectionScreen = ({onStartGame, onBack}) => {
    const [connectionId, setConnectionId] = useState('Wird generiert...');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');
    const [isWaiting, setIsWaiting] = useState(false);
    const connectionInputRef = useRef(null);
    const socketRef = useRef(null);
    const firstConnectRef = useRef(true);

    useEffect(() => {
        console.log('OnlineConnectionScreen wird initialisiert');
        let mounted = true;

        // Socket über den socketManager abrufen
        try {
            socketRef.current = socketManager.getSocket();
            socketManager.logStatus();

            // Event-Handler für Socket.io
            socketRef.current.on('connect', () => {
                if (!mounted) return;
                console.log('Mit Signaling-Server verbunden, Socket ID:', socketRef.current.id);

                // Nur beim ersten Verbinden automatisch einen Raum erstellen
                if (firstConnectRef.current) {
                    firstConnectRef.current = false;
                    console.log('Erstelle neuen Raum (automatisch)');
                    socketRef.current.emit('createRoom');
                }
            });

            socketRef.current.on('roomCreated', ({roomId}) => {
                if (!mounted) return;
                console.log('Raum wurde erstellt:', roomId);
                setConnectionId(roomId);
                socketManager.setRoomId(roomId);
                setIsWaiting(true);
            });

            socketRef.current.on('gameReady', () => {
                // Spiel ist bereit, aber wir warten auf die Rollenzuweisung
                if (!mounted) return;
                console.log('Spiel ist bereit!');
            });

            socketRef.current.on('playerRole', ({isHost}) => {
                if (!mounted) return;
                console.log('Spielerrolle zugewiesen:', isHost ? 'Host' : 'Gast');

                // Speichere die Host-Rolle im socketManager
                socketManager.setIsHost(isHost);

                // Stelle sicher, dass die Verbindung hergestellt wurde, bevor wir weitergehen
                setTimeout(() => {
                    if (mounted) {
                        setIsConnecting(false);
                        setIsWaiting(false);
                        onStartGame(isHost);
                    }
                }, 500);
            });

            socketRef.current.on('error', ({message}) => {
                if (!mounted) return;
                console.error('Server-Fehler:', message);
                setError(message);
                setIsConnecting(false);
                setIsWaiting(false);
            });

            // Verbindungsprobleme behandeln
            socketRef.current.on('connect_error', (err) => {
                if (!mounted) return;
                console.error('Verbindungsfehler:', err);
                setError('Verbindungsfehler: Bitte prüfe deine Internetverbindung.');
                setIsConnecting(false);
            });

            socketRef.current.on('disconnect', (reason) => {
                if (!mounted) return;
                console.log('Verbindung zum Server getrennt:', reason);
                setError(`Verbindung zum Server unterbrochen: ${reason}`);
                setIsConnecting(false);
                setIsWaiting(false);
            });

        } catch (err) {
            console.error('Fehler beim Initialisieren der Socket.io-Verbindung:', err);
            if (mounted) {
                setError('Fehler beim Verbinden mit dem Server. Bitte versuche es später erneut.');
            }
        }

        return () => {
            // Aufräumen beim Unmount
            mounted = false;
            console.log('OnlineConnectionScreen wird aufgeräumt');

            // WICHTIG: Socket-Verbindung NICHT trennen, nur Event-Listener entfernen
            if (socketRef.current) {
                console.log('Socket-Event-Listener werden entfernt');
                // Entferne alle Screen-spezifischen Event-Listener
                socketRef.current.off('roomCreated');
                socketRef.current.off('gameReady');
                socketRef.current.off('playerRole');
                socketRef.current.off('error');
            }
        };
    }, [onStartGame]);

    const copyRoomIdToClipboard = () => {
        if (connectionId === 'Wird generiert...') return;

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
                setError('Kopieren nicht möglich. Bitte die ID manuell kopieren.');
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

        // Versuche dem Raum beizutreten
        console.log('Versuche Raum beizutreten:', roomId);

        if (!socketRef.current || !socketRef.current.connected) {
            setError('Nicht mit dem Server verbunden. Bitte Seite neu laden.');
            setIsConnecting(false);
            return;
        }

        // Speichere die Raum-ID im socketManager
        socketManager.setRoomId(roomId);
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
                    disabled={connectionId === 'Wird generiert...'}
                >
                    Kopieren
                </button>
                {isWaiting && (
                    <div className="waiting-message pulse">Warte auf Verbindung...</div>
                )}
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

            <button
                onClick={onBack}
                className="button back-btn"
                disabled={isConnecting}
            >
                Zurück
            </button>
        </div>
    );
};

export default OnlineConnectionScreen;