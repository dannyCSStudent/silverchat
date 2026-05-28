# Architecture

## Clients

- Mobile app: Expo React Native
- Web admin: Next.js

## Backend

- FastAPI
- REST endpoints for auth, profiles, interests, matchmaking, reports, blocks, admin users, and health
- WebSocket routes for matchmaking and signaling

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
