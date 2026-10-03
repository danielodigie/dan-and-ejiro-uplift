import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
// Neon / hosted Postgres requires SSL. `?sslmode=require` in the URL is
// honoured by libpq, but node-postgres needs an explicit ssl object.
const needsSSL =
  !!connectionString &&
  (/sslmode=require/i.test(connectionString) ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('render.com') ||
    process.env.PGSSL === 'true');

const pool = new pg.Pool({
  connectionString,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool);
