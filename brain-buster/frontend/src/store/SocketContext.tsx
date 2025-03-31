import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

    const connect = () => {
        // Get the current host from the window location
        const host = window.location.hostname;
        // Use the same protocol as the current page (http or https)
        const protocol = window.location.protocol;

        // Create the WebSocket URL
        const socketUrl = `${protocol}//${host}`;
        const socketPath = '/games/brain-buster/api/socket.io';

        console.log("Connecting to Socket.io server at:", socketUrl, "with path:", socketPath);

        const newSocket = io(socketUrl, {
            path: socketPath,
            transports: ['polling', 'websocket'],  // Try polling first, then websocket
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            forceNew: true,
            timeout: 20000,
            query: { clientTime: Date.now() }  // Add a timestamp for debugging
        });

        // Log every event for debugging
        newSocket.onAny((event, ...args) => {
            console.log(`Socket event: ${event}`, args);
        });

        // Listen for the immediate acknowledgment
        newSocket.on('connection_established', (data) => {
            console.log('Connection established with server:', data);
            setIsConnected(true);
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to Socket.io server with ID:', newSocket.id);

            // Send a simple ping to test the connection
            newSocket.emit('ping_test', { time: Date.now() });
        });

        newSocket.on('pong_test', (data) => {
            console.log('Received pong from server:', data);
            const latency = Date.now() - data.originalTime;
            console.log(`Connection latency: ${latency}ms`);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from Socket.io server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        });

        newSocket.io.on("reconnect_attempt", (attempt) => {
            console.log(`Socket.io reconnection attempt ${attempt}`);
        });

        newSocket.io.on("reconnect_failed", () => {
            console.error("Socket.io reconnection failed");
        });

        newSocket.io.on("reconnect", (attempt) => {
            console.log(`Socket.io reconnected after ${attempt} attempts`);
            setIsConnected(true);
        });

        // Handle server errors
        newSocket.on('error', (error) => {
            console.error('Server error:', error);
        });

        setSocket(newSocket);
    };

    const disconnect = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    };

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [socket]);

    // Automatically attempt to reconnect if the connection is lost
    useEffect(() => {
        if (socket && !isConnected) {
            const reconnectTimer = setTimeout(() => {
                console.log('Attempting to reconnect...');
                disconnect();
                connect();
            }, 5000);

            return () => clearTimeout(reconnectTimer);
        }
    }, [socket, isConnected]);

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