import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { phoneNumber } from 'better-auth/plugins/phone-number';
import { db } from './db.js';
import * as authSchema from './auth-schema.js';
import { normalizePhone, sendTermiiOtp, sendResendEmail } from './notify.js';

export const auth = betterAuth({
  // RENDER_EXTERNAL_URL is set automatically by Render (no dashboard var needed).
  baseURL: process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me',
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResendEmail({
        to: user.email,
        subject: 'Reset your Uplift password',
        html: `<p>You asked to reset your Dan and Ejiro Uplift password.</p><p><a href="${url}">Set a new password</a></p><p>This link expires in 1 hour. If you did not ask, ignore this email.</p>`,
      });
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber, code }) => sendTermiiOtp(phoneNumber, code),
      sendPasswordResetOTP: ({ phoneNumber, code }) => sendTermiiOtp(phoneNumber, code),
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber.replace(/\D/g, '')}@phone.uplift.local`,
        getTempName: (phoneNumber) => phoneNumber,
      },
      phoneNumberValidator: (phoneNumber) => normalizePhone(phoneNumber) !== null,
      expiresIn: 300,
      otpLength: 6,
      allowedAttempts: 5,
    }),
  ],
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
