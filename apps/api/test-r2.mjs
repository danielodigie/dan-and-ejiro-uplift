// R2 key test (beginner-friendly). Run after filling apps/api/.env with R2_* values:
//   node apps/api/test-r2.mjs
// Uses the API's installed @aws-sdk/client-s3 (no extra installs).
import 'dotenv/config';
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Missing R2_* in apps/api/.env — see README step 4 (bucket + API token).');
  process.exit(1);
}
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const before = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 }));
console.log(`Bucket OK: ${R2_BUCKET} (${before.KeyCount ?? 0} objects shown, max 5).`);

const key = `test/r2-key-test-${Date.now()}.txt`;
await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: 'Uplift R2 key works.', ContentType: 'text/plain' }));
console.log(`Upload OK: ${key}`);
const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 300 });
console.log(`Presigned URL OK (5 min): ${url.slice(0, 90)}...`);
console.log('R2 key test PASSED.');
