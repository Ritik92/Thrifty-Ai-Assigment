const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// In-memory storage for messages
let messages = [];
let messageId = 1;

// Sentiment analysis function
function analyzeSentiment(text) {
  const positiveWords = ['happy', 'love', 'great', 'awesome', 'good', 'excellent'];
  const negativeWords = ['sad', 'angry', 'bad', 'hate', 'terrible', 'awful'];
  
  const words = text.toLowerCase().split(' ');
  
  for (const word of words) {
    if (positiveWords.includes(word)) return 'positive';
    if (negativeWords.includes(word)) return 'negative';
  }
  
  return 'neutral';
}

// POST /message endpoint
app.post('/message', (req, res) => {
  const { userId, text } = req.body;
  
  if (!userId || !text) {
    return res.status(400).json({ error: 'userId and text are required' });
  }
  
  const message = {
    id: messageId++,
    userId,
    text,
    sentiment: 'pending',
    timestamp: new Date()
  };
  
  messages.push(message);
  
  // Broadcast message immediately with pending sentiment
  io.emit('newMessage', message);
  
  // Simulate asynchronous sentiment analysis (3 seconds delay)
  setTimeout(() => {
    const sentiment = analyzeSentiment(text);
    
    // Update message in storage
    const messageIndex = messages.findIndex(m => m.id === message.id);
    if (messageIndex !== -1) {
      messages[messageIndex].sentiment = sentiment;
      
      // Emit sentiment update to all clients
      io.emit('sentimentUpdate', {
        messageId: message.id,
        sentiment: sentiment
      });
    }
  }, 3000);
  
  res.json({ success: true, messageId: message.id });
});

// Get all messages
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send existing messages to new client
  socket.emit('allMessages', messages);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});