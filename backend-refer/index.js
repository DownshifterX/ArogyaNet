require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const rateLimiter = require('./Middlewares/rateLimiter');

// initialize DB (Models/db.js connects using MONGODB_URI)
require('./Models/db');

const authRoutes = require('./Routes/auth');
const userRoutes = require('./Routes/users');
const appointmentRoutes = require('./Routes/appointments');
const videoRoutes = require('./Routes/video');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 8090;

// Basic security and parsing
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/video', videoRoutes);

app.get('/ping', (req, res) => res.send('pong'));
app.get('/', (req, res) => res.send('API is running'));

// --- SOCKET.IO ---
// Simple in-memory map. For production use Redis if you scale to multiple nodes.
const onlineUsers = new Map(); // userId => socketId

io.on('connection', (socket) => {
    // expect the client to emit `identify` with their userId after connecting
    socket.on('identify', (userId) => {
        if (!userId) return;
        onlineUsers.set(userId.toString(), socket.id);
        io.emit('presence', { userId, online: true });
    });

    socket.on('signal', ({ toUserId, payload }) => {
        const targetSocket = onlineUsers.get(String(toUserId));
        if (targetSocket) io.to(targetSocket).emit('signal', payload);
    });

    socket.on('notify', ({ toUserId, notification }) => {
        const targetSocket = onlineUsers.get(String(toUserId));
        if (targetSocket) io.to(targetSocket).emit('notification', notification);
    });

    socket.on('disconnect', () => {
        for (const [userId, sId] of onlineUsers) {
            if (sId === socket.id) {
                onlineUsers.delete(userId);
                io.emit('presence', { userId, online: false });
                break;
            }
        }
    });
});

// Attach io to app for controllers that want to emit events
app.set('io', io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));