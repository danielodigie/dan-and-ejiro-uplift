# Dan and Ejiro Uplift — Implementation Plan

Source of truth: `DAN AND EJIRO UPLIFT.md` (PRD, 38 sections) + `README.md`
North Star: **Does this help the user feel encouraged, strengthened, and more capable of taking their next positive step?**
Core loop: **Understand → Encourage → Act → Reflect → Grow → Return**
Promise: **The right encouragement for the right moment.**

This plan turns the PRD into buildable phases, starting from design system → architecture → content → MVP → growth → monetization.

---
## Phase 0 — Scope Lock & Foundations (Week 1)

Goal: freeze MVP so v1 does not try to do everything (PRD §33).

### MVP in scope (17 items)
1. User onboarding (feel + situation + goal + style)
2. Mood check-in (Great / Good / Okay / Low / Struggling)
3. Situation selection (Career, School, Business, Finances, Relationships, Family, Growth, Confidence, Purpose, Failure, Life changes)
4. Goal selection + basic goals CRUD
5. Encouragement style prefs (Gentle, Bold, Motivational, Practical, Spiritual, Reflective, Friendly, Direct) — changeable anytime
6. Personalized Daily Uplift (Today's Uplift)
7. I Need a Lift (11 intents: discouraged, confidence, overwhelmed, motivation, failure, afraid to start, lonely, hope, keep going, decision, strength)
8. Encouragement categories (18: Hope, Confidence, Motivation, Strength, Courage, Success, Failure, Relationships, Career, Money, Purpose, Self-belief, Gratitude, Discipline, Leadership, Faith, Family, Growth)
9. Timely Uplifts (morning / midday / pre-event / evening, user-controlled frequency)
10. Save Uplifts + collections
11. Share Uplifts
12. Uplift Actions (small achievable challenge per message)
13. Basic journal + "Look How Far You've Come"
14. Faith-based option (opt-in, never forced)
15. User profile / preferences
16. Uplift Streak (no-shame) + Celebrate Progress
17. Premium membership stub (paywall + entitlements, 1-2 premium perks to test willingness to pay)

### Explicitly OUT of MVP
Community feed, Stories, Encourage Someone full builder, Audio, Gifting packs, Family plans, Partnerships, Advanced insights (§35). Build hooks for them, don't build them.

### Deliverables
- [ ] Frozen user stories for 5 tabs: Home / I Need a Lift / Goals / Journal / Profile (§31)
- [ ] Example journeys mapped: Morning open → Afternoon I Need a Lift → Evening reflection (§32)
- [ ] Analytics events list tied to §34 (engagement, relevance, action, retention, sharing, saves, pay)
- [ ] Safety principle doc: companion not dependency, no clinical claims, crisis resources link, never shame on streak miss (§29)

---
## Phase 1 — Design System (Week 1-2)

Goal: make it feel Warm, Human, Hopeful, Trustworthy, Peaceful — never preachy, fake, corporate, generic, judgmental (§30).

### 1.1 Brand tokens
- Colors: warm neutrals + 1 hopeful primary (e.g. deep warm sunrise amber) + calm secondary (sage/teal). Light-first, dark mode supported. Contrast AA minimum.
- Typography: humanist sans for UI (e.g. Nunito Sans / Inter) + gentle serif for Uplift message display (e.g. Fraunces / Lora) to feel personal not corporate.
- Shape / motion: large rounded cards (20-24px), soft shadows, slow fade/slide (200-300ms), no bouncy gamified animations. Celebrations are quiet confetti or glow, not loud.
- Voice & tone rules: 2nd person, present, permission-giving. E.g. "You don't need to solve everything today." Max 280 chars for card + optional 1-sentence action. Faith content clearly labeled.

### 1.2 Component library (build once, reuse everywhere)
- `UpliftCard` (greeting + message + actions: Save, Like, New, Reflect, Make Action, Share, Send)
- `MoodPicker` (5 emoji + labels), `SituationPicker`, `GoalPicker`, `StylePicker` (multi-select chips)
- `NeedLiftGrid` (11 intents + 10 "I need..." moments: Hope, Strength, Motivation, Courage, Confidence, Faith, Focus, Peace, Love, Fresh Start)
- `ActionChip`, `StreakPill` ("7 Days of Showing Up — Start again. Keep going."), `CelebrationBanner`, `JournalEditor`, `PaywallSheet`
- Empty states: "No saves yet — your meaningful ones will live here."

### 1.3 Screens (Figma first, 5 tabs)
Home, I Need a Lift flow (intent → situation → message → action), Goals list/detail, Journal list/editor + Look How Far You've Come, Profile (style, topics, times, faith, favorites).

### Deliverables
- [ ] Figma tokens + 12 core components + 5 tab prototypes
- [ ] Copy guidelines with 10 good / 10 banned examples (no "just be positive!")
- [ ] Accessibility checklist: 44pt targets, dynamic type, screen reader labels for mood

---
## Phase 2 — Architectural Decision (Week 2)

Goal: one codebase, local-first for MVP, no Supabase, no Vercel. All runtime on your device except Cloudflare R2 for files.

### Agreed stack (per your decisions)
- **App:** Expo React Native + Expo Router + TypeScript. Run locally via Expo Go + web via local Metro (`npx expo start`). Covers §4 audience without store deploys for MVP.
- **Database:** Local PostgreSQL 16 on your device (DB `uplift`). Managed via Drizzle ORM + Drizzle Kit migrations. Backed up with `pg_dump` nightly to local folder (later to R2).
- **Auth:** Better Auth (self-hosted) with Postgres adapter. Email+password in MVP, anonymous/guest option, OAuth (Google/Apple) later. Sessions in Postgres, no third-party auth server.
- **Backend API:** Node.js + Hono (or Express) + TypeScript in `/apps/api`, running locally on `http://localhost:3000` (LAN: `http://<your-lan-ip>:3000` for phone testing). Owns: profiles, uplifts engine API, goals, journal, saves, streaks, entitlements, R2 presigned URLs, cron jobs.
- **File storage:** Cloudflare R2 (S3-compatible) for share-card images, future audio, journal attachments. Backend generates presigned PUT/GET URLs; no public buckets in MVP.
- **Hosting (MVP):** Local device only. Backend via `pnpm dev` (later PM2 as Windows service), Postgres as Windows service, Expo dev server on LAN. No Supabase, no Vercel in this phase. Cloud deploy deferred until post-MVP.
- **Payments:** Stubbed locally in MVP (`entitlements.tier` flag toggled in Profile dev menu). RevenueCat / Stripe added only when you move off local hosting.
- **Notifications:** `node-cron` in API for morning/midday/evening jobs + local scheduling in app. Expo Push deferred (requires cloud); for MVP use in-app + local notifications.
- **Analytics:** Local `events` table in Postgres for §34 metrics (no PostHog cloud yet). Export CSV for review. Add PostHog later when hosted.
- **Personalization v1:** deterministic rule engine in TypeScript (no LLM required). LLM optional in v1.1 behind flag.

Why this fits: full data ownership, zero cloud cost, works offline on LAN, easy to migrate later (Postgres is Postgres; R2 is S3-compatible; Better Auth travels with you).

### Monorepo structure (local-first)
```
/apps/mobile (expo + expo-router, API_URL=http://<lan-ip>:3000)
/apps/api (hono + better-auth + drizzle + pg + R2 client + node-cron)
/packages/ui (design system components)
/packages/content (seed messages, categories, actions)
/packages/engine (personalization rules, streak, actions logic)
/packages/db (drizzle schema + migrations + seed)
/docs
```
No `/supabase` folder. Migrations live in `/packages/db/migrations`.

### Data model (local Postgres + Drizzle)
Same tables as before, enforced in app layer (no RLS — trusted local API + Better Auth session):
- `users` (id, email, name, timezone, created_at) — managed by Better Auth (`user`, `session`, `account`, `verification` tables + your `users` profile extension)
- `profiles` (user_id FK, moods[], situations[], goals_focus[], styles[], faith_opt_in bool, notify_times jsonb, frequency)
- `uplifts` (id, body, greeting_variant, category, moods[], situations[], styles[], faith bool, action_text, tone_score)
- `checkins` (id, user_id, mood, note, created_at)
- `goals` (id, user_id, title, category, why, target_date, status)
- `goal_steps` (id, goal_id, action_text, done_at)
- `saves` (user_id, uplift_id, collection), `likes` (user_id, uplift_id), `shares` (user_id, uplift_id, channel, r2_key)
- `journal_entries` (id, user_id, prompt, body, mood, gratitude[], victory bool, created_at, r2_keys[])
- `streaks` (user_id, current_count, longest, last_seen_date, grace_used)
- `entitlements` (user_id, tier free/premium-stub, packs[], expires_at)
- `events` (id, user_id, name, props jsonb, created_at) — local analytics for §34
- `files` (id, user_id, r2_key, purpose, mime, size, created_at) — R2 object registry

Auth checks: every `/api/*` route requires Better Auth session; users can only access own `user_id` rows; `uplifts` read-only for signed-in users.

### Local setup (Windows)
1. Install PostgreSQL 16, create DB: `createdb uplift`, user `uplift` + password. Connection: `DATABASE_URL=postgres://uplift:<pw>@localhost:5432/uplift`
2. Better Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`, email/password enabled, Drizzle adapter to same DB.
3. R2: bucket `uplift-files`, keys `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (private; use presigned URLs, 15-min expiry).
4. API `.env`: `DATABASE_URL`, `BETTER_AUTH_*`, `R2_*`, `API_PORT=3000`, `MOBILE_URL=http://<lan-ip>:8081`.
5. Run: `pnpm --filter db migrate` → `pnpm --filter api dev` → `npx expo start --lan` in mobile. Phone + PC on same Wi-Fi.

### Core services (local API)
- `selectUplift({mood, situation, goal, style, faith, history})` → filters by tags, excludes last 7 seen, prefers style match, falls back gracefully. Pure function in `packages/engine`, unit-testable, called by API.
- `DailyJob (node-cron)` → generates Today's Uplift per user at 6-8am local, respects frequency caps (never annoying §13). Runs in API process locally.
- `StreakService` → increments on any meaningful open, 1-day grace, message: "Start again. Keep going."
- `ActionService` → maps category → 1 small action (PRD §12 examples).
- `StorageService (R2)` → `PUT /api/files/presign` returns presigned URL; mobile uploads direct to R2; API stores `files` row. Downloads via `GET /api/files/:id/url`.
- `AuthService (Better Auth)` → sign-up/sign-in/sign-out/session, password reset locally; all API routes check `auth.api.getSession`.

### Deliverables
- [ ] ADR-001 (revised): Expo + Local Postgres + Better Auth + R2 + Local hosting (Supabase/Vercel explicitly rejected per decision)
- [ ] ERD + Drizzle schema + seed in `packages/db`
- [ ] API contract (`/api/auth/*`, `/api/uplifts/today`, `/api/lift`, `/api/goals`, `/api/journal`, `/api/files/*`, `/api/events`) + local `events` schema for PostHog-equivalent funnels
- [ ] Env strategy local-only: `.env` per app (gitignored), `.env.example` committed, secrets stay on device; nightly `pg_dump` backup script

---
## Phase 3 — Content Engine (Week 2-3, parallel with design)

You don't have motivational quotes — you have moment-matched encouragement (§36). Content is code.

- Seed library target: 350 messages minimum: 18 categories × ~15 each + style variants (gentle/bold/practical) + 40 faith variants (scripture + prayer + reflection, opt-in only).
- Each message shape: `{greeting, body (≤280ch), action, categories[], moods[], situations[], styles[], faith?}`
- Tone lint: no toxic positivity, no medical advice, no shaming. Crisis keywords (e.g. self-harm) → show supportive resources + human help prompt, never try to counsel.
- "Request another" must never repeat within 7 days.

Deliverables: `packages/content/*.json` + lint script + review sheet for Dan & Ejiro to approve tone.

---
## Phase 4 — MVP Build Sprints (Weeks 3-6)

### Sprint A — Onboarding + Profile
Flow: Welcome → How feel? → What dealing with? → What achieve? → How like to be encouraged? → Faith pref? → Notify times? → First Uplift. Editable in Profile. Persist to `profiles`.

### Sprint B — Home / Today's Uplift + Actions
`GET today's uplift` via engine, display in UpliftCard, actions: Save/Like/Another/Reflect/Make Action/Share/Send. Log relevance (like/save/share = meaningful).

### Sprint C — I Need a Lift + Categories + I Need... grid
2-tap rescue: Need (11) → optional Situation → Message + Action. Categories browser reuses same engine.

### Sprint D — Goals + Timely + Streak + Celebrate
Goals CRUD + "next useful action" copy (not just "you can do it"). Timely jobs + frequency settings. Streak + celebration banner for showing up, trying again, helping someone.

### Sprint E — Journal + Saved + Share
Journal CRUD + prompts ("What are you proud of today?") + Look How Far You've Come (query past victories/goals). Saved collections (Need, Confidence, Faith, Career, Morning, Difficult Days, Favorites). Share via OS sheet with branded card: "Someone needs to hear this today: ..."

Acceptance: new user can complete Morning → Afternoon → Evening journey (§32) without errors offline-tolerant (cache today's uplift).

---
## Phase 5 — Premium & Value Test (Week 6-7)

Free: Daily, basic check-ins, selected categories, sharing, basic goals (PRD §26).
Premium test: 1) Deeper personalization (style-matched variants + journeys), 2) Exclusive collections + guided reflections, 3) Progress insights.
Implement: paywall, restore, entitlements, 1 premium collection (e.g. Confidence Pack) to prove willingness to pay before building all packs.

