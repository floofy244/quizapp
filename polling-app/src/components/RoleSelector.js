import React, { useState } from 'react';

const RoleSelector = ({ onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState('student');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    onRoleSelect(selectedRole);
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-tag">
          + Intervue Poll
        </div>
      </div>
      
      <div className="container">
        <div className="role-selector">
          <h1 className="title">Welcome to the Live Polling System</h1>
          <p className="subtitle">
            Please select the role that best describes you to begin using the live polling system
          </p>
          
          <div className="role-cards">
            <div 
              className={`role-card ${selectedRole === 'student' ? 'selected' : ''}`}
              onClick={() => handleRoleSelect('student')}
            >
              <h3 className="role-card-title">I'm a Student</h3>
              <p className="role-card-description">
                Participate in live polls, submit answers, and view real-time results with your classmates.
              </p>
            </div>
            
            <div 
              className={`role-card ${selectedRole === 'teacher' ? 'selected' : ''}`}
              onClick={() => handleRoleSelect('teacher')}
            >
              <h3 className="role-card-title">I'm a Teacher</h3>
              <p className="role-card-description">
                Create polls, ask questions, and monitor your students' responses in real-time.
              </p>
            </div>
          </div>
          
          <button className="btn" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
