-- ================================================================
-- Knowledge Base Potensi Desa — DDL (PRODUCTION-DEV-GUIDE §2)
-- ================================================================

CREATE TABLE IF NOT EXISTS desa (
  -- Identitas
  kode_bps            VARCHAR(10)   PRIMARY KEY,
  village_id          BIGINT,
  nama_desa           TEXT          NOT NULL,
  nama_kecamatan      TEXT          NOT NULL,
  nama_kabupaten      TEXT          NOT NULL,
  nama_provinsi       TEXT          NOT NULL,
  alamat_lengkap      TEXT,
  luas_hektar         NUMERIC(12,4),

  -- Skor Podes (bisa NULL untuk 17.809 desa)
  skor_overall        NUMERIC(5,1),
  klasifikasi_podes   TEXT          CHECK (klasifikasi_podes IS NULL OR klasifikasi_podes IN ('CRITICAL','LOW','MODERATE','HIGH')),
  komponen_0          NUMERIC(5,1),
  komponen_1          NUMERIC(5,1),
  komponen_2          NUMERIC(5,1),
  tantangan           TEXT,
  rekomendasi         TEXT,
  estimasi_biaya      BIGINT,

  -- Indikator numerik
  pct_air_bersih      NUMERIC(6,2),
  pct_pertanian       NUMERIC(6,2),
  pct_smp_plus        NUMERIC(6,2),
  pct_rumah_miskin    NUMERIC(6,2),
  target_air          INTEGER,
  target_pertanian    INTEGER,
  jumlah_rt           INTEGER,
  jumlah_jiwa         INTEGER,

  -- Fasilitas (has_pasar dikecualikan — selalu 0)
  ada_sd              SMALLINT      DEFAULT 0,
  ada_smp             SMALLINT      DEFAULT 0,
  ada_faskes          SMALLINT      DEFAULT 0,

  -- IDM 2024
  iks                 NUMERIC(6,4),
  ike                 NUMERIC(6,4),
  ikl                 NUMERIC(6,4),
  idm                 NUMERIC(6,4),
  status_idm          TEXT,
  status_idm_computed TEXT,

  -- Array tantangan & rekomendasi
  tantangan_arr       TEXT[],
  rekomendasi_arr     TEXT[],

  -- Metadata
  sumber_data         TEXT          DEFAULT 'Podes2025+IDM2024',
  disinkron_pada      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desa_provinsi    ON desa (nama_provinsi);
CREATE INDEX IF NOT EXISTS idx_desa_kabupaten   ON desa (nama_kabupaten);
CREATE INDEX IF NOT EXISTS idx_desa_kecamatan   ON desa (nama_kecamatan);
CREATE INDEX IF NOT EXISTS idx_desa_idm         ON desa (idm DESC);
CREATE INDEX IF NOT EXISTS idx_desa_status      ON desa (status_idm_computed);
CREATE INDEX IF NOT EXISTS idx_desa_klasifikasi ON desa (klasifikasi_podes);
CREATE INDEX IF NOT EXISTS idx_desa_nama_fts    ON desa USING gin(
  to_tsvector('simple', nama_desa || ' ' || nama_kecamatan || ' ' || nama_kabupaten)
);
CREATE INDEX IF NOT EXISTS idx_tantangan_arr    ON desa USING GIN (tantangan_arr);
CREATE INDEX IF NOT EXISTS idx_rekomendasi_arr  ON desa USING GIN (rekomendasi_arr);

-- ================================================================
-- TABEL LOG SINKRONISASI
-- ================================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id              BIGSERIAL PRIMARY KEY,
  dimulai_pada    TIMESTAMPTZ NOT NULL DEFAULT now(),
  selesai_pada    TIMESTAMPTZ,
  status          TEXT        NOT NULL,
  baris_dibaca    INTEGER,
  baris_diterima  INTEGER,
  baris_ditolak   INTEGER,
  detail_penolakan JSONB,
  pesan_error     TEXT
);

-- ================================================================
-- TABEL CACHE NARASI LLM
-- ================================================================
CREATE TABLE IF NOT EXISTS narasi_cache (
  id              BIGSERIAL PRIMARY KEY,
  kode_bps        VARCHAR(10) NOT NULL REFERENCES desa(kode_bps),
  hash_parameter  VARCHAR(64) NOT NULL,
  narasi_json     JSONB       NOT NULL,
  sumber          TEXT        NOT NULL,
  dibuat_pada     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (kode_bps, hash_parameter)
);

-- ================================================================
-- TABEL KONFIGURASI KEGIATAN (rekomendasi × tier)
-- ================================================================
CREATE TABLE IF NOT EXISTS kegiatan_config (
  id               BIGSERIAL PRIMARY KEY,
  rekomendasi_key  TEXT NOT NULL,
  tier             TEXT NOT NULL CHECK (tier IN ('FULL','MAJOR','MEDIUM','SMALL','MICRO')),
  kegiatan         TEXT NOT NULL,
  UNIQUE (rekomendasi_key, tier)
);

CREATE INDEX IF NOT EXISTS idx_kegiatan_key_tier ON kegiatan_config (rekomendasi_key, tier);
