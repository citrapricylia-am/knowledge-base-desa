# Laporan Validasi Fase 1 — Sinkronisasi Data Podes 2025

**Tanggal:** 28 Agustus 2026
**File source:** `Desa25_Podes2125_Idm24_Ha24_Lkrit22.xlsx` (Sheet1, 46 kolom)
**File ringkasan:** `00Desa25Podes25Idm24_Res.xlsx` (Sheet1, 3 kolom)
**Database:** Supabase (db.ieiwmuvvumilueyktcsv.supabase.co)

---

## Task 1.1 — Extend skema tabel desa

### Kolom baru ditambahkan (12 + 1 flag)
| Kolom DB | Tipe | Sumber Excel | Status |
|---|---|---|---|
| luas_admin_ha | numeric(12,4) | "Adm Desa (Ha)" | OK |
| podes2025_prov_nama | text | "R101N" | OK |
| podes2025_kab_nama | text | "R102N" | OK |
| podes2025_kec_nama | text | "R103N" | OK |
| podes2025_desa_nama | text | "R104N" | OK |
| podes2025_lat | numeric(10,7) | "R307B1_LAT" | OK |
| podes2025_lon | numeric(10,7) | "R307B1_LON" | OK |
| podes2021_status | text | "(03) DATA PODES 2021" | OK |
| hutan_alam_ha_2024 | numeric(12,4) | "Luas hutan alam" | OK |
| lahan_kritis_status | text | "(06) Lahan Kritis" | OK |
| lahan_kritis_ha | numeric(12,4) | "Luas Lahan Kritis" | OK |
| updated_at | timestamptz | default now() | OK |
| podes2025_data_tersedia | boolean | derived (podes2025_prov_nama IS NOT NULL) | OK |

Total kolom tabel desa: 37 → 50

### Sync result
- Baris dibaca: 83,379
- Baris diterima: 83,379
- Baris ditolak: 0
- Row count setelah sync: 83,379 (sesuai)
- Anti-join (DB vs source): 0 mismatch

### Validasi
- KODE_DESA_: 83,379 unique, semua 10 digit, 0 invalid
- Luas (Adm Desa Ha, Luas hutan alam, Luas Lahan Kritis): semua >= 0, 0 negatif
- Ha24 = "Hutan Alam 24" (label konstan, bukan angka) — terkonfirmasi, tidak dipakai
- Kritis00 = "Kritis" (label konstan, bukan angka) — terkonfirmasi, tidak dipakai

### Koordinat (LAT/LON)
- Data LAT dari Podes 2025 semua positif (0-10.92), tidak pakai tanda negatif
- (0,0) → NULL: 21,635 baris (sel kosong Excel, bukan koordinat asli)
- Valid koordinat: 61,744 baris
- LAT range 0-11 (terima apa adanya, tidak dimanipulasi)
- LON range 95-141
- Catatan: LAT untuk Jawa/Sulawesi/Papua/NTT seharusnya negatif, tapi data source tidak pakai tanda negatif. Nilai absolut benar.

### Podes 2025 coverage
- Desa dengan Podes 2025 data: 61,744 (74%)
- Desa TANPA Podes 2025 data: 21,635 (26%)
- podes2025_data_tersedia = true: 61,744
- podes2025_data_tersedia = false: 21,635
- Cross-check flag vs podes2025_prov_nama: 0 mismatch

### Data tambahan
- Hutan alam > 0 ha: 30,419 desa
- Lahan kritis > 0 ha: 36,183 desa
- updated_at terisi: 83,379 baris

