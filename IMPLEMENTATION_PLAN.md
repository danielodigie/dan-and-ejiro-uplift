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

Goal: one codebase, zero DevOps burden, ship iOS + Android + Web.

### Recommended stack (default)
- **App:** Expo React Native + Expo Router + TypeScript. One codebase ships to iOS, Android, Web (PWA). Fastest for solo/small team, covers broad audience (§4).
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Storage + Realtime + Push via Expo). No server to manage. Row Level Security per user.
- **Payments:** RevenueCat (wraps App Store / Play + Stripe for web) for Premium, Packs, Gifting.
- **Notifications:** Expo Push + Supabase pg_cron for morning/midday/evening jobs.
- **Analytics:** PostHog (product events + funnels for §34).
- **Personalization v1:** deterministic rule engine in TypeScript (no LLM required). LLM optional in v1.1 for deeper variants behind feature flag.
- **Hosting web:** Vercel (Expo web export) or EAS Hosting.

Why not native-first (Swift/Kotlin) or Next.js-only? Native doubles work; web-only misses habit + push + streak power essential to encouragement loop. Expo gives 80% native feel at 40% cost.

Alternative if web-first validation preferred: Next.js PWA + Supabase, then wrap with Capacitor. Only choose if you cannot do app store releases in MVP.

### Monorepo structure (proposed)
```
/apps/mobile (expo)
/packages/ui (design system components)
/packages/content (seed messages, categories, actions)
/packages/engine (personalization rules, streak, actions logic)
/packages/api (supabase client, types)
/supabase (migrations, edge functions: daily-uplift, timely-send)
/docs
```

### Data model (Postgres)
- `users` (id, email, name, timezone, created_at)
- `profiles` (user_id FK, moods[], situations[], goals_focus[], styles[], faith_opt_in bool, notify_times jsonb, frequency)
- `uplifts` (id, body, greeting_variant, category, moods[], situations[], styles[], faith bool, action_text, tone_score)
- `checkins` (id, user_id, mood, note, created_at)
- `goals` (id, user_id, title, category, why, target_date, status)
- `goal_steps` (id, goal_id, action_text, done_at)
- `saves` (user_id, uplift_id, collection), `likes` (user_id, uplift_id), `shares` (user_id, uplift_id, channel)
- `journal_entries` (id, user_id, prompt, body, mood, gratitude[], victory bool, created_at)
- `streaks` (user_id, current_count, longest, last_seen_date, grace_used)
- `entitlements` (user_id, tier free/premium, packs[], expires_at)

RLS: users can only read/write own rows; `uplifts` read-only for all authenticated.

### Core services
- `selectUplift({mood, situation, goal, style, faith, history})` → filters by tags, excludes last 7 seen, prefers style match, falls back gracefully. Pure function, unit-testable.
- `DailyJob` → generates Today's Uplift per timezone at 6-8am local, respects frequency caps (never annoying §13).
- `StreakService` → increments on any meaningful open (not just streak screen), 1-day grace, message: "Start again. Keep going."
- `ActionService` → maps category → 1 small action (PRD §12 examples).

### Deliverables
- [ ] ADR-001: Expo + Supabase + RevenueCat (with alternatives rejected)
- [ ] ERD + Supabase migrations v1
- [ ] API contract + event schema for PostHog
- [ ] Env strategy: dev / preview / prod, secrets in EAS + Supabase Vault

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

- Testing: unit (engine, streak), integration (jobs, RLS), E2E (Detox/Maestro for 3 journeys), visual (components).
- Performance: cold start <2s, uplift render <500ms cached.
- Privacy: delete account + export data, minimal PII, faith data treated as sensitive.
- Analytics dashboard for §34: D1/D7/D30 retention, % meaningful (like/save/share per view), action completion rate, share rate, save revisit rate, free→paid conversion.
- Beta: 30-50 users (young adults, professionals, faith users), 2-week diary study: "Did it feel personal?"

---
## Phase 7 — Launch & Iterate (Week 8+)

- Store listings using taglines: "A little encouragement can change your day." / "The right words. The right moment. Keep moving."
- Launch checklist: push certs, pg_cron times, RevenueCat products, PostHog funnels, crisis resources, support email.
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
Approve stack (Expo + Supabase) and Figma direction, then start Phase 1 + 2 in parallel. I can scaffold `/apps/mobile` + Supabase migrations next.
