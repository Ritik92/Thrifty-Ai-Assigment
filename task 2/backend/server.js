const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv =require("dotenv");
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
dotenv.config();

// In-memory storage for messages and users
let messages = [];
let connectedUsers = new Map(); // userId -> socketId
let messageId = 1;

// Enhanced sentiment analysis using Gemini API
async function analyzeSentimentWithGemini(text) {
  const GEMINI_API_KEY=process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.log('Gemini API key not found, using fallback analysis');
    return fallbackSentimentAnalysis(text);
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze the sentiment and mood of this message: "${text}". 
            Respond with ONLY a JSON object in this exact format:
            {"sentiment": "positive/negative/neutral", "mood": "happy/sad/angry/excited/calm/confused/etc", "confidence": 0.85, "emotions": ["joy", "excitement"]}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100
        }
      })
    });

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        sentiment: analysis.sentiment || 'neutral',
        mood: analysis.mood || 'calm',
        confidence: analysis.confidence || 0.5,
        emotions: analysis.emotions || []
      };
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.log('Gemini API error, using fallback:', error.message);
    return fallbackSentimentAnalysis(text);
  }
}

// Fallback sentiment analysis
function fallbackSentimentAnalysis(text) {
  const positiveWords = ['happy', 'love', 'great', 'awesome', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'joy', 'excited'];
  const negativeWords = ['sad', 'angry', 'bad', 'hate', 'terrible', 'awful', 'horrible', 'disappointed', 'frustrated', 'upset'];
  const excitedWords = ['wow', 'omg', 'excited', 'amazing', 'incredible'];
  
  const words = text.toLowerCase().split(/\s+/);
  const hasExclamation = text.includes('!');
  const hasQuestions = text.includes('?');
  
  let positiveCount = 0;
  let negativeCount = 0;
  let excitedCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
    if (excitedWords.includes(word)) excitedCount++;
  });
  
  let sentiment = 'neutral';
  let mood = 'calm';
  let emotions = [];
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    mood = excitedCount > 0 || hasExclamation ? 'excited' : 'happy';
    emotions = ['joy'];
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    mood = 'sad';
    emotions = ['sadness'];
  } else if (hasQuestions) {
    mood = 'curious';
    emotions = ['curiosity'];
  }
  
  return {
    sentiment,
    mood,
    confidence: 0.6,
    emotions
  };
}

// POST /message endpoint
app.post('/message', async (req, res) => {
  const { userId, text } = req.body;
  
  if (!userId || !text) {
    return res.status(400).json({ error: 'userId and text are required' });
  }
  
  const message = {
    id: messageId++,
    userId,
    text,
    sentiment: 'pending',
    mood: 'analyzing',
    confidence: 0,
    emotions: [],
    timestamp: new Date(),
    wordCount: text.split(/\s+/).length,
    hasEmoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(text)
  };
  
  messages.push(message);
  
  // Broadcast message immediately with pending sentiment
  io.emit('newMessage', message);
  
  // Update user activity
  io.emit('userActivity', {
    userId,
    action: 'sent_message',
    timestamp: new Date()
  });
  
  // Simulate asynchronous sentiment analysis (2-4 seconds delay)
  const delay = 2000 + Math.random() * 2000;
  setTimeout(async () => {
    try {
      const analysis = await analyzeSentimentWithGemini(text);
      
      // Update message in storage
      const messageIndex = messages.findIndex(m => m.id === message.id);
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...analysis };
        
        // Emit sentiment update to all clients
        io.emit('sentimentUpdate', {
          messageId: message.id,
          ...analysis
        });
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      // Fallback to basic analysis
      const fallback = fallbackSentimentAnalysis(text);
      const messageIndex = messages.findIndex(m => m.id === message.id);
      if (messageIndex !== -1) {
        messages[messageIndex] = { ...messages[messageIndex], ...fallback };
        io.emit('sentimentUpdate', {
          messageId: message.id,
          ...fallback
        });
      }
    }
  }, delay);
  
  res.json({ success: true, messageId: message.id });
});

// Get all messages
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Get chat statistics
app.get('/stats', (req, res) => {
  const stats = {
    totalMessages: messages.length,
    activeUsers: connectedUsers.size,
    sentimentBreakdown: {
      positive: messages.filter(m => m.sentiment === 'positive').length,
      negative: messages.filter(m => m.sentiment === 'negative').length,
      neutral: messages.filter(m => m.sentiment === 'neutral').length,
      pending: messages.filter(m => m.sentiment === 'pending').length
    },
    averageWordsPerMessage: messages.length > 0 
      ? Math.round(messages.reduce((sum, m) => sum + (m.wordCount || 0), 0) / messages.length)
      : 0,
    messagesWithEmoji: messages.filter(m => m.hasEmoji).length
  };
  res.json(stats);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('userJoined', (userData) => {
    connectedUsers.set(userData.userId, socket.id);
    socket.userId = userData.userId;
    
    // Send existing messages to new client
    socket.emit('allMessages', messages);
    
    // Broadcast user joined
    socket.broadcast.emit('userJoined', {
      userId: userData.userId,
      timestamp: new Date()
    });
    
    // Send updated user count
    io.emit('userCount', connectedUsers.size);
  });
  
  socket.on('typing', (data) => {
    socket.broadcast.emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // Broadcast user left
      socket.broadcast.emit('userLeft', {
        userId: socket.userId,
        timestamp: new Date()
      });
      
      // Send updated user count
      io.emit('userCount', connectedUsers.size);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Enhanced Chat Server running on port ${PORT}`);
  console.log('Set GEMINI_API_KEY environment variable for AI sentiment analysis');
});