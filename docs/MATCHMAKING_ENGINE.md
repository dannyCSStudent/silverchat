# Matchmaking Logic

## Inputs

- Profile completion
- Interests
- Country
- Block list
- Queue availability

## Eligibility

Users must have:
- a saved profile
- at least one interest
- completed onboarding
- an active profile status

## Ranking

Candidates are ranked by:
- same-country match first
- strongest shared-interest category cluster next
- total shared interests next
- queue order as the final tie-breaker

## Rules

- Avoid blocked users
- Avoid inactive or incomplete profiles
- Prefer same-country candidates when available
- Fall back to the best available candidate when needed

## User-facing signals

- Queue preview shows how many candidates are available
- Queue preview shows preferred vs fallback pool counts
- Queue preview shows the strongest overlap category and interest
- After a match, the queue shows a human-readable match context
