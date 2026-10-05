import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || '';
// Hosted Postgres (Supabase pooler / Neon / Render) needs TLS, but its cert
// chain fails Node verification (SELF_SIGNED_CERT_IN_CHAIN). Fix: strip any
// `sslmode` from the URL so node-postgres does NO URL-driven TLS parsing,
// then pass one explicit relaxed object. Local URLs have no sslmode and no
// known hosted host, so local dev connects plainly as before.
const isHosted =
  /sslmode=/i.test(connectionString) ||
  /pooler\.supabase\.com/i.test(connectionString) ||
  connectionString.includes('neon.tech') ||
  connectionString.includes('render.com') ||
  process.env.PGSSL === 'true';
const cleanConnectionString = connectionString
  .replace(/([?&])sslmode=[^&]*/i, '$1')
  .replace(/[?&]$/, '');

const pool = new pg.Pool(
  isHosted
    ? { connectionString: cleanConnectionString, ssl: { rejectUnauthorized: false } }
    : { connectionString },
);
export const db = drizzle(pool);
