import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    const connect = useCallback(() => {
        // Limit connection attempts to prevent browser freezing
        if (connectionAttempts > 3) {
            console.warn("Maximum connection attempts reached. Please refresh the page to try again.");
            return;
        }

        // Disconnect existing socket if any
        if (socket) {
            console.log("Disconnecting existing socket before creating a new one");
            socket.disconnect();
        }

        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const socketUrl = `${window.location.protocol}//${window.location.hostname}`;

        console.log(`Connecting to socket.io at: ${socketUrl} (attempt ${connectionAttempts + 1})`);

        try {
            const newSocket = io(socketUrl, {
                path: '/games/brain-buster/api/socket.io/',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 2,
                reconnectionDelay: 2000,
                timeout: 5000,
                query: {
                    t: timestamp.toString() // Add timestamp to query to prevent caching
                },
                forceNew: true // Force a new connection
            });

            // Connection event handlers with detailed logging
            const handleConnect = () => {
                console.log('Successfully connected to Socket.io server with ID:', newSocket.id);
                setIsConnected(true);
                setConnectionAttempts(0); // Reset attempts on success
            };

            const handleDisconnect = (reason: string) => {
                console.log('Disconnected from Socket.io server, reason:', reason);
                setIsConnected(false);

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

                if (connectionAttempts >= 3) {
                    console.warn("Maximum connection attempts reached. Please refresh the page to try again.");
                    newSocket.disconnect();
                }
            };

            // Attach event listeners
            newSocket.on('connect', handleConnect);
            newSocket.on('disconnect', handleDisconnect);
            newSocket.on('connect_error', handleConnectError);
            newSocket.on('error', (error) => {
                console.error('Socket general error:', error);
            });

            // Handle reconnect attempts
            newSocket.io.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Reconnection attempt ${attemptNumber}`);
            });

            newSocket.io.on('reconnect_error', (error) => {
                console.error('Reconnection error:', error);
            });

            newSocket.io.on('reconnect_failed', () => {
                console.error('Failed to reconnect. Maximum attempts reached.');
            });

            // Debug logging for events (limit to important events only)
            const importantEvents = ['room_joined', 'player_list_updated', 'game_started', 'error'];
            newSocket.onAny((event, ...args) => {
                if (importantEvents.includes(event)) {
                    console.log(`Socket event received: ${event}`, args);
                }
            });

            // Update socket state
            setSocket(newSocket);

            return newSocket;
        } catch (e) {
            console.error("Socket initialization error:", e);
            setConnectionAttempts(prev => prev + 1);
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
        }
    }, [socket]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (socket) {
                console.log("Component unmounting, cleaning up socket connection");
                socket.disconnect();
            }
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
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