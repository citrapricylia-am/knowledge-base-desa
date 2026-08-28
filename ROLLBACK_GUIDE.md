# Rollback Guide — Knowledge Base Potensi Desa

## Kapan rollback?
Jika setelah push ke GitHub + Vercel deploy, ada masalah dengan web (data salah, UI break, dll), kamu bisa kembali ke state sebelum Fase 1.

## Layer 1: Kode (Git)

### Lihat rollback point
```bash
git tag -l
# v-before-fase1
```

### Rollback kode ke sebelum Fase 1
```bash
cd /home/ubuntu/knowledge-base-desa
git reset --hard v-before-fase1
git push --force origin main
```
Vercel akan auto-redeploy dengan kode lama.

### Kalau mau balik lagi ke Fase 1 (setelah rollback)
```bash
git fetch origin
git reset --hard origin/main
```

## Layer 2: Database (Supabase)

### Tabel backup
`desa_backup_pre_fase1` — snapshot 83.379 baris, semua kolom (lama + baru).

### Cek backup masih ada
```sql
SELECT COUNT(*) FROM desa_backup_pre_fase1;
-- harus 83.379
```

### Rollback database ke state sebelum Fase 1
```sql
-- Update kolom lama dari backup (kalau cuma kolom lama yang bermasalah)
UPDATE desa SET
    skor_overall = b.skor_overall,
    komponen_0 = b.komponen_0,
    komponen_1 = b.komponen_1,
    komponen_2 = b.komponen_2,
    pct_air_bersih = b.pct_air_bersih,
    pct_pertanian = b.pct_pertanian,
    pct_smp_plus = b.pct_smp_plus,
    pct_rumah_miskin = b.pct_rumah_miskin,
    target_air = b.target_air,
    target_pertanian = b.target_pertanian,
    jumlah_rt = b.jumlah_rt,
    jumlah_jiwa = b.jumlah_jiwa,
    luas_hektar = b.luas_hektar,
    estimasi_biaya = b.estimasi_biaya,
    ada_sd = b.ada_sd,
    ada_smp = b.ada_smp,
    ada_faskes = b.ada_faskes
FROM desa_backup_pre_fase1 b
WHERE desa.kode_bps = b.kode_bps;
```

### Rollback TOTAL (kalau mau kembali ke skema lama 37 kolom)
```sql
-- Hapus kolom baru
ALTER TABLE desa
    DROP COLUMN IF EXISTS luas_admin_ha,
    DROP COLUMN IF EXISTS podes2025_prov_nama,
    DROP COLUMN IF EXISTS podes2025_kab_nama,
    DROP COLUMN IF EXISTS podes2025_kec_nama,
    DROP COLUMN IF EXISTS podes2025_desa_nama,
    DROP COLUMN IF EXISTS podes2025_lat,
    DROP COLUMN IF EXISTS podes2025_lon,
    DROP COLUMN IF EXISTS podes2021_status,
    DROP COLUMN IF EXISTS hutan_alam_ha_2024,
    DROP COLUMN IF EXISTS lahan_kritis_status,
    DROP COLUMN IF EXISTS lahan_kritis_ha,
    DROP COLUMN IF EXISTS podes2025_data_tersedia,
    DROP COLUMN IF EXISTS updated_at;

-- Drop tabel ringkasan
DROP TABLE IF EXISTS desa_summary_provinsi;
```

### Hapus backup (kalau sudah yakin tidak butuh)
```sql
DROP TABLE desa_backup_pre_fase1;
```

## Layer 3: Vercel

Vercel auto-deploy dari GitHub main branch. Tidak perlu manual deploy.

### Kalau mau paksa redeploy
1. Buka https://vercel.com/dashboard
2. Pilih project "knowledge-base-desa"
3. Deployments → pilih deploy terbaru → Redeploy

### Kalau mau rollback deployment saja (tanpa rollback kode)
1. Vercel → Deployments
2. Cari deploy sebelum Fase 1 (tanggal 28 Aug 2026 sebelum commit)
3. Klik "..." → "Promote to Production"
