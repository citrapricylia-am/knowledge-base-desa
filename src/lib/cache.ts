import { createHash } from 'crypto';
import { query, queryOne } from './db';
import type { NarasiJson } from './types';

/** Hash cache = SHA256(kode_bps + anggaran_tier_bucket) — guide §2 */
export function buildCacheHash(kodeBps: string, anggaran: number): string {
  // Bucket anggaran ke 1jt agar cache tidak meledak per rupiah
  const bucket = Math.round(anggaran / 1_000_000) * 1_000_000;
  return createHash('sha256').update(`${kodeBps}:${bucket}`).digest('hex');
}

export async function getCachedNarasi(
  kodeBps: string,
  anggaran: number,
): Promise<{ narasi: NarasiJson; sumber: string } | null> {
  const hash = buildCacheHash(kodeBps, anggaran);
  const row = await queryOne<{ narasi_json: NarasiJson; sumber: string }>(
    `SELECT narasi_json, sumber FROM narasi_cache
     WHERE kode_bps = $1 AND hash_parameter = $2`,
    [kodeBps, hash],
  );
  if (!row) return null;
  return { narasi: row.narasi_json, sumber: row.sumber };
}

export async function setCachedNarasi(
  kodeBps: string,
  anggaran: number,
  narasi: NarasiJson,
  sumber: 'llm' | 'template',
): Promise<void> {
  const hash = buildCacheHash(kodeBps, anggaran);
  await query(
    `INSERT INTO narasi_cache (kode_bps, hash_parameter, narasi_json, sumber)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (kode_bps, hash_parameter) DO UPDATE SET
       narasi_json = EXCLUDED.narasi_json,
       sumber = EXCLUDED.sumber,
       dibuat_pada = now()`,
    [kodeBps, hash, JSON.stringify(narasi), sumber],
  );
}
