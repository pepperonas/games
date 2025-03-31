import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from 'react';
import {io, Socket} from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const isConnectingRef = useRef(false);

    const connect = useCallback(() => {
        // Prevent duplicate connection attempts
        if (isConnectingRef.current) {
            console.log("Already attempting to connect, ignoring duplicate request");
            return;
        }

        // Don't try to connect if already connected
        if (socket?.connected) {
            console.log("Already connected, no need to reconnect");
            setIsConnected(true);
            return;
        }

        // Limit connection attempts to prevent browser freezing
        if (connectionAttempts > 5) {
            console.warn("Maximum connection attempts reached. Please refresh the page to try again.");
            return;
        }

        // Set connecting flag
        isConnectingRef.current = true;

        // Disconnect existing socket if any
        if (socket) {
            console.log("Disconnecting existing socket before creating a new one");
            socket.disconnect();
        }

        // Use origin directly for better reliability
        const socketUrl = window.location.origin;
        console.log(`Connecting to socket.io at: ${socketUrl} (attempt ${connectionAttempts + 1})`);

        try {
            const newSocket = io(socketUrl, {
                path: '/games/brain-buster/api/socket.io/', // Make sure this matches Nginx proxy_pass path
                transports: ['websocket', 'polling'], // Enable both for better compatibility
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
                timeout: 10000,
                query: {
                    t: Date.now().toString() // Prevent caching
                },
                forceNew: true
            });

            // Enhanced connection event handlers
            const handleConnect = () => {
                console.log('Successfully connected to Socket.io server with ID:', newSocket.id);
                if (newSocket.io.engine && newSocket.io.engine.transport) {
                    console.log('Transport type:', newSocket.io.engine.transport.name);
                }
                setIsConnected(true);
                setConnectionAttempts(0); // Reset attempts on success
                isConnectingRef.current = false; // Reset connecting flag
            };

            const handleDisconnect = (reason: string) => {
                console.log('Disconnected from Socket.io server, reason:', reason);
                setIsConnected(false);
                isConnectingRef.current = false; // Reset connecting flag

                // If the server closes the connection, don't attempt to reconnect
                if (reason === 'io server disconnect') {
                    console.log('The server has forcibly closed the connection');
                    newSocket.disconnect();
                }
            };

            const handleConnectError = (error: Error) => {
                console.error('Socket connection error:', error.message);
                setIsConnected(false);
                setConnectionAttempts(prev => prev + 1);
                isConnectingRef.current = false; // Reset connecting flag
            };

            // Attach event listeners
            newSocket.on('connect', handleConnect);
            newSocket.on('disconnect', handleDisconnect);
            newSocket.on('connect_error', handleConnectError);
            newSocket.on('error', (error) => {
                console.error('Socket general error:', error);
                isConnectingRef.current = false; // Reset connecting flag
            });

            // Add connection timeout handler
            newSocket.on('connect_timeout', () => {
                console.error('Socket connection timeout');
                isConnectingRef.current = false; // Reset connecting flag
            });

            // Handle reconnect attempts with better logging
            newSocket.io.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Reconnection attempt ${attemptNumber}`);
            });

            newSocket.io.on('reconnect_error', (error) => {
                console.error('Reconnection error:', error);
                isConnectingRef.current = false; // Reset connecting flag
            });

            newSocket.io.on('reconnect_failed', () => {
                console.error('Failed to reconnect. Maximum attempts reached.');
                isConnectingRef.current = false; // Reset connecting flag
            });

            newSocket.io.on('reconnect', (attemptNumber) => {
                console.log(`Successfully reconnected after ${attemptNumber} attempts`);
            });

            // Log pong responses
            newSocket.on('pong_test', (data) => {
                const latency = Date.now() - data.originalTime;
                console.log(`Received pong from server. Latency: ${latency}ms`);
            });

            // Update socket state
            setSocket(newSocket);

            return newSocket;
        } catch (e) {
            console.error("Socket initialization error:", e);
            setConnectionAttempts(prev => prev + 1);
            isConnectingRef.current = false; // Reset connecting flag
            return null;
        }
    }, [socket, connectionAttempts]);

    const disconnect = useCallback(() => {
        if (socket) {
            console.log("Manually disconnecting socket");
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
            setConnectionAttempts(0);
            isConnectingRef.current = false;
        }
    }, [socket]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (socket) {
                console.log("Component unmounting, cleaning up socket connection");
                socket.disconnect();
                isConnectingRef.current = false;
            }
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={{socket, isConnected, connect, disconnect}}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};