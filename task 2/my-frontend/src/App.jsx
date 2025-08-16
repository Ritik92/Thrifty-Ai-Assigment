import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('#007bff');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6610f2', '#e83e8c', '#fd7e14'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for all existing messages
    socket.on('allMessages', (allMessages) => {
      setMessages(allMessages);
    });

    // Listen for new messages
    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for sentiment updates
    socket.on('sentimentUpdate', ({ messageId, sentiment, mood, confidence, emotions }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, sentiment, mood, confidence, emotions }
            : msg
        )
      );
    });

    // Listen for user events
    socket.on('userJoined', (userData) => {
      // You could show a notification here
    });

    socket.on('userLeft', (userData) => {
      // You could show a notification here
    });

    socket.on('userCount', (count) => {
      setUserCount(count);
    });

    socket.on('userTyping', ({ userId, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.includes(userId) ? prev : [...prev, userId];
        } else {
          return prev.filter(user => user !== userId);
        }
      });
    });

    return () => {
      socket.off('allMessages');
      socket.off('newMessage');
      socket.off('sentimentUpdate');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userCount');
      socket.off('userTyping');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      socket.emit('userJoined', { userId: userName });
      setJoined(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await fetch('http://localhost:3001/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userName,
          text: newMessage,
        }),
      });

      setNewMessage('');
      setIsTyping(false);
      socket.emit('typing', { userId: userName, isTyping: false });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { userId: userName, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { userId: userName, isTyping: false });
    }, 1000);
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#28a745';
      case 'negative': return '#dc3545';
      case 'neutral': return '#6c757d';
      default: return '#ffc107';
    }
  };

  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      happy: '😊',
      excited: '🤩',
      sad: '😢',
      angry: '😠',
      calm: '😌',
      curious: '🤔',
      confused: '😕',
      analyzing: '🔄'
    };
    return moodEmojis[mood] || '😐';
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/stats');
      const data = await response.json();
      setStats(data);
      setShowStats(true);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h2>🚀 Join Global Chat</h2>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
            <div className="color-picker">
              <p>Pick your color:</p>
              <div className="colors">
                {colors.map(color => (
                  <div
                    key={color}
                    className={`color-option ${userColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setUserColor(color)}
                  />
                ))}
              </div>
            </div>
            <button type="submit">Join Chat 💬</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-left">
          <h2>💬 Global Chat</h2>
          <span className="user-info">Welcome, <strong style={{color: userColor}}>{userName}</strong>!</span>
        </div>
        <div className="header-right">
          <span className="user-count">👥 {userCount} online</span>
          <button onClick={fetchStats} className="stats-btn">📊 Stats</button>
        </div>
      </div>

      {showStats && stats && (
        <div className="stats-overlay" onClick={() => setShowStats(false)}>
          <div className="stats-modal" onClick={e => e.stopPropagation()}>
            <h3>📊 Chat Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{stats.totalMessages}</span>
                <span className="stat-label">Total Messages</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.activeUsers}</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.averageWordsPerMessage}</span>
                <span className="stat-label">Avg Words/Message</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.messagesWithEmoji}</span>
                <span className="stat-label">Messages with Emoji</span>
              </div>
            </div>
            <div className="sentiment-breakdown">
              <h4>Sentiment Breakdown</h4>
              <div className="sentiment-bars">
                <div className="sentiment-bar">
                  <span>😊 Positive: {stats.sentimentBreakdown.positive}</span>
                  <div className="bar positive" style={{width: `${(stats.sentimentBreakdown.positive / stats.totalMessages) * 100}%`}}></div>
                </div>
                <div className="sentiment-bar">
                  <span>😐 Neutral: {stats.sentimentBreakdown.neutral}</span>
                  <div className="bar neutral" style={{width: `${(stats.sentimentBreakdown.neutral / stats.totalMessages) * 100}%`}}></div>
                </div>
                <div className="sentiment-bar">
                  <span>😢 Negative: {stats.sentimentBreakdown.negative}</span>
                  <div className="bar negative" style={{width: `${(stats.sentimentBreakdown.negative / stats.totalMessages) * 100}%`}}></div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowStats(false)} className="close-stats">Close</button>
          </div>
        </div>
      )}
      
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.userId === userName ? 'own-message' : ''}`}>
            <div className="message-header">
              <strong style={{color: message.userId === userName ? userColor : '#007bff'}}>
                {message.userId}
              </strong>
              <span className="timestamp">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            <div className="message-text">{message.text}</div>
            <div className="message-footer">
              <div 
                className="sentiment-info"
                style={{ color: getSentimentColor(message.sentiment) }}
              >
                <span className="mood-emoji">{getMoodEmoji(message.mood)}</span>
                <span className="sentiment-text">
                  {message.sentiment === 'pending' ? 'Analyzing...' : 
                   `${message.sentiment} (${message.mood})`}
                </span>
                {message.confidence > 0 && (
                  <span className="confidence">
                    {Math.round(message.confidence * 100)}% sure
                  </span>
                )}
              </div>
              <div className="message-meta">
                {message.wordCount && (
                  <span className="word-count">{message.wordCount} words</span>
                )}
                {message.hasEmoji && <span className="emoji-indicator">📝</span>}
              </div>
            </div>
            {message.emotions && message.emotions.length > 0 && (
              <div className="emotions">
                Emotions: {message.emotions.join(', ')}
              </div>
            )}
          </div>
        ))}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          placeholder="Type your message... 💭"
          value={newMessage}
          onChange={handleTyping}
          required
        />
        <button type="submit">Send 🚀</button>
      </form>
    </div>
  );
}

export default App;