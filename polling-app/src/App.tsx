import React, { useState } from 'react';
import './App.css';
import RoleSelector from './components/RoleSelector';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';

function App() {
  const [currentView, setCurrentView] = useState('role-selector');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setCurrentView(role === 'teacher' ? 'teacher' : 'student');
  };

  const handleBack = () => {
    setCurrentView('role-selector');
    setSelectedRole(null);
  };

  return (
    <div className="App">
      {currentView === 'role-selector' && (
        <RoleSelector onRoleSelect={handleRoleSelect} />
      )}
      {currentView === 'teacher' && (
        <TeacherDashboard onBack={handleBack} />
      )}
      {currentView === 'student' && (
        <StudentDashboard onBack={handleBack} />
      )}
    </div>
  );
}

export default App;
