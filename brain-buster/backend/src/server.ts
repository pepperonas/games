import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import {v4 as uuidv4} from 'uuid';
import {RoomManager} from './models/RoomManager';
import {Player} from './models/Player';
import {Question} from './types';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io server with CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    // Use the same path that is configured in Nginx
    path: '/socket.io'
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
        time: new Date().toISOString(),
        env: {
            node_env: process.env.NODE_ENV,
            cors_origin: process.env.CORS_ORIGIN
        }
    });
});

// Socket.io info endpoint for debugging
app.get('/socket-info', (req, res) => {
    res.status(200).json({
        activeConnections: io.engine.clientsCount,
        serverTime: new Date().toISOString(),
        socketEnabled: true,
        socketPath: io.path(),
        rooms: roomManager.getRoomCount()
    });
});

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Generate a unique player ID
    const playerId = uuidv4();

    // Socket.io test ping/pong for connection checking
    socket.on('ping_test', (data) => {
        console.log(`Received ping from client ${socket.id} with timestamp ${data?.time || 'unknown'}`);
        socket.emit('pong_test', {
            originalTime: data?.time || Date.now(),
            serverTime: Date.now(),
            message: 'Connection successful'
        });
    });

    // Join room handler
    socket.on('join_room', ({roomId, playerName, isHost}) => {
        console.log(`Player ${playerName} joining room ${roomId}`);

        // Create player object
        const player = new Player(playerId, socket.id, playerName, isHost);

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
            playerId,
            isHost
        });

        // Notify all players in room about the updated player list
        io.to(roomId).emit('player_list_updated', {
            players: room.getPlayerList()
        });
    });

    // Player ready state change handler
    socket.on('player_ready', ({roomId, playerId, isReady}) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        room.setPlayerReady(playerId, isReady);

        // Notify all players in room about the updated player list
        io.to(roomId).emit('player_list_updated', {
            players: room.getPlayerList()
        });
    });

    // Prepare game handler - simplified initialization
    socket.on('prepare_game', ({roomId, questionCount}) => {
        console.log(`Preparing game in room ${roomId} for ${questionCount} questions`);

        const room = roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        // Check if all players are ready
        if (!room.allPlayersReady()) {
            socket.emit('error', {message: 'Not all players are ready'});
            return;
        }

        // Just send a preparation signal to all clients
        io.to(roomId).emit('game_preparing', {
            roomId,
            questionCount,
            timestamp: Date.now()
        });
    });

    // Start game handler (host only)
    socket.on('start_game', ({roomId, questions}: {roomId: string, questions: Question[]}) => {
        console.log(`Attempting to start game in room ${roomId} with ${questions?.length || 0} questions`);

        const room = roomManager.getRoom(roomId);
        if (!room) {
            console.error(`Room ${roomId} not found when starting game`);
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        // Check if all players are ready
        if (!room.allPlayersReady()) {
            console.error(`Not all players are ready in room ${roomId}`);
            socket.emit('error', {message: 'Not all players are ready'});
            return;
        }

        // Verify we have questions
        if (!questions || questions.length === 0) {
            console.error(`No questions provided for room ${roomId}`);
            socket.emit('error', {message: 'No questions provided'});
            return;
        }

        try {
            // Simplify questions to reduce payload size
            const simplifiedQuestions = questions.map((q: Question, i: number) => ({
                id: `q-${i}`,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                category: q.category || 'General',
                difficulty: q.difficulty || 'medium'
            }));

            // Log question content for debugging
            console.log(`Prepared ${simplifiedQuestions.length} questions for game in room ${roomId}`);

            // First notify all players with a preparation message
            io.to(roomId).emit('game_preparing', {
                roomId,
                questionCount: simplifiedQuestions.length,
                timestamp: Date.now()
            });

            // Short delay before starting the game to ensure clients are ready
            setTimeout(() => {
                // Start the game
                room.startGame(simplifiedQuestions);
                console.log(`Game started in room ${roomId} with ${simplifiedQuestions.length} questions`);

                // Send game_started to all players at once
                io.to(roomId).emit('game_started', {
                    questions: simplifiedQuestions,
                    players: room.getPlayerList(),
                    startTime: Date.now() + 1000 // slight delay to ensure clients are ready
                });

                // Then individually to ensure reliable delivery
                const socketsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
                let clientIndex = 0;

                // Process each client with a small delay between them
                for (const socketId of socketsInRoom) {
                    clientIndex++;
                    // Use setTimeout with increasing delays for each client to prevent network congestion
                    setTimeout(() => {
                        try {
                            const clientSocket = io.sockets.sockets.get(socketId);
                            if (clientSocket) {
                                console.log(`Sending individual game_started to client ${clientIndex} (${socketId.substring(0, 6)}...)`);
                                clientSocket.emit('game_started', {
                                    questions: simplifiedQuestions,
                                    players: room.getPlayerList(),
                                    startTime: Date.now() + 1500, // Additional delay for client processing
                                    reliable: true // Flag to indicate this is the reliable individual transmission
                                });
                            }
                        } catch (error) {
                            console.error(`Error sending to client ${socketId}:`, error);
                        }
                    }, 300 * clientIndex); // Stagger the sends by 300ms per client
                }
            }, 1000); // Wait 1 second before starting game

        } catch (error) {
            console.error(`Error starting game in room ${roomId}:`, error);
            socket.emit('error', {message: 'Failed to process questions'});
        }
    });

    // Check game status handler - helps clients reconnect to game state
    socket.on('check_game_status', ({roomId, playerId}) => {
        console.log(`Checking game status for room ${roomId}, player ${playerId}`);

        const room = roomManager.getRoom(roomId);
        if (!room) {
            console.error(`Room ${roomId} not found for status check`);
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        // Get questions from the room
        const questions = room.getQuestions();

        // Check if a game is in progress
        if (questions && questions.length > 0) {
            console.log(`Found active game in room ${roomId} with ${questions.length} questions`);

            // Send the game_started event directly to this client
            socket.emit('game_started', {
                questions: questions,
                players: room.getPlayerList(),
                startTime: Date.now(),
                isReconnect: true
            });
        } else {
            socket.emit('error', {message: 'No active game found'});
        }
    });

    // Add debug request handler
    socket.on('debug_request', (data) => {
        console.log('Debug request received:', data);

        // Respond with server state
        const room = roomManager.getRoom(data.roomId);

        if (room) {
            const debugResponse = {
                roomExists: true,
                playerCount: room.getPlayerList().length,
                gameStarted: room.getQuestions().length > 0,
                questionCount: room.getQuestions().length,
                serverTime: new Date().toISOString()
            };

            socket.emit('debug_response', debugResponse);
        } else {
            socket.emit('debug_response', {
                roomExists: false,
                serverTime: new Date().toISOString()
            });
        }
    });

    // Answer question handler
    socket.on('answer_question', ({roomId, playerId, questionIndex, answer}) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        const player = room.getPlayer(playerId);
        if (!player) {
            socket.emit('error', {message: 'Player not found'});
            return;
        }

        // Record player's answer
        const isCorrect = room.recordAnswer(playerId, questionIndex, answer);

        // Broadcast to all players in the room
        io.to(roomId).emit('player_answered', {
            playerId,
            playerName: player.getName(),
            questionIndex,
            isCorrect,
            newScore: player.getScore(),
            allPlayers: room.getPlayerList() // Send full player list
        });

        // Check if all players have answered
        if (room.allPlayersAnswered(questionIndex)) {
            io.to(roomId).emit('all_players_answered', {
                questionIndex,
                playerScores: room.getPlayerScores(),
                allPlayers: room.getPlayerList() // Send full player list
            });

            // WICHTIGE ÄNDERUNG: Wenn das die letzte Frage war, automatisch das Spiel beenden
            if (questionIndex >= room.getQuestions().length - 1) {
                console.log(`Last question answered in room ${roomId}, ending game automatically`);
                // End the game automatically after a short delay
                setTimeout(() => {
                    io.to(roomId).emit('game_ended', {
                        results: room.calculateResults()
                    });
                    room.endGame();
                }, 2000);
            }
        }
    });

    // Next question handler
    socket.on('next_question', ({roomId, questionIndex}) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        console.log(`Attempting to move to next question in room ${roomId}, current index: ${questionIndex}`);

        // Ensure questions exist and index is valid
        if (!room.getQuestions() || questionIndex + 1 >= room.getQuestions().length) {
            console.log(`Invalid question index or no more questions`);

            // If no more questions, end the game
            io.to(roomId).emit('game_ended', {
                results: room.calculateResults()
            });
            return;
        }

        // Reset answers for the next question
        room.resetAnswersForQuestion(questionIndex + 1);

        // Broadcast to all players in the room
        io.to(roomId).emit('move_to_next_question', {
            nextQuestionIndex: questionIndex + 1,
            allPlayers: room.getPlayerList()
        });
    });

    // End game handler
    socket.on('end_game', ({roomId}) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('error', {message: 'Room not found'});
            return;
        }

        // Calculate results
        const results = room.calculateResults();

        // Notify all players about the final results
        io.to(roomId).emit('game_ended', {
            results: {
                ...results,
                allPlayers: room.getPlayerList() // Send full player list
            }
        });

        // Mark the game as ended
        room.endGame();
    });

    // Leave room handler
    socket.on('leave_room', ({roomId, playerId}) => {
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
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        console.log(`Connection disconnected: ${socket.id}`);

        // Find player by socket ID
        const {room, player} = roomManager.findPlayerBySocketId(socket.id);
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

                // WICHTIGE ERGÄNZUNG: Prüfe, ob alle verbliebenen Spieler die aktuelle Frage beantwortet haben
                const questions = room.getQuestions();
                const currentQuestionIndex = Math.min(questions.length - 1, 0); // Standardmäßig erste oder letzte Frage

                if (room.allPlayersAnswered(currentQuestionIndex)) {
                    // Wenn alle verbliebenen Spieler die aktuelle Frage beantwortet haben,
                    // sende entsprechendes Event, damit das Spiel nicht hängen bleibt
                    io.to(room.getId()).emit('all_players_answered', {
                        questionIndex: currentQuestionIndex,
                        playerScores: room.getPlayerScores(),
                        allPlayers: room.getPlayerList()
                    });
                }
            }
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});