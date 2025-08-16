# Thrifty AI Coding Assessment

My solutions for the three coding tasks with some extra features I added for fun.

## What's Inside

```
assignment_thrifty/
├── task 1/
│   └── longest_palindrome.py    # DSA problem solution
├── task 2/
│   ├── backend/                 # Chat server with AI sentiment analysis
│   └── my-frontend/             # React chat app with dark theme
└── task 3/
    └── server2.js               # User activity tracking API
```

## Quick Start

**Task 1 - Longest Palindrome:**
```bash
cd "task 1"
python longest_palindrome.py
```

**Task 2 - Real-time Chat:**
```bash
# Terminal 1 - Start backend
cd "task 2/backend"
npm install && npm start

# Terminal 2 - Start frontend  
cd "task 2/my-frontend"
# Optional: Set up Gemini AI (for enhanced sentiment analysis)
echo "GEMINI_API_KEY=your_api_key_here" > .env
npm install && npm run dev
```

**Task 3 - Activity API:**
```bash
cd "task 3"
npm install && node server2.js
```

## Extra Features I Added

### Task 1
- Handles all edge cases properly
- Clean JavaScript implementation with good test coverage

### Task 2 (The fun one!)
- **Google Gemini AI** for smart sentiment analysis instead of basic keywords
- **Professional dark theme** - looks way better than the typical bootstrap styling
- **Real-time typing indicators** - see when others are typing
- **Live user count** and chat statistics
- **Mobile responsive** - works great on phones

### Task 3
- Clean REST API with proper error handling
- Added a health check endpoint for debugging

## Testing

**Chat App:** Open multiple browser tabs and start chatting. The AI will analyze message sentiment in real-time.

**Activity API:**
```bash
# Log some activity
curl -X POST http://localhost:3002/activity \
  -H "Content-Type: application/json" \
  -d '{"userId": "john", "action": "login"}'

# Check it worked
curl http://localhost:3002/activity/john
```

## Notes

- Chat works without Gemini API key (falls back to keyword analysis)
- Everything runs locally, no deployment needed
- Used Vite instead of create-react-app because it's faster
- Kept the dark theme professional - no flashy colors

The chat app turned out pretty nice, feels like something you'd actually want to use!