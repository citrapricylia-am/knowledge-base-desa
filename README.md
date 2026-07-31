# Knowledge Base Potensi Desa

Sistem penyaringan investasi sosial berbasis **Podes 2025 + IDM 2024** untuk 83.379 desa/kelurahan Indonesia.

Spesifikasi: `PRODUCTION-DEV-GUIDE` v1.1.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- PostgreSQL (`pg`)
- Anthropic Claude Haiku (opsional, formatting narasi) + template fallback
- Python sync script (`pandas` + `psycopg2`)

## Setup cepat

### 1. Dependencies

```bash
npm install
# Python (untuk sync data)
pip install pandas openpyxl psycopg2-binary
```

### 2. Environment

```bash
cp .env.example .env.local
# isi DATABASE_URL, (opsional) ANTHROPIC_API_KEY
```

### 3. Database

```bash
psql "$DATABASE_URL" -f scripts/init_db.sql
psql "$DATABASE_URL" -f scripts/seed_kegiatan.sql
```

### 4. Load data Excel

File sumber: `00Desa25Podes25Idm24.xlsx` (sheet `Raw`).

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://..."
python scripts/sync.py --file "C:\path\to\00Desa25Podes25Idm24.xlsx" --dry-run
python scripts/sync.py --file "C:\path\to\00Desa25Podes25Idm24.xlsx"
```

Verifikasi:

```sql
SELECT COUNT(*) FROM desa; -- ~83379
SELECT COUNT(*) FROM desa WHERE klasifikasi_podes IS NOT NULL; -- ~65570
```

### 5. Jalankan app

```bash
npm run dev
```

Buka http://localhost:3000

## Alur pengguna

1. Cari desa (min 2 karakter) → autocomplete menampilkan desa + kec + kab + prov
2. Input anggaran (Rp)
3. Submit → `POST /api/analisis`
4. Sistem hitung coverage → tier (FULL/MAJOR/MEDIUM/SMALL/MICRO) → pilih kegiatan dari `kegiatan_config` → format narasi (LLM atau template) → cache

## API

| Method | Path | Ket |
|--------|------|-----|
| GET | `/api/desa/search?q=` | Full-text + ILIKE |
| GET | `/api/desa/:kode` | Profil publik (tanpa kolom teknis) |
| POST | `/api/analisis` | `{ kode_bps, anggaran }` |
| GET | `/api/cakupan` | Statistik transparansi data |

## Struktur

```
scripts/
  init_db.sql
  seed_kegiatan.sql
  sync.py
src/
  lib/       db, analisis, llm, cache, types, format
  app/       pages + API routes
  components/
```

## Catatan penting (dari guide)

- Jangan tampilkan `has_pasar` / gunakan `village_id` sebagai PK
- Selalu tampilkan nama desa **bersama** kecamatan & kabupaten
- LLM **tidak** menentukan kegiatan — hanya memformat
- 17.809 desa tanpa skor Podes: tampilkan profil IDM + alert, tanpa rekomendasi kegiatan
- Data survei statis — jangan klaim real-time

## Checklist demo

- [ ] DB terisi ~83k baris
- [ ] Search `Belatung Embaloh` return 1 hasil
- [ ] Analisis kode `5611012004`, anggaran 100000000 → narasi + tier SMALL
- [ ] Tanpa `ANTHROPIC_API_KEY` → fallback template tetap jalan
