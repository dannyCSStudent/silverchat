# API Notes

`schema.sql` is the source of truth for the SilverChat Phase 1 Supabase schema.

## Current foundation

The FastAPI app is aligned around:

- Supabase Auth for identity
- FastAPI JWT verification for protected routes
- profile creation and onboarding state
- interest selection
- reports and blocks

## Expected environment

Create `apps/api/.env` with:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
ADMIN_API_TOKEN=...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

## Apply schema

Run `apps/api/schema.sql` in the Supabase SQL editor before local development.

That schema now includes `public.admin_users`. Basic-auth usernames from the web admin must also be present there for moderation routes to resolve a stored moderator identity.

## Auth boundary

Mobile and web clients should authenticate with Supabase directly.
Protected FastAPI routes expect:

```text
Authorization: Bearer <supabase-access-token>
```

Admin moderation routes additionally expect:

```text
X-Admin-Token: <admin-api-token>
X-Admin-Username: <basic-auth-username>
```

Example moderator bootstrap:

```sql
insert into public.admin_users (username, display_name, role)
values
  ('alice', 'Alice Johnson', 'admin'),
  ('bob', 'Bob Rivera', 'moderator')
on conflict (username) do update
set display_name = excluded.display_name,
    role = excluded.role,
    is_active = true;
```
