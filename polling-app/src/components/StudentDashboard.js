import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const StudentDashboard = ({ onBack }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isKicked, setIsKicked] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [answerCorrect, setAnswerCorrect] = useState(null);
  const [correctOptions, setCorrectOptions] = useState([]);

  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
      upgrade: true
    });

    // Basic lifecycle / debug listeners
    newSocket.on('connect', () => {
      console.info('student socket connected', newSocket.id, 'to', socketUrl);
      setConnected(true);
    });
    newSocket.on('connect_error', (err) => {
      console.error('student connect_error', err);
      setError('Socket connection error: ' + (err?.message || 'unknown'));
    });
    newSocket.on('connect_timeout', () => {
      console.warn('student connect_timeout');
      setError('Socket connection timeout');
    });
    newSocket.on('reconnect_attempt', (n) => console.info('student reconnect attempt', n));
    newSocket.on('reconnect_failed', () => {
      console.error('student reconnect failed');
      setError('Unable to reconnect to server');
    });
    newSocket.on('disconnect', (reason) => {
      console.warn('student socket disconnected', reason);
      setConnected(false);
      if (reason !== 'io client disconnect') setError('Disconnected: ' + reason);
    });
    newSocket.on('error', (e) => {
      console.error('student socket error', e);
    });

    // Application event listeners (kept from original implementation)
    newSocket.on('joined-successfully', (data) => {
      setNameSubmitted(true);
      setSuccess(`Welcome, ${data.studentName}!`);
      setTimeout(() => setSuccess(''), 3000);
    });

    newSocket.on('poll-created', (data) => {
      setPoll(data);
      setHasAnswered(false);
      setSelectedAnswer('');
      setResults({});
    });

    newSocket.on('poll-results', (data) => {
      setResults(data.results);
    });

    newSocket.on('poll-completed', (data) => {
      if (data.correctOptions) setCorrectOptions(data.correctOptions);
      if (data.poll && data.poll.correctAnswers) {
        // optional: store poll.correctAnswers if needed
      }
      setPoll(prev => prev ? { ...prev, status: 'completed' } : null);
      setResults(data.results || {});
    });

    newSocket.on('time-update', (data) => {
      setPoll(prev => prev ? { ...prev, timeLeft: data.timeLeft } : null);
    });

    newSocket.on('kicked-out', () => {
      setIsKicked(true);
    });

    newSocket.on('chat-message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    newSocket.on('chat-history', (messages) => {
      setChatMessages(messages);
    });

    newSocket.on('error', (message) => {
      setError(message);
      setTimeout(() => setError(''), 5000);
    });

    // add listeners for feedback and final reveal (keep existing listeners)
    newSocket.on('answer-feedback', (data) => {
      // { correct: boolean, selected: string, correctOptions: [ ... ] }
      setAnswerCorrect(!!data.correct);
      if (Array.isArray(data.correctOptions)) setCorrectOptions(data.correctOptions);
      setSuccess(data.correct ? 'Your answer is correct' : 'Your answer is incorrect');
      setTimeout(() => setSuccess(''), 3000);
    });

    setSocket(newSocket);

    return () => {
      try { newSocket.close(); } catch (e) { /* ignore */ }
    };
  }, []);

  const submitName = () => {
    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }
    socket.emit('student-join', studentName.trim());
  };

  // when student submits an answer, clear previous correctness state
  const submitAnswer = () => {
    if (!selectedAnswer) return;
    socket.emit('submit-answer', selectedAnswer);
    setHasAnswered(true);
    setAnswerCorrect(null);
  };

  const selectAnswer = (answer) => {
    if (!hasAnswered && poll && poll.status === 'active') {
      setSelectedAnswer(answer);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        user: studentName,
        message: newMessage.trim(),
        isOwn: true
      };
      socket.emit('chat-message', message);
      setNewMessage('');
    }
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

  if (isKicked) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-tag">
            <img src="/logo.png" alt="Intervue Poll" />
          </div>
        </div>
        <div className="container">
          <div className="kicked-out">
            <div className="kicked-out-icon">🚫</div>
            <h1 className="kicked-out-title">You've been Kicked out !</h1>
            <p className="kicked-out-message">
              Looks like the teacher had removed you from the poll system. Please Try again sometime.
            </p>
            <button className="btn" onClick={onBack} style={{ marginTop: '24px' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!nameSubmitted) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-tag">
            <img src="/logo.png" alt="Intervue Poll" />
          </div>
        </div>
        
        <div className="container">
          <div className="card">
            <h1 className="title">Let's Get Started</h1>
            <p className="subtitle">
              If you're a student, you'll be able to submit your answers, participate in live polls, and see how your responses compare with your classmates
            </p>
            
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <div className="form-group">
              <label className="form-label">Enter your Name</label>
              <input
                type="text"
                className="form-input"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your name here..."
                onKeyPress={(e) => e.key === 'Enter' && submitName()}
              />
            </div>

            <button className="btn" onClick={submitName}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-tag">
          + Intervue Poll
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {!poll ? (
          <div className="card">
            <div className="waiting-message">
              <div className="loading-spinner"></div>
              Wait for the teacher to ask questions..
            </div>
          </div>
        ) : poll.status === 'active' && !hasAnswered ? (
          <div className="poll-container">
            <div className="question-header">
              <span className="question-number">Question 1</span>
              <div className="timer">
                {formatTime(poll.timeLeft)}
              </div>
            </div>
            
            <div className="poll-question">{poll.question}</div>
            
            <div className="poll-options">
              {poll.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`poll-option ${selectedAnswer === option ? 'selected' : ''}`}
                  onClick={() => selectAnswer(option)}
                >
                  <div className="poll-option-number">{index + 1}</div>
                  <span>{option}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <button 
                className="btn" 
                onClick={submitAnswer}
                disabled={!selectedAnswer}
              >
                Submit
              </button>
            </div>
          </div>
        ) : (
          <div className="poll-container">
            <div className="question-header">
              <span className="question-number">Question 1</span>
              {poll.status === 'active' && (
                <div className="timer">
                  {formatTime(poll.timeLeft)}
                </div>
              )}
            </div>
            
            <div className="poll-question">{poll.question}</div>
            
            <div className="poll-options">
              {poll.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`poll-option ${selectedAnswer === option ? 'selected' : ''}`}
                >
                  <div className="poll-option-number">{index + 1}</div>
                  <span>{option}</span>

                  {hasAnswered && selectedAnswer === option && answerCorrect !== null && (
                    <span className={`answer-indicator ${answerCorrect ? 'correct' : 'wrong'}`}>
                      {answerCorrect ? '✓ Correct' : '✕ Wrong'}
                    </span>
                  )}

                  {(!hasAnswered || poll?.status === 'completed') && correctOptions.includes(option) && poll?.status === 'completed' && (
                    <span className="correct-badge">Correct</span>
                  )}
                </div>
              ))}
            </div>

            {hasAnswered && (
              <div style={{ 
                background: '#D4EDDA', 
                color: '#155724', 
                padding: '16px', 
                borderRadius: '8px', 
                margin: '20px 0',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                ✅ You answered: {selectedAnswer}
              </div>
            )}

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

            {poll.status === 'completed' && (
              <div style={{ 
                background: '#F8D7DA', 
                color: '#721C24', 
                padding: '16px', 
                borderRadius: '8px', 
                margin: '20px 0',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                ⏰ Poll Completed
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#6E6E6E' }}>
              Wait for the teacher to ask a new question
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
                <p style={{ color: '#6E6E6E', textAlign: 'center', padding: '20px' }}>
                  Participants list will appear here when available
                </p>
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

export default StudentDashboard;