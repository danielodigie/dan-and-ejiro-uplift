import cron from 'node-cron';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Timely Uplifts (local): morning 07:30 / midday 13:00 / evening 20:00
// In MVP these log to console + events table; local notifications fire from mobile.
import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function logTimely(slot: string, copy: string) {
  console.log(`[cron] ${slot} uplift: ${copy}`);
  try {
    await db.execute(sql`INSERT INTO events (user_id, name, props) VALUES (NULL, ${'timely_' + slot}, ${JSON.stringify({ copy })})`);
  } catch {}
}

export function startJobs() {
  cron.schedule('30 7 * * *', () => logTimely('morning', 'Start today with intention.'));
  cron.schedule('0 13 * * *', () => logTimely('midday', "Take a breath. You're still moving forward."));
  cron.schedule('0 20 * * *', () => logTimely('evening', 'What are you proud of today?'));
}

// Safety (§29): crisis keywords never get a normal uplift — route to human help.
const CRISIS_RE = /self[\s-]?harm|suicid|kill myself|end my life|hurt myself/i;
export function crisisResponse() {
  return {
    crisis: true,
    greeting: 'You matter.',
    body: "You matter and you don't have to carry this alone. Please reach out to someone you trust or your local crisis helpline right now.",
    action: 'Text or call one trusted person, or your local crisis line, in the next 10 minutes.',
    category: 'hope',
  };
}
export function isCrisis(text?: string | null) {
  return !!text && CRISIS_RE.test(text);
}

function r2() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });
}

export async function presignPut(key: string, contentType: string) {
  const cmd = new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2(), cmd, { expiresIn: 900 });
}

export async function presignGet(key: string) {
  const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key });
  return getSignedUrl(r2(), cmd, { expiresIn: 900 });
}
