require('dotenv').config();
const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const Chat = require('./models/Chat');
const TrustScore = require('./models/TrustScore');
const User = require('./models/User');

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tips', require('./routes/tips'));
app.use('/api/assistant', require('./routes/assistant'));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

const conversationId = (a, b) => [a, b].sort().join('_');
const online = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  if (userId) online.set(userId, socket.id);

  socket.on('chat:message', async (payload) => {
    const { receiverId, content, isFromShop } = payload;
    if (!receiverId || !content) return;
    const senderId = socket.handshake.auth?.userId;
    if (!senderId) return;
    try {
      const cid = conversationId(senderId, receiverId);
      const doc = await Chat.create({
        conversationId: cid,
        senderId,
        receiverId,
        content: String(content).trim().slice(0, 2000),
        isFromShop: !!isFromShop
      });
      const receiverSocketId = online.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat:message', {
          _id: doc._id,
          conversationId: cid,
          senderId,
          receiverId,
          content: doc.content,
          isFromShop: doc.isFromShop,
          createdAt: doc.createdAt
        });
      }
      socket.emit('chat:sent', { _id: doc._id, createdAt: doc.createdAt });
    } catch (e) {
      socket.emit('chat:error', { message: 'Failed to send message.' });
    }
  });

  socket.on('disconnect', () => {
    if (userId) online.delete(userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Neem Sourcing server running on http://localhost:${PORT}`));
