# Tables

## Core identity

- `profiles`
- `interests`
- `user_interests`
- `admin_users`

## Matchmaking

- `match_queue`
- `chat_sessions`

## Safety and moderation

- `reports`
- `blocks`
- `moderation_events`
- `verification_checks`

## Presence and delivery

- `user_presence`
- `device_push_tokens`

## Other

- `subscriptions`
- `notifications`

## Notes

- `reports` store the user-facing report snapshot.
- `moderation_events` store moderation actions, notes, assignment changes, and enforcement review history.
- `verification_checks` support age/trust verification workflows.
- `device_push_tokens` exist, but notification delivery is not yet wired into a full alerting system.