### Sample 10 baris (dari DB, dengan koordinat)
| kode_bps | nama_desa | prov | lat | lon | luas_admin_ha | hutan_ha | lahan_kritis_ha |
|---|---|---|---|---|---|---|---|
| 1101012001 | Keude Bakongan | Aceh | 2.9242 | 97.4837 | 184.13 | 0.016 | 0.0 |
| 1101012016 | Padang Beurahan | Aceh | 2.9278 | 97.4650 | 457.72 | 92.759 | 0.0 |
| 1101022001 | Fajar Harapan | Aceh | 3.1216 | 97.3162 | 405.37 | 0.0 | 0.0 |
| 1101022004 | Gunong Pulo | Aceh | 3.1142 | 97.3267 | 1327.01 | 783.193 | 3.610 |
| 3206272014 | Sirnagalih | Jawa Barat | 7.2965 | 107.9301 | 678.59 | 0.0 | 124.486 |
| 3505162005 | Rejoso | Jawa Timur | 8.1963 | 112.3348 | 473.37 | 0.0 | 134.716 |
| 5319102006 | Golo Nderu | NTT | 8.6445 | 120.7237 | 2074.09 | 646.040 | 0.274 |
| 7211012003 | Lampa | Sulawesi Tengah | 1.6028 | 123.4989 | 1338.72 | 896.843 | 0.0 |
| 8202012023 | Wedana | Maluku Utara | 0.3306 | 127.8622 | 1487.98 | 1005.846 | 371.888 |
| 9671101004 | Tanjung Kasuari | Papua Barat Daya | NULL | NULL | 90.34 | 0.0 | 0.0 |

---

## Task 1.2 — Tabel ringkasan provinsi

- Tabel `desa_summary_provinsi` dibuat
- File Res.xlsx: 315 baris total, hanya 38 baris provinsi asli yang valid
- Baris non-provinsi (label kategori, breakdown, blank) di-skip
- 38 provinsi terinsert, total jumlah desa = 83,379 (cocok)
- Top 5: Jawa Tengah (8.562), Jawa Timur (8.492), Aceh (6.494), Sumatera Utara (6.108), Jawa Barat (5.957)

---

## Task 1.3 — Flag ketersediaan data Podes 2025

- Kolom `podes2025_data_tersedia` (boolean) ditambahkan
- Update: `podes2025_data_tersedia = (podes2025_prov_nama IS NOT NULL)`
- True: 61,744 | False: 21,635
- 0 mismatch antara flag dan podes2025_prov_nama

---

## File yang dimodifikasi
1. `scripts/init_db.sql` — tambah 13 kolom baru + tabel desa_summary_provinsi
2. `scripts/sync.py` — rewrite dengan mapping 46 kolom, validasi lat/lon/luas, laporan
3. `src/lib/types.ts` — tambah 13 field ke interface Desa + interface ProvinsiSummary
4. `.env.local` — connection string Supabase (tidak di-push ke GitHub)

## Status
- Fase 1 (data): SELESAI
- Task 2.1 & 2.3: siap dimulai (konsumen langsung dari Task 1.3)
- Task 2.2, Fase 3, Fase 4: ON HOLD

---

## CORRECTION LOG — Fix data lama yang tertimpa NULL

**Masalah:** Saat sync dari file baru (Desa25_Podes2125_Idm24_Ha24_Lkrit22.xlsx), UPSERT menimpa 12 kolom lama dengan NULL karena file baru tidak punya kolom tersebut.

**Kolom yang tertimpa NULL (sebelum fix):**
- skor_overall, komponen_0, komponen_1, komponen_2
- pct_air_bersih, pct_pertanian, pct_smp_plus, pct_rumah_miskin
- target_air, target_pertanian
- jumlah_rt, jumlah_jiwa
- luas_hektar
- estimasi_biaya (jadi 0)

**Fix:** Re-sync dari file lama (00Desa25Podes25Idm24_compressed.xlsx, sheet "Raw") untuk restore 12+ kolom tersebut. UPDATE hanya kolom lama, tidak ganggu kolom baru.

**Setelah fix — verifikasi:**
- Semua 12 kolom lama: not_null = 83,379 (restored)
- Semua 13 kolom baru: tetap aman (not_null sesuai)
- Kolom lama yang tidak tertimpa (klasifikasi_podes, tantangan, rekomendasi, iks/ike/ikl/idm, dll): tetap aman
- Row count: 83,379

**Preventif:** sync.py di-fix supaya UPSERT hanya update kolom yang punya data di file source, tidak menimpa kolom lain dengan NULL.

**Sample final (kode=1101012001):**
- LAMA: skor=34.9, estimasi=1.500.000.000, jiwa=2291, luas_hektar=184.13, pct_air=97.01
- BARU: lat=2.9242, lon=97.4837, luas_admin=184.13, podes2025_prov=Aceh, hutan=0.016, lahan_kritis=0.0, podes2025_tersedia=true