---
## Phase 6 — Quality, Safety, Analytics (Week 7-8)

- Testing: unit (engine, streak), integration (API auth via Better Auth, Drizzle, R2 presign mock), E2E (Detox/Maestro for 3 journeys), visual (components).
- Performance: cold start <2s, uplift render <500ms cached, API p95 <200ms on localhost.
- Privacy: local-first — data stays on your device + R2 files; delete account + export data, minimal PII, faith data treated as sensitive. Backups encrypted.
- Analytics dashboard (local): query `events` table for §34: D1/D7/D30 retention, % meaningful (like/save/share per view), action completion rate, share rate, save revisit rate, free→paid-stub conversion.
- Beta: 30-50 users (young adults, professionals, faith users), 2-week diary study: "Did it feel personal?"

---
## Phase 7 — Launch & Iterate (Week 8+)

- Local launch checklist: Postgres service running, API on :3000 reachable via LAN, Expo `--lan` tested on real phone, node-cron times correct, R2 presign works, premium-stub toggle works, crisis resources, support email. No store release required for MVP validation.
- Post-MVP roadmap (in order): Encourage Someone builder → Stories → Community (encouragement not comparison, moderated) → Audio (stored in R2) → Packs/Gifting → Family/Org plans (§35). Cloud migration (hosted Postgres + hosted API) only when you outgrow local.
- Post-MVP roadmap (in order): Encourage Someone builder → Stories → Community (encouragement not comparison, moderated) → Audio → Packs/Gifting → Family/Org plans (§35).

### Rough effort
Solo dev + AI assist: 8 weeks to TestFlight. Small team (1 dev + 1 designer): 5-6 weeks.

---
## Risks & Mitigations
- Generic feel → rule engine + history exclusion + style variants + human-reviewed seeds.
- Notification fatigue → frequency caps + quiet hours + easy opt-down.
- Faith sensitivity → strict opt-in flag, separate content pool.
- Dependency risk (§29) → copy encourages action + human connection + professional help where needed.

---
## Next step
Stack locked (Expo + Local Postgres + Better Auth + R2 + Local hosting). Next: scaffold `/apps/mobile` + `/apps/api` + `/packages/db` with Drizzle + Better Auth wiring. I can do that next.
