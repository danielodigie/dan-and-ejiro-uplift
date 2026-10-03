import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db.js';
import * as authSchema from './auth-schema.js';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
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
});
