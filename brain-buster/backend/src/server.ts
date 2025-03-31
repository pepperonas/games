import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './models/RoomManager';
import { Player } from './models/Player';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io server with improved connection settings
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    path: '/socket.io',
    pingTimeout: 60000,     // Increase ping timeout to 60 seconds
    pingInterval: 25000,    // Ping every 25 seconds
    connectTimeout: 45000,  // Connection timeout
    transports: ['polling', 'websocket']
});

// Initialize room manager
const roomManager = new RoomManager();

// Root endpoint - for testing connection
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'BrainBuster Multiplayer API is running',
        socketPath: '/socket.io',
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        socketIoVersion: require('socket.io/package.json').version
    });
});

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Log connection details
    console.log(`User agent: ${socket.handshake.headers['user-agent']}`);
    console.log(`Transport: ${socket.conn.transport.name}`);
    console.log(`IP: ${socket.handshake.address}`);

    // Send immediate acknowledgment to client
    socket.emit('connection_established', {
        socketId: socket.id,
        message: 'Connection established successfully'
    });

    // Simple ping test handler
    socket.on('ping_test', (data) => {
        console.log(`Received ping from client: ${socket.id}`, data);
        socket.emit('pong_test', {
            receivedAt: Date.now(),
            originalTime: data.time
        });
    });

    // Generate a unique player ID
    const playerId = uuidv4();

    // Join room handler
    socket.on('join_room', ({ roomId, playerName, isHost }) => {
        try {
            console.log(`Player ${playerName} joining room ${roomId}`);

            // Create player object
            const player = new Player(playerId, socket.id, playerName, isHost);

            // Check if room exists, create if not
            if (!roomManager.roomExists(roomId)) {
                if (!isHost) {
                    // If player is not host but room doesn't exist, error
                    socket.emit('error', { message: 'Room does not exist' });
                    return;
                }
                roomManager.createRoom(roomId);
            }

            // Add player to room
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Error joining room' });
                return;
            }

            room.addPlayer(player);

            // Join socket room
            socket.join(roomId);

            // Notify player joined successfully
            socket.emit('room_joined', {
                roomId,
                playerId,
                isHost
            });

            // Notify all players in room about the updated player list
            io.to(roomId).emit('player_list_updated', {
                players: room.getPlayerList()
            });
        } catch (error) {
            console.error(`Error in join_room handler: ${error}`);
            socket.emit('error', { message: 'Internal server error' });
        }
    });

    // Player ready state change handler
    socket.on('player_ready', ({ roomId, playerId, isReady }) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            room.setPlayerReady(playerId, isReady);

            // Notify all players in room about the updated player list
            io.to(roomId).emit('player_list_updated', {
                players: room.getPlayerList()
            });
        } catch (error) {
            console.error(`Error in player_ready handler: ${error}`);
            socket.emit('error', { message: 'Internal server error' });
        }
    });

    // Start game handler (host only)
    socket.on('start_game', ({ roomId, questions }) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            // Check if all players are ready
            if (!room.allPlayersReady()) {
                socket.emit('error', { message: 'Not all players are ready' });
                return;
            }

            // Start the game
            room.startGame(questions);

            // Notify all players that the game has started
            io.to(roomId).emit('game_started', {
                questions: room.getQuestions()
            });
        } catch (error) {
            console.error(`Error in start_game handler: ${error}`);
            socket.emit('error', { message: 'Internal server error' });
        }
    });

    // Answer question handler
    socket.on('answer_question', ({ roomId, playerId, questionIndex, answer }) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            // Record player's answer
            const isCorrect = room.recordAnswer(playerId, questionIndex, answer);
            const player = room.getPlayer(playerId);

            if (!player) {
                socket.emit('error', { message: 'Player not found' });
                return;
            }

            // Update player's score
            const newScore = player.getScore();

            // Notify all players about the answer
            io.to(roomId).emit('player_answered', {
                playerId,
                playerName: player.getName(),
                questionIndex,
                isCorrect,
                newScore
            });

            // Check if all players have answered
            if (room.allPlayersAnswered(questionIndex)) {
                io.to(roomId).emit('all_players_answered', {
                    questionIndex,
                    playerScores: room.getPlayerScores()
                });
            }
        } catch (error) {
            console.error(`Error in answer_question handler: ${error}`);
            socket.emit('error', { message: 'Internal server error' });
        }
    });

    // Next question handler
    socket.on('next_question', ({ roomId, questionIndex }) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            // Reset answers for the next question
            room.resetAnswersForQuestion(questionIndex + 1);

            // Notify all players to move to the next question
            io.to(roomId).emit('move_to_next_question', {
                nextQuestionIndex: questionIndex + 1
            });
        } catch (error) {
            console.error(`Error in next_question handler: ${error}`);
            socket.emit('error', { message: 'Internal server error' });
        }
    });

    // End game handler
    socket.on('end_game', ({ roomId }) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            // Calculate results
            const results = room.calculateResults();

            // Notify all players about the final results
            io.to(roomId).emit('game_ended', {
                results
            });

            // Mark the game as ended
            room.endGame();
        } catch (error) {
            console.error(`Error in end_game handler: ${error}`);
            socket.emit('error', { message: 'Internal server error' });
        }
    });

    // Leave room handler
    socket.on('leave_room', ({ roomId, playerId }) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) return;

            // Remove player from room
            room.removePlayer(playerId);

            // Leave socket room
            socket.leave(roomId);

            // If room is empty, remove it
            if (room.isEmpty()) {
                roomManager.removeRoom(roomId);
            } else {
                // If the host left, assign a new host
                if (room.needsNewHost()) {
                    room.assignNewHost();
                }

                // Notify remaining players about the updated player list
                io.to(roomId).emit('player_list_updated', {
                    players: room.getPlayerList()
                });
            }
        } catch (error) {
            console.error(`Error in leave_room handler: ${error}`);
        }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
        try {
            console.log(`Connection disconnected: ${socket.id}, reason: ${reason}`);

            // Find player by socket ID
            const { room, player } = roomManager.findPlayerBySocketId(socket.id);

            if (room && player) {
                // Remove player from room
                room.removePlayer(player.getId());

                // If room is empty, remove it
                if (room.isEmpty()) {
                    roomManager.removeRoom(room.getId());
                } else {
                    // If the host left, assign a new host
                    if (room.needsNewHost()) {
                        room.assignNewHost();
                    }

                    // Notify remaining players about the updated player list
                    io.to(room.getId()).emit('player_list_updated', {
                        players: room.getPlayerList()
                    });
                }
            }
        } catch (error) {
            console.error(`Error in disconnect handler: ${error}`);
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io version: ${require('socket.io/package.json').version}`);
});