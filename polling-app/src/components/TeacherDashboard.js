import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const TeacherDashboard = ({ onBack }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [poll, setPoll] = useState(null);
  const [lastPoll, setLastPoll] = useState(null); // snapshot for completed polls
  const [results, setResults] = useState({});
  const [showResults, setShowResults] = useState(false); // keep result view visible until teacher chooses to create new
  const [studentCount, setStudentCount] = useState(0);
  const [students, setStudents] = useState([]);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', ''],
    timeLimit: 60,
    correctAnswers: [false, false]
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // prefer explicit env var, otherwise use same origin (when frontend served by backend)
    const socketUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Prefer polling for mobile
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      upgrade: true,
      forceNew: true,
      // Mobile-specific optimizations
      pingTimeout: 60000,
      pingInterval: 25000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('teacher-join');
    });

    newSocket.on('poll-status', (data) => {
      setPoll(data.activePoll);
      // keep a snapshot of the active poll so we can show results even if server clears activePoll
      if (data.activePoll) setLastPoll(data.activePoll);
      setResults(data.results);
      setStudentCount(data.studentCount);
      setStudents(data.students || []);
    });

    newSocket.on('poll-created', (data) => {
      setPoll(data);
      setLastPoll(data);
      setResults({});
      setShowResults(false);
      setSuccess('Poll created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    });

    newSocket.on('poll-results', (data) => {
      setResults(data.results);
    });

    newSocket.on('poll-completed', (data) => {
      // keep the poll marked completed if we have it; show results view explicitly.
      setPoll(prev => prev ? { ...prev, status: 'completed' } : prev);
      setResults(data.results);
      setShowResults(true);
      setSuccess('Poll completed!');
      setTimeout(() => setSuccess(''), 3000);
    });

    newSocket.on('time-update', (data) => {
      setPoll(prev => prev ? { ...prev, timeLeft: data.timeLeft } : null);
    });

    newSocket.on('student-joined', (data) => {
      console.log('Student joined:', data);
      setStudentCount(data.studentCount);
      setStudents(data.students || []);
      setSuccess(`${data.studentName} joined the session`);
      setTimeout(() => setSuccess(''), 2000);
    });

    newSocket.on('student-left', (data) => {
      setStudentCount(data.studentCount);
      setStudents(data.students || []);
    });

    newSocket.on('chat-message', (data) => {
      console.log('Chat message received:', data);
      setChatMessages(prev => [...prev, data]);
    });

    newSocket.on('chat-history', (messages) => {
      setChatMessages(messages);
    });

    newSocket.on('error', (message) => {
      setError(message);
      setTimeout(() => setError(''), 5000);
    });

    // Mobile-specific: Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && newSocket.disconnected) {
        console.log('Page became visible, reconnecting socket...');
        newSocket.connect();
      }
    };

    // Mobile-specific: Handle focus events
    const handleFocus = () => {
      if (newSocket.disconnected) {
        console.log('Window focused, reconnecting socket...');
        newSocket.connect();
      }
    };

    // Add event listeners for mobile optimization
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Mobile-specific: Periodic connection check
    const connectionCheckInterval = setInterval(() => {
      if (newSocket.disconnected && document.visibilityState === 'visible') {
        console.log('Periodic check: reconnecting socket...');
        newSocket.connect();
      }
    }, 10000); // Check every 10 seconds

    // NOTE: end-poll handling should be implemented server-side; remove client-side emit logic here.

    return () => {
      clearInterval(connectionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      newSocket.close();
    };
  }, []);

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll({
        ...newPoll,
        options: [...newPoll.options, ''],
        correctAnswers: [...newPoll.correctAnswers, false]
      });
    }
  };

  const removeOption = (index) => {
    if (newPoll.options.length > 2) {
      setNewPoll({
        ...newPoll,
        options: newPoll.options.filter((_, i) => i !== index),
        correctAnswers: newPoll.correctAnswers.filter((_, i) => i !== index)
      });
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...newPoll.options];
    newOptions[index] = value;
    setNewPoll({
      ...newPoll,
      options: newOptions
    });
  };

  const updateCorrectAnswer = (index, isCorrect) => {
    const newCorrectAnswers = [...newPoll.correctAnswers];
    newCorrectAnswers[index] = isCorrect;
    setNewPoll({
      ...newPoll,
      correctAnswers: newCorrectAnswers
    });
  };

  const createPoll = () => {
    if (!newPoll.question.trim()) {
      setError('Please enter a question');
      return;
    }

    // keep option correctness aligned with filtered options
    const pairs = newPoll.options.map((opt, i) => ({
      option: opt,
      correct: !!newPoll.correctAnswers[i]
    }));
    const validPairs = pairs.filter(p => p.option && p.option.trim());
    const options = validPairs.map(p => p.option.trim());
    const correctAnswers = validPairs.map(p => p.correct);

    if (options.length < 2) {
      setError('Please provide at least 2 options');
      return;
    }

    // clear any previous results view when teacher actually creates a new poll
    setShowResults(false);
    socket.emit('create-poll', {
      question: newPoll.question.trim(),
      options,
      timeLimit: newPoll.timeLimit,
      correctAnswers
    });

    setNewPoll({
      question: '',
      options: ['', ''],
      timeLimit: 60,
      correctAnswers: [false, false]
    });
    setError('');
  };

  const askNewQuestion = () => {
    // If a poll is active, do nothing (button is disabled anyway).
    // If no active poll, open the create form so teacher can compose a new poll.
    if (poll && poll.status === 'active') return;
    setShowResults(false);
    setPoll(null);
    // keep lastPoll so results view can still be shown if teacher cancels
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        user: 'Teacher',
        message: newMessage.trim(),
        isOwn: true
      };
      console.log('Sending chat message:', message);
      socket.emit('chat-message', message);
      setNewMessage('');
    }
  };

  const kickStudent = (studentId) => {
    socket.emit('kick-student', studentId);
  };

  const canCreatePoll = () => {
    // Allow showing the create form only when there is no active poll AND teacher isn't viewing results.
    return (!poll || poll.status === 'completed') && !showResults;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!connected) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
            Connecting to server...
          </div>
        </div>
      </div>
    );
  }

  // prefer the active poll, fallback to the lastPoll snapshot for completed polls
  const displayedPoll = poll || lastPoll;

  return (
    <div className="app">
      <div className="header">
        <div className="header-tag">
          <img src="/logo.png" alt="Intervue Poll" />
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {canCreatePoll() ? (
          <div className="card">
            <h1 className="title">Let's Get Started</h1>
            <p className="subtitle">
              you'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
            </p>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label">Enter your question</label>
                <div className="timer-dropdown">
                  <select 
                    className="timer-select"
                    value={newPoll.timeLimit}
                    onChange={(e) => setNewPoll({ ...newPoll, timeLimit: parseInt(e.target.value) })}
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                    <option value={120}>120 seconds</option>
                  </select>
                </div>
              </div>
              <textarea
                className="form-textarea"
                value={newPoll.question}
                onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                placeholder="Enter your question here..."
                maxLength={100}
              />
              <div className="char-counter">
                {newPoll.question.length}/100
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Edit Options</label>
              {newPoll.options.map((option, index) => (
                <div key={index} className="option-input">
                  <input
                    type="text"
                    className="form-input"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <div className="option-actions">
                    <div className="correct-radio">
                      <span>Is it Correct?</span>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={newPoll.correctAnswers[index] === true}
                            onChange={() => updateCorrectAnswer(index, true)}
                          />
                          Yes
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={newPoll.correctAnswers[index] === false}
                            onChange={() => updateCorrectAnswer(index, false)}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    {newPoll.options.length > 2 && (
                      <button 
                        className="btn btn-danger" 
                        onClick={() => removeOption(index)}
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {newPoll.options.length < 6 && (
                <button className="add-option-link" onClick={addOption}>
                  + Add More option
                </button>
              )}
            </div>

            <button className="btn" onClick={createPoll}>
              Ask Question
            </button>
          </div>
        ) : (
          <div className="poll-container">
            <div className="question-header">
              <span className="question-number">Question</span>
              {displayedPoll && displayedPoll.status === 'active' && (
                <div className="timer">
                  {formatTime(displayedPoll.timeLeft)}
                </div>
              )}
            </div>
            
            <div className="poll-question">{displayedPoll ? displayedPoll.question : 'Poll results'}</div>
            
            <div className="poll-options">
              {(displayedPoll && displayedPoll.options ? displayedPoll.options : []).map((option, index) => (
                <div key={index} className="poll-option">
                  <div className="poll-option-number">{index + 1}</div>
                  <span>{option}</span>
                  {results[option] && (
                    <div className="result-fill" style={{ 
                      width: `${(results[option] / Math.max(...Object.values(results))) * 100}%`,
                      height: '4px',
                      background: '#7765DA',
                      borderRadius: '2px',
                      marginLeft: 'auto'
                    }}></div>
                  )}
                </div>
              ))}
            </div>

            {Object.keys(results).length > 0 && (
              <div className="results">
                <h3 style={{ marginBottom: '16px', color: '#373737' }}>Live Results</h3>
                {Object.entries(results).map(([option, count]) => {
                  const total = Object.values(results).reduce((sum, c) => sum + c, 0);
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  
                  return (
                    <div key={option} className="result-item">
                      <span className="result-option">{option}</span>
                      <div className="result-bar">
                        <div 
                          className="result-fill" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="result-percentage">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn"
                onClick={askNewQuestion}
                disabled={poll && poll.status === 'active'}
                title={poll && poll.status === 'active' ? 'End the current poll to ask a new question' : ''}
              >
                + Ask a new question
              </button>

              {poll && poll.status === 'active' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (socket) {
                      // End current poll — server should broadcast 'poll-completed'
                      socket.emit('end-poll');
                    }
                  }}
                >
                  End Poll
                </button>
              )}
            </div>
          </div>
        )}

        {/* Side Panel Overlay */}
        {showSidePanel && (
          <div className="side-panel-overlay open" onClick={() => setShowSidePanel(false)}></div>
        )}
        
        {/* Side Panel */}
        <div className={`side-panel ${showSidePanel ? 'open' : ''}`}>
          <div className="panel-header">
            <h3 className="panel-title">Panel</h3>
            <button className="close-panel" onClick={() => setShowSidePanel(false)}>
              ×
            </button>
          </div>
          
          <div className="panel-tabs">
            <button 
              className={`panel-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button 
              className={`panel-tab ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'chat' ? (
              <div>
                <div className="chat-messages">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.isOwn ? 'own' : 'other'}`}>
                      <strong>{msg.user}:</strong> {msg.message}
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button onClick={sendMessage}>Send</button>
                </div>
              </div>
            ) : (
              <div>
                {students.length > 0 ? (
                  students.map((student) => (
                    <div key={student.id} className="participant-item">
                      <span className="participant-name">{student.name}</span>
                      <button 
                        className="kick-button"
                        onClick={() => kickStudent(student.id)}
                      >
                        Kick out
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6E6E6E', textAlign: 'center', padding: '20px' }}>
                    No participants yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat Button */}
        <button 
          className="floating-chat"
          onClick={() => setShowSidePanel(!showSidePanel)}
        >
          💬
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;