require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize Firebase (must be before routes that use it)
require('./lib/firebase');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const qaRoutes = require('./routes/qa');
const topicsRoutes = require('./routes/topics');
const mockRoutes = require('./routes/mock');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/mock', mockRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AI Interview Suite Backend is running!',
    firebase: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 AI Interview Suite Backend running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /api/auth/signup        - Create new user`);
  console.log(`  POST /api/auth/sync          - Sync user profile after login`);
  console.log(`  GET  /api/auth/profile       - Get user profile`);
  console.log(`  POST /api/resume             - Generate ATS resume (AI)`);
  console.log(`  GET  /api/resume/history     - Get past AI resumes`);
  console.log(`  POST /api/resume/builder     - Save structured resume profile`);
  console.log(`  GET  /api/resume/builder     - Load saved resume profile`);
  console.log(`  PUT  /api/resume/builder     - Partial update resume profile`);
  console.log(`  POST /api/qa                 - Generate interview Q&A`);
  console.log(`  GET  /api/qa/history         - Get past Q&A sessions`);
  console.log(`  POST /api/topics             - Generate study roadmap`);
  console.log(`  GET  /api/topics/history      - Get past study plans`);
  console.log(`  POST /api/mock               - Mock interview chat (legacy)`);
  console.log(`  POST /api/mock/generate      - Generate coding / behavioral question`);
  console.log(`  POST /api/mock/evaluate      - Evaluate submission (AI scoring)`);
  console.log(`  GET  /api/mock/history       - Get past interview sessions`);
  console.log(`  GET  /api/mock/sessions/history - Get past chat sessions`);
  console.log(`\n✅ Backend v2 — Interview Engine ready!\n`);
});
