const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const {v4: uuidv4} = require('uuid');
const path = require('path');
require('dotenv').config();

// Sample questions (you can replace these with your own question database)
const sampleQuestions = require('./questions');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    path: '/socket.io',
});

// Game rooms
const rooms = {};

// Game constants
const ROUND_TRANSITION_TIME = 3000; // 3 seconds between rounds
const TIME_PER_QUESTION = 20; // 20 seconds per question

// Reset timer for inactive rooms (30 minutes)
const ROOM_TIMEOUT = 30 * 60 * 1000;

// Socket.io connection
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a new game room
    socket.on('create_room', ({name}) => {
        console.log(`Raumerstellung angefordert von: ${name}, Socket ID: ${socket.id}`);

        const roomId = uuidv4().substring(0, 6).toUpperCase(); // Generate shorter room ID

        rooms[roomId] = {
            id: roomId,
            host: {
                id: socket.id,
                name: name || 'Host',
                score: 0,
                answers: [],
            },
            guest: null,
            status: 'waiting', // waiting, playing, finished
            questions: [],
            currentRound: 0,
            timer: null,
            timeRemaining: TIME_PER_QUESTION,
            lastActivity: Date.now(),
        };

        socket.join(roomId);
        socket.emit('room_created', {roomId});

        console.log(`Room created: ${roomId} by ${name}`);

        // Set room timeout
        setTimeout(() => checkRoomActivity(roomId), ROOM_TIMEOUT);
    });

    // Join an existing room
    socket.on('join_room', ({roomId, name}) => {
        const room = rooms[roomId];

        if (!room) {
            socket.emit('error', {message: 'Dieser Raum existiert nicht.'});
            return;
        }

        if (room.status !== 'waiting') {
            socket.emit('error', {message: 'Das Spiel hat bereits begonnen.'});
            return;
        }

        if (room.guest) {
            socket.emit('error', {message: 'Dieser Raum ist bereits voll.'});
            return;
        }

        // Join the room
        room.guest = {
            id: socket.id,
            name: name || 'Gast',
            score: 0,
            answers: [],
        };

        room.lastActivity = Date.now();
        socket.join(roomId);

        // Notify the guest they joined successfully
        socket.emit('joined_room', {
            roomId,
            hostName: room.host.name
        });

        // Notify the host that someone joined
        io.to(room.host.id).emit('player_joined', {
            name: room.guest.name
        });

        console.log(`Player ${name} joined room ${roomId}`);
    });

    // Start the game
    socket.on('start_game', ({roomId}) => {
        const room = rooms[roomId];

        if (!room) return;
        if (socket.id !== room.host.id) return;
        if (!room.guest) return;

        // Prepare questions for the game
        room.questions = getRandomQuestions(10);
        room.status = 'playing';
        room.currentRound = 0;
        room.lastActivity = Date.now();

        // Reset scores
        room.host.score = 0;
        room.guest.score = 0;
        room.host.answers = [];
        room.guest.answers = [];

        // Start the game
        io.to(roomId).emit('game_start', {
            questions: room.questions
        });

        // Start the timer for the first question
        startRoundTimer(roomId);

        console.log(`Game started in room ${roomId}`);
    });

    // Submit an answer
    socket.on('submit_answer', ({roomId, answer, round}) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;

        const isHost = socket.id === room.host.id;
        const player = isHost ? room.host : room.guest;

        // Store the answer
        player.answers[round] = answer;
        room.lastActivity = Date.now();

        // Notify others that player answered
        socket.to(roomId).emit('player_answered');

        // Check if both players answered
        const hostAnswered = room.host.answers[round] !== undefined;
        const guestAnswered = room.guest.answers[round] !== undefined;

        if (hostAnswered && guestAnswered) {
            // Calculate scores
            const question = room.questions[round];

            if (room.host.answers[round] === question.correctAnswer) {
                room.host.score += 1;
            }

            if (room.guest.answers[round] === question.correctAnswer) {
                room.guest.score += 1;
            }

            // Clear timer
            if (room.timer) {
                clearTimeout(room.timer);
                room.timer = null;
            }

            // Check if this was the last round
            if (round === room.questions.length - 1) {
                endGame(roomId);
            } else {
                // Prepare for next round
                completeRound(roomId);
            }
        }
    });

    // Next round (host only)
    socket.on('next_round', ({roomId}) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;
        if (socket.id !== room.host.id) return;

        // Move to next round if not already moved
        if (room.currentRound === room.questions.length - 1) {
            endGame(roomId);
        } else {
            completeRound(roomId);
        }
    });

    // Leave room
    socket.on('leave_room', ({roomId}) => {
        leaveRoom(socket, roomId);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        // Find and clean up any rooms the user was in
        for (const roomId in rooms) {
            const room = rooms[roomId];

            if (room.host && room.host.id === socket.id) {
                // Host left, notify guest and close the room
                if (room.guest) {
                    io.to(room.guest.id).emit('opponent_left');
                }

                deleteRoom(roomId);
            } else if (room.guest && room.guest.id === socket.id) {
                // Guest left, notify host
                io.to(room.host.id).emit('opponent_left');
                room.guest = null;
                room.status = 'waiting';

                // Clear timer if game was in progress
                if (room.timer) {
                    clearTimeout(room.timer);
                    room.timer = null;
                }
            }
        }
    });
});

