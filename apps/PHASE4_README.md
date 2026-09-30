# Phase 4 — MVP Skeleton (local-first)

Stack: Expo (LAN) + Hono API on `localhost:3000` + Local Postgres + Better Auth + R2 (presign stubbed).

## Run locally (Windows)
1. Postgres: create DB `uplift`, set `apps/api/.env` from `.env.example` (copy, fill password + LAN IP).
2. DB: `pnpm --filter @uplift/db migrate` then seed uplifts (import `packages/content/uplifts.json` via Drizzle seed — Sprint D).
3. API: `pnpm --filter @uplift/api dev` → http://localhost:3000/api/health
4. Mobile: set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000`, then `pnpm --filter @uplift/mobile start --lan`, open in Expo Go (same Wi-Fi).

## What's built
- Sprint A: Onboarding (mood/situation/style) + Profile tab (edit via restart)
- Sprint B: Home/Today's Uplift (`GET /api/uplifts/today`) with offline fallback
- Sprint C: I Need a Lift (11 intents) + categories endpoint
- Sprint D (stub): Goals tab local state + `goals` tables in schema; node-cron + full CRUD next
- Sprint E (stub): Journal/Saved/Share local state + `journal_entries/saves/shares/files` tables; R2 presign next

Full CRUD + Better Auth session wiring + R2 + streak/events land next as Sprint D/E follow-ups.
