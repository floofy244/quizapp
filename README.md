# Live Polling System

A real-time polling application built with React and Express.js with Socket.io for interactive classroom polling between teachers and students.

## Features

### Teacher Features
- Create new polls with custom questions and multiple choice options
- View live polling results in real-time
- Monitor student participation
- 60-second timer for each poll
- Can only create new polls when no active poll exists or all students have answered

### Student Features
- Enter unique name on first visit
- Submit answers to active polls
- View live results after submission
- Real-time updates during polling
- 60-second time limit to answer questions

### Technical Features
- Real-time communication using Socket.io
- Modern, responsive UI design
- No external state management (Redux) - pure React
- Cross-tab support for students
- Automatic poll completion after time limit

## Technology Stack

- **Frontend**: React 18
- **Backend**: Express.js
- **Real-time Communication**: Socket.io
- **Styling**: CSS3 with modern design patterns

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Install backend dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install frontend dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Start the Application**:
   - Run both backend and frontend servers
   - Open `http://localhost:3000` in your browser

2. **Teacher Workflow**:
   - Select "Teacher" role
   - Create a poll with question and options
   - Monitor live results as students answer
   - View final results after completion

3. **Student Workflow**:
   - Select "Student" role
   - Enter your name to join the session
   - Wait for teacher to create a poll
   - Answer the question within 60 seconds
   - View live results after submission

## Project Structure

```
live-polling-system/
├── server.js                 # Express server with Socket.io
├── package.json             # Backend dependencies
├── client/                  # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── RoleSelector.js
│   │   │   ├── TeacherDashboard.js
│   │   │   └── StudentDashboard.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json         # Frontend dependencies
└── README.md
```

## API Endpoints

- `GET /api/status` - Get current poll status and student count

## Socket.io Events

### Teacher Events
- `teacher-join` - Teacher joins the session
- `create-poll` - Create a new poll
- `poll-status` - Receive current poll status
- `student-joined` - Notification when student joins
- `student-left` - Notification when student leaves

### Student Events
- `student-join` - Student joins with name
- `submit-answer` - Submit answer to active poll
- `poll-created` - Receive new poll notification
- `poll-results` - Receive live results update
- `poll-completed` - Receive poll completion notification

## Deployment

### Heroku Deployment

1. Create a Heroku app
2. Set up environment variables if needed
3. Deploy using Git:
```bash
git add .
git commit -m "Initial commit"
git push heroku main
```

### Other Platforms

The application can be deployed to any platform that supports Node.js:
- Vercel
- Netlify
- AWS
- DigitalOcean

## Development

### Running in Development Mode

1. Start backend: `npm run dev`
2. Start frontend: `cd client && npm start`
3. Both servers will auto-reload on changes

### Building for Production

```bash
cd client
npm run build
```

This creates a `build` folder with production-ready files.

## Features Implemented

✅ **Core Requirements**
- Teacher can create polls and view live results
- Students can answer questions and view results
- 60-second timer for each question
- Real-time communication between teacher and students
- Modern, responsive UI design

✅ **Additional Features**
- Role-based access (Teacher/Student)
- Student name registration
- Live result updates
- Automatic poll completion
- Cross-tab support
- Error handling and validation

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for educational or commercial purposes.
