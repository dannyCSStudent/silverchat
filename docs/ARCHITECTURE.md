# Architecture

## Clients

- Mobile app: Expo React Native
- Web admin: Next.js

## Backend

- FastAPI
- REST endpoints for auth, profiles, interests, matchmaking, reports, blocks, presence, admin users, and health
- WebSocket routes for matchmaking and session signaling

## Data and services

- PostgreSQL via Supabase
- Supabase Auth for end-user auth
- Supabase Storage for media and evidence
- Expo Notifications token storage exists, but there is no dedicated notification delivery service wired into the product yet

## Admin flow

- Web moderation routes proxy through same-origin `/api/admin/*`
- The moderation dashboard uses queue, SLA, export, and health views
- Member detail pages aggregate reports, blocks, and moderation events

## Match flow

User completes onboarding
↓
Queue preview computes current match signals
↓
User joins matchmaking queue
↓
Backend ranks eligible candidates by country and interest overlap
↓
Match is created and both users leave the queue
↓
Queue and moderation surfaces show match context and safety actions
↓
Session detail and the call room expose post-match follow-up and signaling

## Call flow

The app now has a call-room route and backend signaling relay for a matched session.

What is implemented:
- `WS /ws/signaling?session_id=...&token=...`
- private mobile call-room route for a matched session
- local and remote WebRTC media tracks in the mobile call room
- camera and microphone permission handling for the actual A/V stream

What is still missing:
- TURN/STUN configuration for real-world connectivity
