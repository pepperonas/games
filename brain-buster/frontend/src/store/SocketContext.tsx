import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(() => {
        // Disconnect existing socket if any
        if (socket) {
            socket.disconnect();
        }

        // Create socket connection
        const newSocket = io(window.location.origin, {
            path: '/games/brain-buster/api/socket.io/',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        // Connection event handlers
        const handleConnect = () => {
            console.log('Connected to Socket.io server with ID:', newSocket.id);
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            console.log('Disconnected from Socket.io server');
            setIsConnected(false);
        };

        const handleConnectError = (error: Error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        };

        // Attach event listeners
        newSocket.on('connect', handleConnect);
        newSocket.on('disconnect', handleDisconnect);
        newSocket.on('connect_error', handleConnectError);

        // Connection establishment acknowledgment
        newSocket.on('connection_established', (data) => {
            console.log('Connection established:', data);
        });

        // Ping test handler
        newSocket.on('pong_test', (data) => {
            const latency = Date.now() - data.originalTime;
            console.log(`Connection latency: ${latency}ms`);
        });

        // Debug logging for events
        newSocket.onAny((event, ...args) => {
            if (event !== 'ping' && event !== 'pong') {
                console.log(`Socket event: ${event}`, args);
            }
        });

        // Update socket state
        setSocket(newSocket);

        // Return cleanup function
        return () => {
            newSocket.off('connect', handleConnect);
            newSocket.off('disconnect', handleDisconnect);
            newSocket.off('connect_error', handleConnectError);
            newSocket.disconnect();
        };
    }, []);

    const disconnect = useCallback(() => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    }, [socket]);

    // Auto-connect on mount
    useEffect(() => {
        const cleanup = connect();

        // Cleanup on unmount
        return cleanup;
    }, [connect]);

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