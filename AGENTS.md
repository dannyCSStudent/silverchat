# SilverChat AI Agent Instructions

## Product

SilverChat is a random video chat app for adults 40+ focused on meaningful conversations, safety, and trust.

## Stack

Frontend:
- Next.js (web admin)
- Expo React Native (mobile app)

Backend:
- FastAPI
- WebSockets
- WebRTC signaling

Database:
- PostgreSQL
- Supabase

Storage:
- Supabase Storage

Realtime:
- WebSockets

Auth:
- Supabase Auth

Push Notifications:
- Expo Notifications

Infrastructure:
- Render
- Vercel

## Rules

- Mobile-first development
- Shared components in packages/ui
- API routes must be typed
- Use repository pattern
- Avoid duplicate business logic
- Use server-side validation
- Keep components small

## Priorities

1. Safety
2. Stability
3. Matching quality
4. Performance
5. Monetization

## Features

Core:
- Random video matching
- Skip chat
- Friend requests
- Interests
- Profile system
- Reports
- Blocks

Advanced:
- AI icebreakers
- Toxicity detection
- Scam detection
- Live captions