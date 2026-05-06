# Business App Starter Template

A polished, multi-platform CRM starter that wires together FastAPI, Supabase, Next.js, and Expo so you can demo a full workflow stack from one repo.

## Highlights

- **True full stack** – shared Supabase schema + FastAPI backend, responsive Next.js dashboard, and a touch-friendly Expo client all speaking the same CRM model.
- **Demo-ready workflows** – clients, tags, and activity records display instantly thanks to the included seed data and synchronized dashboards/websocket-free edits.
- **Operational confidence** – `/health` and `/health/db` endpoints, `pnpm check-health`, and the mobile diagnostics card prove the stack is wired before you present.
- **Automation-first** – CI checks cover linting, type safety, seeding, and API health. A dedicated staging workflow runs the same suite plus a staging manifest so you can gate deployment branches.

## Architecture

```
apps/
  api/       FastAPI + Supabase glue (schema, seed script, diagnostics)
  web/       Next.js CRM dashboard & portfolio shell
  mobile/    Expo shell with client feed, detail workspace, and quick actions
packages/
  types/     Shared TypeScript CRM models
  ui/        Shared UI building blocks
```

## Getting started

1. Install toolchain: `pnpm install` and ensure Python 3.11+ is available for the API virtual environment.
2. Configure Supabase via `.env` (or your secrets store) with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`, then apply `apps/api/schema.sql`.
3. Seed sample rows: `pnpm seed` (optionally add `--drop` to wipe tables first). The command uses `apps/api/.venv/bin/python seed.py`, so the backend must be bootstrapped first.
4. Start the backend:
   ```bash
   cd apps/api
   python -m venv .venv
   ./.venv/bin/pip install -r requirements.txt
   ./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Start the web dashboard:
   ```bash
   cd apps/web
   pnpm dev
   ```
   Set `NEXT_PUBLIC_API_URL=http://localhost:8000` if the web client needs a custom host.
6. Start the mobile shell: create `apps/mobile/.env` with platform-specific API URLs (`EXPO_PUBLIC_API_URL_ANDROID`, `EXPO_PUBLIC_API_URL_WEB`, or `EXPO_PUBLIC_API_URL` for LAN devices) and run `pnpm --filter mobile dev`.
7. Validate connectivity with `pnpm check-health` (hits `/health` and `/health/db`) or watch the mobile diagnostics card for the live/fallback mode and resolved API host.

## Workspace scripts

- `pnpm dev` – run all local dev servers via Turborepo.
- `pnpm build` – builds every app/package.
- `pnpm lint` – runs linters across the repo.
- `pnpm check-types` – runs TypeScript/Static checks.
- `pnpm seed` – runs `apps/api/seed.py` (see `apps/api/seed.py` for payloads).
- `pnpm check-health` – utility script in `scripts/check-health.js` that pings your deployed API and DB health endpoints.

## Environment variables

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` – required by the API + seed script.
- `API_URL` or `NEXT_PUBLIC_API_URL` – consumed by the web dashboard and `pnpm check-health`.
- `EXPO_PUBLIC_API_URL_ANDROID` / `_IOS` / `_WEB` / plain `EXPO_PUBLIC_API_URL` – determine how Expo resolves the backend on emulators, simulators, or physical devices (Android emulator should use `http://10.0.2.2:8000`, Expo web uses `http://localhost:8000`).

## CI & staging automation

The repository now runs a reusable CI workflow (`.github/workflows/checks.yml`) that installs dependencies, seeds Supabase, boots FastAPI, and asserts `/health` + `/health/db` before every merge. The `CI` workflow (`.github/workflows/ci.yml`) triggers on pushes to `main`/`release/**` and on pull requests. The staging workflow (`.github/workflows/staging.yml`) invokes the same checks for the `staging` branch (and via manual dispatch), then produces a `staging-manifest` artifact to capture the commit/branch metadata that just passed the suite.

## Supporting docs

- `DEMO.md` – reproducible demo script you run for clients, including the portfolio shell at `/portfolio`.
- `DEPLOYMENT.md` – checklist covering API, web, mobile, and monitoring for publishing the stack.

Keep these guides handy when presenting the project or handing it off to another team—you can spin up the CRM/portfolio experience with a single set of scripts plus the documented environment values.
