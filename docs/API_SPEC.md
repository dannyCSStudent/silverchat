# API

## Auth

- `GET /auth/session`

## Profiles

- `GET /profiles/`
- `GET /profiles/me`
- `PUT /profiles/me`
- `PATCH /profiles/me`

## Interests

- `GET /interests/`
- `GET /interests/me`
- `PUT /interests/me`

## Matchmaking

- `POST /match/join`
- `GET /match/preview`
- `GET /match/queue`
- `GET /match/sessions`
- `GET /match/sessions/summary`
- `GET /match/sessions/summary/export`
- `GET /match/sessions/{session_id}`

## Presence

- `GET /presence/me`
- `PUT /presence/me`
- `GET /presence/{user_id}`

## Reports and moderation

- `GET /reports/`
- `GET /reports/me`
- `POST /reports/`
- `PATCH /reports/{report_id}`
- `POST /reports/{report_id}/notes`
- `POST /reports/{report_id}/assignment`
- `POST /reports/{report_id}/enforcement`
- `POST /reports/{report_id}/enforcement-review`
- `POST /reports/export`

## Blocks

- `GET /blocks/`
- `GET /blocks/me`
- `POST /blocks/`

## Admin users

- `GET /admin-users/`
- `GET /admin-users/me`

## Health

- `GET /health`
- `GET /health/db`

## Realtime

- `WS /ws/matchmaking`
- `WS /ws/signaling?session_id={session_id}&token={access_token}`
