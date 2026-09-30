# Phase 3 — Content Engine

114 seed messages × 2 greetings each = **228 greeting-variants** across all 18 categories + 12 faith messages (opt-in only). Path to 350+: add a 3rd greeting + 1 style rewrite per seed (114 × 3 = 342 + 12 faith extras).

## Files
- `taxonomy.json` — categories, moods, situations, styles, intents, needs (matches PRD §6-8)
- `schema.json` — message shape (body 40-280ch, action 10-140ch, faith rules)
- `uplifts.json` — 114 seeds, all categories covered, faith messages carry `scripture`
- `actions.json` — 3 small actions per category (PRD §12)
- `lint.mjs` — `node packages/content/lint.mjs`
- `../engine/selectUplift.mjs` — deterministic picker: filter by mood/situation/style/faith, exclude last 7 seen, graceful fallback

## Rules (enforced by lint)
1. Personal, never generic — every message has mood + situation tags
2. Body ≤280 chars, action ≤140 chars, achievable today
3. Banned: toxic positivity ("just be positive"), shame, medical advice
4. Crisis words never ship as content — route to human resources instead
5. Faith content only when `faithOptIn=true`; never forced
6. "Request another" never repeats within 7 days (engine `seenIds`)

## Review sheet
See `review.csv` — Dan & Ejiro approve tone per message (approve / edit / drop).
