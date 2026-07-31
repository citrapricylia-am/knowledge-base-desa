import { Pool, type QueryResultRow } from 'pg';

const globalForPg = globalThis as unknown as { __kbDesaPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[db] DATABASE_URL belum diset');
  }
  return new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
  });
}

export const pool = globalForPg.__kbDesaPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__kbDesaPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export default pool;