// Helper functions
function getRandomQuestions(count) {
    // Shuffle and select random questions
    return sampleQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
}

function startRoundTimer(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.timeRemaining = TIME_PER_QUESTION;

    // Send initial timer value
    io.to(roomId).emit('timer_update', {
        timeRemaining: room.timeRemaining
    });

    // Set interval for countdown
    const interval = setInterval(() => {
        room.timeRemaining -= 1;

        // Send timer updates
        io.to(roomId).emit('timer_update', {
            timeRemaining: room.timeRemaining
        });

        if (room.timeRemaining <= 0) {
            clearInterval(interval);

            // Handle time up - calculate scores for current question
            const currentRound = room.currentRound;
            const question = room.questions[currentRound];

            // Auto-submit for players who didn't answer (-1 indicates timeout)
            if (room.host.answers[currentRound] === undefined) {
                room.host.answers[currentRound] = -1;
            }

            if (room.guest.answers[currentRound] === undefined) {
                room.guest.answers[currentRound] = -1;
            }

            // Calculate scores
            if (room.host.answers[currentRound] === question.correctAnswer) {
                room.host.score += 1;
            }

            if (room.guest.answers[currentRound] === question.correctAnswer) {
                room.guest.score += 1;
            }

            // Check if this was the last round
            if (currentRound === room.questions.length - 1) {
                endGame(roomId);
            } else {
                completeRound(roomId);
            }
        }
    }, 1000);

    // Store the interval
    room.timer = interval;
}

function completeRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Clear timer if it exists
    if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
    }

    // Notify players of round completion
    io.to(roomId).emit('round_complete', {
        playerScore: room.host.score,
        opponentScore: room.guest.score,
        nextRound: room.currentRound + 1,
        timeToNextRound: ROUND_TRANSITION_TIME
    });

    // Move to next round after delay
    setTimeout(() => {
        if (!rooms[roomId]) return; // Room may have been deleted

        room.currentRound += 1;
        startRoundTimer(roomId);
    }, ROUND_TRANSITION_TIME);
}

function endGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.status = 'finished';

    // Clear timer if it exists
    if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
    }

    // Notify players of game completion
    io.to(roomId).emit('game_over', {
        playerScore: room.host.score,
        opponentScore: room.guest.score
    });

    console.log(`Game ended in room ${roomId}`);
}

function leaveRoom(socket, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.host && room.host.id === socket.id) {
        // Host is leaving
        if (room.guest) {
            io.to(room.guest.id).emit('opponent_left');
        }

        deleteRoom(roomId);
    } else if (room.guest && room.guest.id === socket.id) {
        // Guest is leaving
        io.to(room.host.id).emit('opponent_left');
        room.guest = null;
        room.status = 'waiting';

        // Clear timer if game was in progress
        if (room.timer) {
            clearTimeout(room.timer);
            room.timer = null;
        }
    }

    socket.leave(roomId);
}

function deleteRoom(roomId) {
    // Clear timer if it exists
    if (rooms[roomId] && rooms[roomId].timer) {
        clearTimeout(rooms[roomId].timer);
    }

    // Delete the room
    delete rooms[roomId];
    console.log(`Room deleted: ${roomId}`);
}

function checkRoomActivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Check if room has been inactive
    const inactiveTime = Date.now() - room.lastActivity;

    if (inactiveTime >= ROOM_TIMEOUT) {
        console.log(`Room ${roomId} timed out due to inactivity`);

        // Notify players if any are still connected
        if (room.host) {
            io.to(room.host.id).emit('error', {
                message: 'Dieses Spiel wurde wegen Inaktivität beendet.'
            });
        }

        if (room.guest) {
            io.to(room.guest.id).emit('error', {
                message: 'Dieses Spiel wurde wegen Inaktivität beendet.'
            });
        }

        deleteRoom(roomId);
    } else {
        // Check again later
        setTimeout(() => checkRoomActivity(roomId), ROOM_TIMEOUT - inactiveTime);
    }
}

// Start the server
const PORT = process.env.PORT || 4999;
server.listen(PORT, () => {
    console.log(`Multiplayer server running on port ${PORT}`);
});