const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = http.createServer(app);

// ensure the deployed URL is allowed
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      'http://localhost:3000',
      'https://quizapp.onrender.com',
      'https://quizapp-mo86.onrender.com' // ensure mobile hostname is allowed
    ];

// Configure Socket.IO to accept both websocket and polling transports
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

app.use(express.json());

// Store active polls and students
let activePoll = null;
let students = new Map();
let pollResults = {};
let chatMessages = [];

// Routes
app.get('/api/status', (req, res) => {
  res.json({ 
    activePoll: activePoll ? {
      id: activePoll.id,
      question: activePoll.question,
      options: activePoll.options,
      timeLeft: activePoll.timeLeft,
      status: activePoll.status
    } : null,
    studentCount: students.size,
    results: pollResults,
    students: Array.from(students.values())
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Teacher joins
  socket.on('teacher-join', () => {
    socket.join('teachers');
    socket.emit('poll-status', {
      activePoll: activePoll ? {
        id: activePoll.id,
        question: activePoll.question,
        options: activePoll.options,
        timeLeft: activePoll.timeLeft,
        status: activePoll.status
      } : null,
      studentCount: students.size,
      results: pollResults,
      students: Array.from(students.values())
    });
    
    // Send existing chat messages to the teacher
    socket.emit('chat-history', chatMessages);
  });

  // Student joins
  socket.on('student-join', (studentName) => {
    if (students.has(socket.id)) {
      socket.emit('error', 'Student already registered');
      return;
    }
    
    students.set(socket.id, {
      id: socket.id,
      name: studentName,
      hasAnswered: false,
      answer: null
    });
    
    socket.join('students');
    socket.emit('joined-successfully', { studentName });
    
    // Send existing chat messages to the student
    socket.emit('chat-history', chatMessages);
    
    // Notify teachers about new student
    io.to('teachers').emit('student-joined', {
      studentCount: students.size,
      studentName,
      students: Array.from(students.values())
    });
    
    // Send current poll status to student
    if (activePoll) {
      socket.emit('poll-created', {
        id: activePoll.id,
        question: activePoll.question,
        options: activePoll.options,
        timeLeft: activePoll.timeLeft,
        status: activePoll.status
      });
    }
  });

  // Teacher creates a poll
  socket.on('create-poll', (pollData) => {
    console.log('Teacher creating poll:', pollData);
    try {
      // Check if teacher can create a poll
      if (activePoll && activePoll.status === 'active') {
        socket.emit('error', 'Cannot create new poll while one is active');
        return;
      }

      // Check if all students have answered the previous poll
      if (activePoll && activePoll.status === 'completed') {
        const allAnswered = Array.from(students.values()).every(student => student.hasAnswered);
        if (!allAnswered) {
          socket.emit('error', 'Wait for all students to answer the previous question');
          return;
        }
      }

      // Validate poll data
      if (!pollData || !pollData.question || !pollData.options || !Array.isArray(pollData.options)) {
        socket.emit('error', 'Invalid poll data provided');
        return;
      }

      // Create new poll
      const pollId = uuidv4();
      activePoll = {
        id: pollId,
        question: pollData.question,
        options: pollData.options,
        timeLimit: pollData.timeLimit || 60,
        timeLeft: pollData.timeLimit || 60,
        status: 'active',
        correctAnswers: Array.isArray(pollData.correctAnswers) ? pollData.correctAnswers : pollData.options.map(() => false),
        createdAt: new Date()
      };

      // Reset student answers
      students.forEach(student => {
        student.hasAnswered = false;
        student.answer = null;
      });

      // Reset results
      pollResults = {};
      activePoll.options.forEach(o => { pollResults[o] = 0; });

      // Notify all clients
      console.log('Broadcasting poll-created event to all clients');
      io.emit('poll-created', {
        id: activePoll.id,
        question: activePoll.question,
        options: activePoll.options,
        timeLeft: activePoll.timeLeft,
        status: activePoll.status
      });

      // Start countdown
      startPollCountdown();
    } catch (error) {
      console.error('Error creating poll:', error);
      socket.emit('error', 'Failed to create poll. Please try again.');
    }
  });

  // Teacher can end an active poll early
  socket.on('end-poll', () => {
    if (activePoll && activePoll.status === 'active') {
      activePoll.status = 'completed';
      // Broadcast final results
      io.emit('poll-completed', {
        poll: activePoll,
        results: pollResults,
        totalAnswers: Array.from(students.values()).filter(s => s.hasAnswered).length,
        totalStudents: students.size,
        correctOptions: activePoll.options.filter((o, i) => !!activePoll.correctAnswers[i]),
        correctAnswers: activePoll.correctAnswers
      });
    }
  });
  
  // Student submits answer
  socket.on('submit-answer', (answer) => {
    const student = students.get(socket.id);
    if (!student) {
      socket.emit('error', 'Student not registered');
      return;
    }

    if (!activePoll || activePoll.status !== 'active') {
      socket.emit('error', 'No active poll');
      return;
    }

    if (student.hasAnswered) {
      socket.emit('error', 'Already answered this question');
      return;
    }

    student.hasAnswered = true;
    student.answer = answer;

    // Update poll results
    if (!pollResults[answer]) {
      pollResults[answer] = 0;
    }
    pollResults[answer]++;

    // Notify all clients about updated results
    io.emit('poll-results', {
      results: pollResults,
      totalAnswers: Array.from(students.values()).filter(s => s.hasAnswered).length,
      totalStudents: students.size
    });

    // Check if all students have answered
    const allAnswered = Array.from(students.values()).every(s => s.hasAnswered);
    if (allAnswered) {
      activePoll.status = 'completed';
      io.emit('poll-completed', {
        poll: activePoll,
        results: pollResults,
        totalAnswers: students.size,
        totalStudents: students.size,
        correctOptions: activePoll.options.filter((o, i) => !!activePoll.correctAnswers[i]),
        correctAnswers: activePoll.correctAnswers
      });
    }
  });

  // Chat message handling
  socket.on('chat-message', (message) => {
    const messageWithId = {
      ...message,
      id: Date.now(),
      timestamp: new Date()
    };
    chatMessages.push(messageWithId);
    
    // Broadcast to all connected clients
    io.emit('chat-message', messageWithId);
  });

  // Kick student handling
  socket.on('kick-student', (studentId) => {
    const student = students.get(studentId);
    if (student) {
      // Notify the kicked student
      io.to(studentId).emit('kicked-out');
      
      // Remove from students list
      students.delete(studentId);
      
      // Notify teachers about student being kicked
      io.to('teachers').emit('student-left', {
        studentCount: students.size,
        studentName: student.name,
        students: Array.from(students.values())
      });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (students.has(socket.id)) {
      const student = students.get(socket.id);
      students.delete(socket.id);
      
      // Notify teachers about student leaving
      io.to('teachers').emit('student-left', {
        studentCount: students.size,
        studentName: student.name,
        students: Array.from(students.values())
      });
    }
  });
});

// Poll countdown function
function startPollCountdown() {
  const countdownInterval = setInterval(() => {
    if (!activePoll || activePoll.status !== 'active') {
      clearInterval(countdownInterval);
      return;
    }

    activePoll.timeLeft--;
    
    // Broadcast time update
    io.emit('time-update', { timeLeft: activePoll.timeLeft });

    if (activePoll.timeLeft <= 0) {
      activePoll.status = 'completed';
      clearInterval(countdownInterval);
      
      // Broadcast final results
      io.emit('poll-completed', {
        poll: activePoll,
        results: pollResults,
        totalAnswers: Array.from(students.values()).filter(s => s.hasAnswered).length,
        totalStudents: students.size,
        correctOptions: activePoll.options.filter((o, i) => !!activePoll.correctAnswers[i]),
        correctAnswers: activePoll.correctAnswers
      });
    }
  }, 1000);
}

// Serve React build (single-host deployment)
const buildPath = path.join(__dirname, 'polling-app', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Render commonly sets PORT; fallback to 10000 which Render's banner referenced
const PORT = process.env.PORT || 10000;
// bind explicitly to 0.0.0.0
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT} (bound to 0.0.0.0)`);
});

// Increase keep-alive and headers timeout to avoid intermittent reset/timeouts on Render
httpServer.keepAliveTimeout = 120000;   // 120s
httpServer.headersTimeout = 125000;     // slightly higher than keepAlive
