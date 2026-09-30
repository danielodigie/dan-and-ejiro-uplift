import cron from 'node-cron';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Timely Uplifts (local): morning 07:30 / midday 13:00 / evening 20:00
// In MVP these log to console + events table; local notifications fire from mobile.
export function startJobs() {
  cron.schedule('30 7 * * *', () => console.log('[cron] Morning uplift: Start today with intention.'));
  cron.schedule('0 13 * * *', () => console.log("[cron] Midday uplift: Take a breath. You're still moving forward."));
  cron.schedule('0 20 * * *', () => console.log('[cron] Evening uplift: What are you proud of today?'));
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
