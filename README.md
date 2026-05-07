# SilverChat

SilverChat is a random video chat platform for adults 40+ focused on meaningful conversation, safety, and trust.

## Current repo direction

The workspace is being realigned from a generic starter into a SilverChat stack:

- `apps/mobile`: Expo app for onboarding, queueing, and call flows
- `apps/web`: Next.js admin surface for health, moderation, and operations
- `apps/api`: FastAPI application boundary over Supabase Auth and Postgres
- `packages/types`: shared SilverChat domain types

## Phase 1 foundation

The backend schema and routes now target:

- auth session verification
- profiles
- interests
- reports
- blocks

## Recommended next build order

1. Connect Supabase Auth in the Expo app.
2. Build sign-up, sign-in, and email verification.
3. Implement profile setup and interest selection.
4. Gate matchmaking on onboarding completion and safety state.
5. Add queueing, signaling, and WebRTC after onboarding is stable.
