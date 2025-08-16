const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In-memory storage for activities
let activities = [];

// POST /activity - Log user activity
app.post('/activity', (req, res) => {
  const { userId, action } = req.body;
  
  // Validation
  if (!userId || !action) {
    return res.status(400).json({ 
      error: 'userId and action are required' 
    });
  }
  
  // Create activity record
  const activity = {
    userId,
    action,
    timestamp: new Date().toISOString()
  };
  
  activities.push(activity);
  
  res.status(201).json({ 
    success: true, 
    message: 'Activity logged successfully',
    activity 
  });
});

// GET /activity/:userId - Get last 10 activities for user
app.get('/activity/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Filter activities for the specific user
  const userActivities = activities
    .filter(activity => activity.userId === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by newest first
    .slice(0, 10) // Get last 10
    .map(activity => ({
      action: activity.action,
      timestamp: activity.timestamp
    }));
  
  res.json(userActivities);
});

// GET /activity/:userId/summary - Get action count summary for user
app.get('/activity/:userId/summary', (req, res) => {
  const { userId } = req.params;
  
  // Filter activities for the specific user
  const userActivities = activities.filter(activity => activity.userId === userId);
  
  // Count each action type
  const summary = {};
  userActivities.forEach(activity => {
    summary[activity.action] = (summary[activity.action] || 0) + 1;
  });
  
  res.json(summary);
});

// GET /activities - Debug endpoint to see all activities
app.get('/activities', (req, res) => {
  res.json({
    total: activities.length,
    activities: activities.slice(-20) // Show last 20 for debugging
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Activity Tracking API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});