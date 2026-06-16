# Mobile App Notes

This Expo app should use:

- Supabase Auth for sign-up, sign-in, and session restore
- FastAPI for protected application routes like profiles, interests, reports, and blocks

## API Connection

The mobile app resolves its API base URL in this order:

1. Platform-specific override:
   - `EXPO_PUBLIC_API_BASE_URL`
   - `EXPO_PUBLIC_API_URL_ANDROID`
   - `EXPO_PUBLIC_API_URL_IOS`
   - `EXPO_PUBLIC_API_URL_WEB`
2. `EXPO_PUBLIC_API_URL`
3. Fallback: `http://127.0.0.1:8001`

## Recommended Local Setup

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8001
EXPO_PUBLIC_API_URL_ANDROID=http://10.0.2.2:8001
EXPO_PUBLIC_API_URL_WEB=http://localhost:8001
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET=avatars
```

For a physical phone, use your machine's LAN IP instead:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:8001
```

Then start the backend so it is reachable from your device:

```bash
cd apps/api
./venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Phase 1 implementation order

1. Add Supabase client configuration to the Expo app.
2. Build auth screens and session restore.
3. Call `GET /auth/session` with the Supabase access token.
4. Save onboarding data to `PUT /profiles/me`.
5. Save interest selection to `PUT /interests/me`.
6. Join the matchmaking queue with `POST /match/join`.

The current scaffold now covers steps 1-6 at a basic level.

## Verification gate

The current flow requires:

1. Sign up or sign in
2. Verify the email address
3. Enter the private onboarding flow
4. Save profile data
5. Save interests and complete onboarding

Private routes redirect back to `/(public)/verify-email` until the session reports a confirmed email.

## Avatar storage

The profile screen now uploads avatars to Supabase Storage.

Recommended setup:

1. Create a public bucket named `avatars`, or set `EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET`.
2. Add storage policies that allow authenticated uploads and public reads for avatar objects.
3. Keep file paths scoped by user id, which the current app does automatically.

## Matchmaking gate

The app now derives queue readiness from the current account state.

A user is eligible for matchmaking only when all of these are true:

1. Email is verified
2. Profile basics are complete
3. At least one interest is selected
4. Onboarding is marked complete
5. Profile status is `active`

The private Queue tab now calls `/match/join` and shows either a queued state or a basic match result.

## Current route structure

- `/(public)/login`: sign in
- `/(public)/signup`: create account
- `/(public)/forgot-password`: request password reset
- `/(public)/verify-email`: resend verification and refresh email status
- `/(private)/(tabs)/index`: account and profile setup
- `/(private)/(tabs)/setup`: interests and onboarding completion
- `/(private)/(tabs)/queue`: matchmaking readiness and queue gate
- `/(private)/preferences`: theme preferences

## EAS / Expo Deploy Prep

Before production builds, replace the placeholder Supabase project values with your real environment configuration for each build profile.
