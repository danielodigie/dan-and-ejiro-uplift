import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db.js';
import * as authSchema from './auth-schema.js';

export const auth = betterAuth({
  // RENDER_EXTERNAL_URL is set automatically by Render (no dashboard var needed).
  baseURL: process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me',
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  // Production (Netlify frontend + Render API are cross-site): cookies must be
  // trusted explicitly or Better Auth rejects the origin.
  trustedOrigins: (process.env.FRONTEND_URL || process.env.MOBILE_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  // Cross-site session: Lax (default) is never sent back by browsers on
  // fetch to another site, so every post-login call 401s. None+Secure
  // makes the browser attach the cookie on the Netlify -> Render calls.
  advanced: {
    cookies: {
      session_token: { attributes: { sameSite: 'none', secure: true } },
      session_data: { attributes: { sameSite: 'none', secure: true } },
    },
  },
});
