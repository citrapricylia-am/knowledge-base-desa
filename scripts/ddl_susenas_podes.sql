-- ================================================================
-- DesaLens — DDL untuk data Podes 2025 Infrastruktur & Susenas 2025
-- ================================================================

-- 1. Tabel infrastruktur Podes 2025 (874.798 record fasilitas per desa)
CREATE TABLE IF NOT EXISTS podes2025_infra (
    id          BIGSERIAL PRIMARY KEY,
    r101        VARCHAR(2),   -- kode provinsi
    r102        VARCHAR(2),   -- kode kabupaten
    r103        VARCHAR(3),   -- kode kecamatan
    r104        VARCHAR(3),   -- kode desa
    kode_bps    VARCHAR(10),  -- R101+R102+R103+R104 (10 digit)
    nama_prov   TEXT,
    nama_kab    TEXT,
    nama_kec    TEXT,
    nama_desa   TEXT,
    jenis       TEXT,         -- r701ck2 = SD, r702fk2 = puskesmas, dll
    nama        TEXT          -- nama fasilitas
);

-- Index untuk lookup per desa
CREATE INDEX IF NOT EXISTS idx_podes_infra_kode_bps ON podes2025_infra(kode_bps);
CREATE INDEX IF NOT EXISTS idx_podes_infra_jenis ON podes2025_infra(jenis);

-- 2. Tabel Susenas 2025 — Rumah Tangga (343.460 record)
CREATE TABLE IF NOT EXISTS susenas_rt (
    id          BIGSERIAL PRIMARY KEY,
    urut        INTEGER,
    psu         INTEGER,
    ssu         INTEGER,
    strata      INTEGER,
    r101        INTEGER,      -- kode provinsi
    r102        INTEGER,      -- kode kabupaten
    r105        INTEGER,      -- perkotaan/perdesaan
    nuinfort    INTEGER,
    -- Ketahanan pangan (R1501-R1508)
    r1501       INTEGER,
    r1502       INTEGER,
    r1503       INTEGER,
    r1504       INTEGER,
    r1505       INTEGER,
    r1506       INTEGER,
    r1507       INTEGER,
    r1508       INTEGER,
    -- Perumahan (R1601-R1608)
    r1601       INTEGER,
    r1602       INTEGER,
    r1603       INTEGER,
    r1604       INTEGER,
    r1605       INTEGER,
    r1606       INTEGER,
    r1607       INTEGER,
    r1608       INTEGER,
    -- Sanitasi (R1609A-R1609E)
    r1609a      INTEGER,
    r1609b      INTEGER,
    r1609c      INTEGER,
    r1609d      INTEGER,
    r1609e      INTEGER,
    -- Air minum (R1610A-R1616)
    r1610a      INTEGER,
    r1610b      INTEGER,
    r1610c      INTEGER,
    r1611a      INTEGER,
    r1611b      INTEGER,
    r1612       INTEGER,
    r1613a      INTEGER,
    r1613b      INTEGER,
    r1613c      INTEGER,
    r1613d      INTEGER,
    r1613e      INTEGER,
    r1614a      INTEGER,
    r1614b      INTEGER,
    r1615a      INTEGER,
    r1615b      INTEGER,
    r1615c      INTEGER,
    r1616       INTEGER,
    -- Penerangan & energi
    r1616b1     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_susenas_rt_r101 ON susenas_rt(r101);
CREATE INDEX IF NOT EXISTS idx_susenas_rt_r102 ON susenas_rt(r101, r102);
CREATE INDEX IF NOT EXISTS idx_susenas_rt_psu ON susenas_rt(psu);

-- 3. Tabel Susenas 2025 — Individu (1.173.633 record, split ind1 + ind2)
CREATE TABLE IF NOT EXISTS susenas_ind (
    id          BIGSERIAL PRIMARY KEY,
    urut        INTEGER,
    psu         INTEGER,
    ssu         INTEGER,
    strata      INTEGER,
    r101        INTEGER,      -- kode provinsi
    r102        INTEGER,      -- kode kabupaten
    r105        INTEGER,      -- perkotaan/perdesaan
    r401        INTEGER,      -- no urut ART
    -- Demografi (R403-R410)
    r403        INTEGER,      -- hubungan dengan KRT
    r404        INTEGER,      -- status perkawinan
    r405        INTEGER,      -- jenis kelamin
    r406a       INTEGER,      -- tanggal lahir
    r406b       INTEGER,      -- bulan lahir
    r406c       INTEGER,      -- tahun lahir
    r407        INTEGER,      -- umur
    r408        INTEGER,
    r409        INTEGER,
    r410        INTEGER,
    -- Identitas (R501-R510)
    r501        INTEGER,
    r502        INTEGER,
    r503        INTEGER,
    r504        INTEGER,
    r505        INTEGER,      -- punya NIK?
    r507        INTEGER,
    r508        INTEGER,
    r509        INTEGER,      -- punya akta kelahiran?
    r510        INTEGER,
    -- Migrasi (R601-R604)
    r601        INTEGER,
    r602        INTEGER,
    r603        INTEGER,
    r604        INTEGER,
    -- Pendidikan (R605-R618)
    r605        INTEGER,
    r606        INTEGER,
    r608        INTEGER,      -- baca tulis latin
    r609        INTEGER,      -- baca tulis arab
    r611        INTEGER,      -- bersekolah?
    r612        INTEGER,      -- negeri/swasta
    r613        INTEGER,      -- jenjang pendidikan tertinggi
    r614        INTEGER,
    r615        INTEGER,      -- ijazah tertinggi
    r616        INTEGER,
    r617        INTEGER,
    r618_a      INTEGER,
    r618_b      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_susenas_ind_r101 ON susenas_ind(r101);
CREATE INDEX IF NOT EXISTS idx_susenas_ind_r102 ON susenas_ind(r101, r102);
CREATE INDEX IF NOT EXISTS idx_susenas_ind_psu ON susenas_ind(psu);

-- 4. Tabel kamus nilai Susenas (dari Layout XLS)
CREATE TABLE IF NOT EXISTS susenas_variabel (
    id          SERIAL PRIMARY KEY,
    variabel    TEXT NOT NULL,    -- R1501, R1604, dll
    label       TEXT,             -- deskripsi variabel
    level       TEXT              -- 'ruta' atau 'individu'
);

CREATE TABLE IF NOT EXISTS susenas_value_label (
    id          SERIAL PRIMARY KEY,
    variabel    TEXT NOT NULL,    -- R101, R105, R1501, dll
    nilai       TEXT,             -- 1, 5, 11, dll
    label       TEXT              -- 'Ya', 'Tidak', 'Aceh', dll
);

CREATE INDEX IF NOT EXISTS idx_susenas_variabel_var ON susenas_variabel(variabel);
CREATE INDEX IF NOT EXISTS idx_susenas_value_var ON susenas_value_label(variabel);
