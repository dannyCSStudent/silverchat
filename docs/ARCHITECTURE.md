# Architecture

Mobile App:
Expo app

Web Admin:
Next.js

Backend:
FastAPI

Services:
- Auth Service
- Matchmaking Service
- Signaling Service
- Moderation Service
- Notification Service

Flow:

User joins queue
↓
Matchmaking service
↓
Signal exchange
↓
WebRTC connection
↓
Video session
↓
Feedback/reporting