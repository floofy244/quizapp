# Live Polling

Simple real-time classroom polling built with React + Express + Socket.IO.

hosted link : https://quizapp-mo86.onrender.com

Quick start (development)
1. Install deps:
   - npm install
   - npm install --prefix polling-app
2. Run:
   - npm run dev (or `node server.js`)  
   - cd polling-app && npm start

Features (brief)
- Teacher: create polls, view live results, view past polls
- Student: join with name, answer polls, see correct/incorrect feedback
- Real-time via Socket.IO
- Real-time global chat

Project layout
- server.js
- polling-app/ (React app)
  - src/components/TeacherDashboard.js
  - src/components/StudentDashboard.js

