// components/PongDebug.jsx
import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const PongDebug = ({ onBack }) => {
    const [logs, setLogs] = useState([]);
    const [roomId, setRoomId] = useState('');
    const [testRoomId, setTestRoomId] = useState('');
    const [connectState, setConnectState] = useState('disconnected');

    // Refs für Socket und PeerConnection
    const socketRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);
    const isHostRef = useRef(false);

    const addLog = (message) => {
        console.log(message);
        setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message
        }]);
    };

    // Aufräumfunktion
    const cleanup = () => {
        if (dataChannelRef.current) {
            try {
                dataChannelRef.current.close();
            } catch (e) {
                addLog(`Fehler beim Schließen des Datenkanals: ${e.message}`);
            }
            dataChannelRef.current = null;
        }

        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (e) {
                addLog(`Fehler beim Schließen der PeerConnection: ${e.message}`);
            }
            peerConnectionRef.current = null;
        }

        if (socketRef.current) {
            try {
                socketRef.current.disconnect();
            } catch (e) {
                addLog(`Fehler beim Trennen des Sockets: ${e.message}`);
            }
            socketRef.current = null;
        }

        setConnectState('disconnected');
    };

    // Aufräumen beim Unmount
    useEffect(() => {
        return cleanup;
    }, []);

    const connectToServer = () => {
        // Zuerst aufräumen, falls noch alte Verbindungen bestehen
        cleanup();

        addLog('Verbinde mit Signaling-Server...');

        try {
            socketRef.current = io('https://mrx3k1.de', {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });

            socketRef.current.on('connect', () => {
                addLog(`Verbunden! Socket ID: ${socketRef.current.id}`);
                setConnectState('connected');
            });

            socketRef.current.on('roomCreated', ({roomId}) => {
                addLog(`Raum erstellt: ${roomId}`);
                setRoomId(roomId);
            });

            socketRef.current.on('gameReady', (data) => {
                addLog(`Spiel bereit! ${JSON.stringify(data)}`);
            });

            socketRef.current.on('playerRole', ({isHost}) => {
                addLog(`Rolle zugewiesen: ${isHost ? 'Host' : 'Gast'}`);
                isHostRef.current = isHost;
                initPeerConnection();
            });

            socketRef.current.on('offer', async (data) => {
                addLog(`SDP-Angebot empfangen`);

                if (!peerConnectionRef.current) {
                    addLog('PeerConnection nicht bereit, initialisiere...');
                    await initPeerConnection();
                }

                try {
                    addLog('Setze Remote Description...');
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));

                    addLog('Erstelle SDP-Antwort...');
                    const answer = await peerConnectionRef.current.createAnswer();

                    addLog('Setze Local Description...');
                    await peerConnectionRef.current.setLocalDescription(answer);

                    addLog('Sende SDP-Antwort...');
                    if (socketRef.current && socketRef.current.connected) {
                        socketRef.current.emit('answer', peerConnectionRef.current.localDescription);
                    } else {
                        addLog('⚠️ Socket nicht verbunden - Antwort konnte nicht gesendet werden');
                    }
                } catch (error) {
                    addLog(`FEHLER beim Verarbeiten des Angebots: ${error.message}`);
                }
            });

            socketRef.current.on('answer', async (data) => {
                addLog(`SDP-Antwort empfangen`);

                if (peerConnectionRef.current) {
                    try {
                        addLog('Setze Remote Description aus Antwort...');
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
                    } catch (error) {
                        addLog(`FEHLER beim Verarbeiten der Antwort: ${error.message}`);
                    }
                } else {
                    addLog('PeerConnection nicht initialisiert!');
                }
            });

            socketRef.current.on('iceCandidate', async (data) => {
                addLog(`ICE-Kandidat empfangen`);

                if (peerConnectionRef.current) {
                    try {
                        addLog('Füge ICE-Kandidat hinzu...');
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data));
                    } catch (error) {
                        addLog(`FEHLER beim Hinzufügen des ICE-Kandidaten: ${error.message}`);
                    }
                } else {
                    addLog('PeerConnection nicht initialisiert!');
                }
            });

            socketRef.current.on('error', ({message}) => {
                addLog(`SERVER-FEHLER: ${message}`);
            });

            socketRef.current.on('disconnect', (reason) => {
                addLog(`Verbindung getrennt: ${reason}`);
                setConnectState('disconnected');
            });
        } catch (error) {
            addLog(`FEHLER beim Initialisieren der Socket.io-Verbindung: ${error.message}`);
        }
    };

    const initPeerConnection = async () => {
        try {
            addLog(`Initialisiere PeerConnection als ${isHostRef.current ? 'Host' : 'Gast'}...`);

            // Bestehende Verbindung aufräumen
            if (peerConnectionRef.current) {
                addLog('Schließe bestehende PeerConnection...');
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }

            // ICE-Server-Konfiguration
            const configuration = {
                iceServers: [
                    {urls: 'stun:stun.l.google.com:19302'},
                    {urls: 'stun:stun1.l.google.com:19302'},
                    {urls: 'stun:stun2.l.google.com:19302'}
                ]
            };

            // Neue PeerConnection erstellen
            peerConnectionRef.current = new RTCPeerConnection(configuration);

            // Event-Handler einrichten
            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    addLog(`Neuer ICE-Kandidat gefunden`);

                    // Überprüfen, ob Socket existiert und verbunden ist
                    if (socketRef.current && socketRef.current.connected) {
                        socketRef.current.emit('iceCandidate', event.candidate);
                    } else {
                        addLog('⚠️ Socket nicht verbunden - ICE-Kandidat konnte nicht gesendet werden');
                    }
                } else {
                    addLog('ICE-Kandidatensammlung abgeschlossen');
                }
            };

            peerConnectionRef.current.oniceconnectionstatechange = () => {
                const state = peerConnectionRef.current.iceConnectionState;
                addLog(`ICE-Verbindungsstatus: ${state}`);
            };

            peerConnectionRef.current.onconnectionstatechange = () => {
                const state = peerConnectionRef.current.connectionState;
                addLog(`Verbindungsstatus: ${state}`);
            };

            // Datenkanal einrichten
            if (isHostRef.current) {
                addLog('Erstelle Datenkanal als Host...');
                dataChannelRef.current = peerConnectionRef.current.createDataChannel('gameData');

                setupDataChannel(dataChannelRef.current);

                // Als Host SDP-Angebot erstellen
                addLog('Erstelle SDP-Angebot...');
                const offer = await peerConnectionRef.current.createOffer();

                addLog('Setze lokale Beschreibung...');
                await peerConnectionRef.current.setLocalDescription(offer);

                addLog('Sende SDP-Angebot...');
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('offer', peerConnectionRef.current.localDescription);
                } else {
                    addLog('⚠️ Socket nicht verbunden - Angebot konnte nicht gesendet werden');
                }
            } else {
                addLog('Warte auf Datenkanal vom Host...');
                peerConnectionRef.current.ondatachannel = (event) => {
                    addLog('Datenkanal empfangen');
                    dataChannelRef.current = event.channel;
                    setupDataChannel(dataChannelRef.current);
                };
            }
        } catch (error) {
            addLog(`FEHLER beim Initialisieren der PeerConnection: ${error.message}`);
            peerConnectionRef.current = null;
        }
    };

    const setupDataChannel = (channel) => {
        if (!channel) {
            addLog('⚠️ Kein Datenkanal zum Einrichten vorhanden');
            return;
        }

        addLog(`Richte Datenkanal ein: ${channel.label}, Status: ${channel.readyState}`);

        channel.onopen = () => {
            addLog('Datenkanal geöffnet!');

            // Testnachricht senden
            try {
                channel.send(JSON.stringify({
                    type: 'debug-message',
                    message: 'Hallo, dies ist eine Test-Nachricht!',
                    timestamp: Date.now()
                }));
            } catch (e) {
                addLog(`Fehler beim Senden der Testnachricht: ${e.message}`);
            }
        };

        channel.onclose = () => {
            addLog('Datenkanal geschlossen');
        };

        channel.onerror = (error) => {
            addLog(`Datenkanal-Fehler: ${error.message || 'Unbekannter Fehler'}`);
        };

        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                addLog(`Nachricht empfangen: ${JSON.stringify(data)}`);
            } catch (error) {
                addLog(`Fehler beim Verarbeiten der Nachricht: ${error.message}`);
            }
        };
    };

    const createRoom = () => {
        if (!socketRef.current || !socketRef.current.connected) {
            addLog('Nicht mit dem Server verbunden!');
            return;
        }

        addLog('Erstelle neuen Raum...');
        socketRef.current.emit('createRoom');
    };

    const joinRoom = () => {
        if (!socketRef.current || !socketRef.current.connected) {
            addLog('Nicht mit dem Server verbunden!');
            return;
        }

        if (!testRoomId) {
            addLog('Bitte Raum-ID eingeben!');
            return;
        }

        addLog(`Versuche Raum beizutreten: ${testRoomId}`);
        socketRef.current.emit('joinRoom', { roomId: testRoomId });
    };

    const disconnect = () => {
        addLog('Trenne alle Verbindungen...');
        cleanup();
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Pong WebRTC Debug</h1>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={connectToServer}
                    disabled={connectState === 'connected'}
                    style={{ padding: '8px 16px', marginRight: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Mit Server verbinden
                </button>

                <button
                    onClick={createRoom}
                    disabled={connectState !== 'connected'}
                    style={{ padding: '8px 16px', marginRight: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Raum erstellen
                </button>

                <button
                    onClick={disconnect}
                    disabled={connectState !== 'connected'}
                    style={{ padding: '8px 16px', marginRight: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Trennen
                </button>

                <button
                    onClick={onBack}
                    style={{ padding: '8px 16px', backgroundColor: '#607D8B', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Zurück
                </button>
            </div>

            {roomId && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                    <h3>Deine Raum-ID: {roomId}</h3>
                    <p>Teile diese ID mit deinem Gegner, damit er beitreten kann.</p>
                </div>
            )}

            <div style={{ marginBottom: '20px', display: 'flex' }}>
                <input
                    type="text"
                    value={testRoomId}
                    onChange={e => setTestRoomId(e.target.value.toUpperCase())}
                    placeholder="Raum-ID eingeben"
                    style={{ padding: '8px', marginRight: '10px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button
                    onClick={joinRoom}
                    disabled={connectState !== 'connected'}
                    style={{ padding: '8px 16px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Raum beitreten
                </button>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '10px', height: '400px', overflowY: 'auto', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <h3>Debug-Log:</h3>
                {logs.map((entry, index) => (
                    <div key={index} style={{ marginBottom: '5px', fontSize: '14px', fontFamily: 'monospace' }}>
                        <span style={{ color: '#888' }}>[{entry.time}]</span> {entry.message}
                    </div>
                ))}
                {logs.length === 0 && <p style={{ color: '#888', fontStyle: 'italic' }}>Keine Logs vorhanden</p>}
            </div>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
                <p>Verbindungsstatus: {connectState}</p>
                <p>WebRTC-Status: {peerConnectionRef.current ? peerConnectionRef.current.connectionState : 'nicht initialisiert'}</p>
            </div>
        </div>
    );
};

export default PongDebug;