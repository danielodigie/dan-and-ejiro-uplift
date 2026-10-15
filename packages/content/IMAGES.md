# Uplift photos — sources & rules

13 nature/scenery photos, one per encouragement category (see `images.json`).
They ship **inside** the apps (`apps/web/public/images/`, `apps/mobile/assets/uplifts/`)
so uplifts look beautiful offline — no hotlinking, no extra accounts.

## Source
Unsplash CDN (`images.unsplash.com`, free Unsplash License, commercial use allowed),
downloaded at 800px wide, quality 60 (~40–150 KB each, ~1 MB total).

Photo IDs used (full URLs recoverable as
`https://images.unsplash.com/photo-<id>?w=800&q=60&auto=format&fit=crop`):
- sunrise-field: 1470252649378-9c29740c9fa8
- mountain-peak: 1506905925346-21bda4d32df4
- foggy-hills: 1470071459604-3b5ec3a7fe05
- forest-road: 1441974231531-c6227db76b6e
- field-sunset: 1472214103451-9374bd1c798e
- lake-tahoe: 1501594907352-04cda38ebc29
- beach: 1507525428034-b723cf961d3e
- ocean-wave: 1518837695005-2083093ee35b
- mountain-lake: 1493246507139-91e8fad9978e
- canoe-lake: 1476514525535-07fb3b4ae5f1
- golden-field: 1500382017468-9049fed747ef
- sky-sunrise: 1495616811223-4d98c6e9c869
- landscape-road: 1500530855697-b586d89ba3ee

## Rules for adding more
1. Same size recipe (`?w=800&q=60&auto=format&fit=crop`) — keeps the APK small.
2. Calm, hopeful scenes only: no people close-ups, no text in the image, no dark/scary tones.
3. Add the file to BOTH `apps/web/public/images/` and `apps/mobile/assets/uplifts/`,
   map it in `images.json` + `apps/mobile/lib/images.ts`, and run the lint.
