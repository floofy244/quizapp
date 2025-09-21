# Live Polling System

A real-time polling application that allows teachers to create polls and students to participate in them. The UI is designed to match the exact specifications from the provided mockups.

## Features

### Teacher Features
- Create new polls with custom questions and options
- Set configurable time limits (30, 60, 90, or 120 seconds)
- View live polling results in real-time
- Ask new questions only when:
  - No question has been asked yet, or
  - All students have answered the previous question
- Manage participants (kick out students)
- Chat with students
- View participant list

### Student Features
- Enter name on first visit (unique to each tab)
- Submit answers once a question is asked
- View live polling results after submission
- Maximum of 60 seconds to answer a question (configurable by teacher)
- Chat with teacher and other students
- Wait for teacher to ask questions
- Handle being kicked out gracefully

### Additional Features
- Real-time communication using Socket.io
- Responsive design that works on desktop and mobile
- Modern UI with purple color scheme matching the design mockups
- Live results visualization with progress bars
- Chat functionality for interaction between students and teachers
- Participant management for teachers

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install server dependencies:
```bash
cd ..
npm install
```

2. Install client dependencies:
```bash
cd polling-app
npm install
```

### Running the Application

1. Start the server:
```bash
cd ..
node server.js
```

2. Start the React client:
```bash
cd polling-app
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Role Selection**: Choose between "Teacher" or "Student" role
2. **Teacher Flow**:
   - Create polls with questions and multiple choice options
   - Set time limits for each poll
   - Monitor live results
   - Manage participants
   - Chat with students
3. **Student Flow**:
   - Enter your name to join
   - Wait for questions from the teacher
   - Answer questions within the time limit
   - View live results
   - Chat with teacher and other students

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **Styling**: CSS3 with custom design system
- **State Management**: React Hooks

## Color Palette

The application uses the following color scheme:
- Primary Purple: #7765DA
- Secondary Blue: #5767D0
- Dark Purple: #4F0DCE
- Light Gray: #F2F2F2
- Dark Gray: #373737
- Medium Gray: #6E6E6E

## Project Structure

```
polling-app/
├── src/
│   ├── components/
│   │   ├── RoleSelector.js
│   │   ├── TeacherDashboard.js
│   │   └── StudentDashboard.js
│   ├── App.tsx
│   ├── App.css
│   └── index.tsx
├── public/
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.