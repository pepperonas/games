import * as express from 'express';
import * as http from 'http';
import {Server} from 'socket.io';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
import {v4 as uuidv4} from 'uuid';
import {RoomManager} from './models/RoomManager';
import {Player} from './models/Player';

// Simplified console logging
const log = {
    info: (message: string) => {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
    }
};

// Load environment variables
dotenv.config();

// Create Express app
const app = express.default();
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(cors.default({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io server
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    path: '/games/brain-buster/api/socket.io/',
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['polling', 'websocket']
});

// Initialize room manager
const roomManager = new RoomManager();

// Root endpoint
app.get('/', (req, res) => {
    log.info('Root endpoint accessed');
    res.status(200).json({
        message: 'BrainBuster Multiplayer API is running',
        socketPath: '/games/brain-buster/api/socket.io/',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    log.info('Health check endpoint accessed');
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        socketIoVersion: '4.7.5',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        pid: process.pid
    });
});

// Socket.io connection handler
io.on('connection', (socket) => {
    log.info(`New connection: ${socket.id}`);
    log.info(`Connection details: 
        User Agent: ${socket.handshake.headers['user-agent']}
        Transport: ${socket.conn.transport.name}
        IP: ${socket.handshake.address}
    `);

    // Send immediate acknowledgment to client
    socket.emit('connection_established', {
        socketId: socket.id,
        message: 'Connection established successfully',
        timestamp: new Date().toISOString()
    });

    // Simple ping test handler
    socket.on('ping_test', (data) => {
        log.info(`Received ping from client: ${socket.id}`);
        socket.emit('pong_test', {
            receivedAt: Date.now(),
            originalTime: data.time,
            socketId: socket.id
        });
    });

    // Join room handler
    socket.on('join_room', ({roomId, playerName, isHost}) => {
        try {
            log.info(`Player ${playerName} joining room ${roomId}`);

            // Create player object
            const player = new Player(uuidv4(), socket.id, playerName, isHost);

            // Check if room exists, create if not
            if (!roomManager.roomExists(roomId)) {
                if (!isHost) {
                    socket.emit('error', {message: 'Room does not exist'});
                    return;
                }
                roomManager.createRoom(roomId);
            }

            // Add player to room
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', {message: 'Error joining room'});
                return;
            }

            room.addPlayer(player);

            // Join socket room
            socket.join(roomId);

            // Notify player joined successfully
            socket.emit('room_joined', {
                roomId,
                playerId: player.getId(),
                isHost
            });

            // Notify all players in room about the updated player list
            io.to(roomId).emit('player_list_updated', {
                players: room.getPlayerList()
            });
        } catch (error) {
            log.error(`Error in join_room handler`, error);
            socket.emit('error', {
                message: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});

// Global error handlers
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection', {reason, promise});
});

// Start the server
server.listen(PORT, () => {
    log.info(`Server running on port ${PORT}`);
    log.info(`Process ID: ${process.pid}`);
    log.info(`Environment: ${process.env.NODE_ENV}`);
});

// Export for potential testing
module.exports = {app, server, io};