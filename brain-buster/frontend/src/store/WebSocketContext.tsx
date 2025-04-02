// src/store/WebSocketContext.tsx
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from 'react';

interface WebSocketContextType {
    socket: WebSocket | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
    sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const isConnectingRef = useRef(false);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Verbindung herstellen
    const connect = useCallback(() => {
        // Verhindere doppelte Verbindungsversuche
        if (isConnectingRef.current) {
            console.log("Bereits beim Verbinden, ignoriere doppelte Anfrage");
            return;
        }

        // Keine neue Verbindung, wenn bereits verbunden
        if (socket?.readyState === WebSocket.OPEN) {
            console.log("Bereits verbunden, keine erneute Verbindung nötig");
            setIsConnected(true);
            return;
        }

        // Begrenze Verbindungsversuche
        if (connectionAttempts > 5) {
            console.warn("Maximale Anzahl von Verbindungsversuchen erreicht. Bitte Seite neu laden.");
            return;
        }

        // Setze verbindungs-Flag
        isConnectingRef.current = true;

        // Bestehende Verbindung schließen, falls vorhanden
        if (socket) {
            console.log("Schließe bestehende Verbindung vor dem Erstellen einer neuen");
            socket.close();
        }

        // WebSocket-URL basierend auf der aktuellen Domain
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}/games/brain-buster/api/socket.io/`;

        console.log(`Verbinde mit WebSocket: ${socketUrl} (Versuch ${connectionAttempts + 1})`);

        try {
            const newSocket = new WebSocket(socketUrl);

            // WebSocket Event-Handler
            newSocket.onopen = () => {
                console.log('Erfolgreich mit WebSocket-Server verbunden');
                setIsConnected(true);
                setConnectionAttempts(0); // Reset bei Erfolg
                isConnectingRef.current = false; // Reset connecting flag

                // Starte Ping-Intervall um Verbindung aufrechtzuerhalten
                startPingInterval(newSocket);
            };

            newSocket.onclose = (event) => {
                console.log(`WebSocket-Verbindung geschlossen: Code ${event.code}, Grund: ${event.reason || 'unbekannt'}`);
                setIsConnected(false);
                isConnectingRef.current = false;

                // Stoppe Ping-Intervall
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                // Versuche Wiederverbindung, wenn nicht absichtlich geschlossen
                if (event.code !== 1000) {
                    attemptReconnect();
                }
            };

            newSocket.onerror = (error) => {
                console.error('WebSocket-Fehler:', error);
                setIsConnected(false);
                setConnectionAttempts(prev => prev + 1);
                isConnectingRef.current = false;
            };

            newSocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // Hier könnten spezifische Nachrichtentypen verarbeitet werden

                    // Pong-Nachrichten vom Server
                    if (message.type === 'pong') {
                        console.log('Pong vom Server erhalten');
                    }
                } catch (error) {
                    console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
                }
            };

            // Socket-Zustand aktualisieren
            setSocket(newSocket);

            return newSocket;
        } catch (e) {
            console.error("Fehler bei WebSocket-Initialisierung:", e);
            setConnectionAttempts(prev => prev + 1);
            isConnectingRef.current = false;
            return null;
        }
    }, [socket, connectionAttempts]);

    // WebSocket-Verbindung schließen
    const disconnect = useCallback(() => {
        if (socket) {
            console.log("Trenne WebSocket-Verbindung manuell");
            socket.close(1000, "Beabsichtigte Trennung"); // Code 1000 = normale Schließung
            setSocket(null);
            setIsConnected(false);
            setConnectionAttempts(0);
            isConnectingRef.current = false;

            // Alle Timeouts und Intervalle löschen
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
        }
    }, [socket]);

    // Nachricht über WebSocket senden
    const sendMessage = useCallback((message: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                const messageStr = typeof message === 'string'
                    ? message
                    : JSON.stringify(message);
                socket.send(messageStr);
            } catch (error) {
                console.error('Fehler beim Senden der WebSocket-Nachricht:', error);
            }
        } else {
            console.warn('Kann Nachricht nicht senden: WebSocket nicht verbunden');
        }
    }, [socket]);

    // Wiederverbindungsversuch mit exponentieller Verzögerung
    const attemptReconnect = useCallback(() => {
        // Verhindere mehrere gleichzeitige Wiederverbindungsversuche
        if (reconnectTimeoutRef.current) {
            return;
        }

        // Prüfe, ob maximale Anzahl von Versuchen erreicht ist
        if (connectionAttempts >= 5) {
            console.error('Maximale Anzahl von Wiederverbindungsversuchen erreicht');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Exponentielles Back-off
        console.log(`Versuche Wiederverbindung in ${delay / 1000} Sekunden...`);

        reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
        }, delay);
    }, [connect, connectionAttempts]);

    // Starte Ping-Intervall zur Aufrechterhaltung der Verbindung
    const startPingInterval = useCallback((ws: WebSocket) => {
        // Bestehenden Intervall löschen
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }

        // Sende alle 30 Sekunden Ping an den Server
        pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({
                        type: 'ping',
                        timestamp: Date.now()
                    }));
                    console.log('Ping an Server gesendet');
                } catch (error) {
                    console.error('Fehler beim Senden des Pings:', error);
                }
            } else {
                // Ping-Intervall stoppen, wenn Socket nicht mehr offen ist
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
            }
        }, 30000); // Alle 30 Sekunden
    }, []);

    // Automatische Verbindung beim Start
    useEffect(() => {
        // Initialer Verbindungsversuch
        connect();

        // Aufräumen beim Unmount
        return () => {
            if (socket) {
                console.log("Komponente wird unmounted, WebSocket-Verbindung wird geschlossen");
                socket.close();
            }

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [connect, socket]);

    return (
        <WebSocketContext.Provider value={{socket, isConnected, connect, disconnect, sendMessage}}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = (): WebSocketContextType => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket muss innerhalb eines WebSocketProviders verwendet werden');
    }
    return context;
};