# Deploy: Frontend (Netlify) + API (Render) + DB (Neon)

Architecture: `apps/web` → Netlify (free `*.netlify.app` domain),
`apps/api` (Node/Hono, node-cron preserved) → Render, Postgres → Neon.
Minimal code changes were made: CORS/`FRONTEND_URL`, `PORT`, Neon SSL in
`apps/api/src/db.ts`, `trustedOrigins` in `apps/api/src/auth.ts`.

## 0. Push this branch

```powershell
git add -A
git commit -m "Deploy: Netlify web frontend + Render API + Neon Postgres"
git push origin main
```

## 1. Neon (hosted Postgres, free tier)

1. https://neon.tech → New Project → name `uplift`, Postgres 16, region closest to you.
2. Copy the **pooled** connection string (ends `?sslmode=require`).
3. Initialise schema + seed (one time, from your PC):
```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.neon.tech/uplift?sslmode=require"
psql $env:DATABASE_URL -f packages/db/schema.sql
pnpm --filter @uplift/db seed
```
4. Keep the string secret — it goes into Render as `DATABASE_URL`, never in git.

## 2. Render (Node API, free/low-cost)

1. https://render.com → New → Web Service → connect repo `dan-and-ejiro-uplift`.
2. Settings:
   - Root Directory: `apps/api`
   - Build Command: `npm install`
   - Start Command: `npx tsx src/index.ts`
   - Health Check Path: `/api/health`
   - Auto-deploy: Yes (pushes to `main` redeploy automatically).
3. Environment variables (Dashboard → Environment, all secret there):
   - `DATABASE_URL` = Neon pooled string
   - `BETTER_AUTH_SECRET` = 32+ random chars (Generate)
   - `BETTER_AUTH_URL` = `https://<your-render-service>.onrender.com` (after first deploy; then redeploy)
   - `FRONTEND_URL` = `https://<your-site>.netlify.app` (after step 3; then redeploy)
   - `LLM_ENABLED` = `false` (set `true` + `GEMINI_API_KEY` only if you want Gemini)
   - `R2_*` only if you use file uploads.
4. Verify: `https://<your-render-service>.onrender.com/api/health` → `{"ok":true,...}`.
5. node-cron: `startJobs()` runs in-process. On Render Free the instance sleeps
   when idle, so jobs fire while awake. For exact times, add a Render Cron Job
   that wakes the service, or upgrade to Starter ($7/mo, no sleep).

## 3. Netlify (web frontend, free domain)

1. https://app.netlify.com → Add new site → Import an existing project →
   GitHub → `dan-and-ejiro-uplift`. `netlify.toml` auto-fills:
   Base `apps/web`, build `npm install && npm run build`, publish `dist`.
2. Build settings → Environment → `VITE_API_URL` =
   `https://<your-render-service>.onrender.com` (must be set BEFORE the first
   production build, since Vite bakes it in at build time).
3. Deploy. You get `https://<your-site>.netlify.app` free.
4. Auto-deploy: Site settings → Build & deploy → Continuous deployment →
   connected to GitHub `main` — every push rebuilds automatically.
5. Back in Render, set `FRONTEND_URL` to the Netlify URL and redeploy the API
   (required for login cookies/CORS).

## 4. Mobile app (Expo, local dev)

```powershell
$env:EXPO_PUBLIC_API_URL="https://<your-render-service>.onrender.com"
pnpm --filter @uplift/mobile start
```

## Troubleshooting

- Login fails on Netlify but works locally → `FRONTEND_URL` on Render must
  exactly match the Netlify URL, and `BETTER_AUTH_URL` must be the Render URL.
- DB errors → confirm `?sslmode=require` is in `DATABASE_URL`; run schema.sql once.
- Blank page after Netlify build → confirm `VITE_API_URL` was set before build;
  trigger "Clear cache and deploy" after changing it.
