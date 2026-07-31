-- Seed kegiatan_config dari PRODUCTION-DEV-GUIDE §4.2
-- Jalankan setelah init_db.sql

INSERT INTO kegiatan_config (rekomendasi_key, tier, kegiatan) VALUES
-- health_infrastructure
('health_infrastructure', 'FULL',  'Pembangunan gedung Puskesmas Pembantu / Poskesdes baru'),
('health_infrastructure', 'MAJOR', 'Renovasi dan perluasan fasilitas kesehatan yang ada'),
('health_infrastructure', 'MEDIUM','Pengadaan peralatan medis standar, kendaraan operasional'),
('health_infrastructure', 'SMALL', 'Pengadaan alat kesehatan dasar, PMT stunting, pelatihan kader'),
('health_infrastructure', 'MICRO', 'Edukasi kesehatan, pelatihan kader posyandu'),

-- education_infrastructure
('education_infrastructure', 'FULL',  'Pembangunan gedung sekolah baru'),
('education_infrastructure', 'MAJOR', 'Renovasi dan perluasan ruang kelas'),
('education_infrastructure', 'MEDIUM','Pengadaan mebel, alat peraga, buku teks'),
('education_infrastructure', 'SMALL', 'Beasiswa lokal, pelatihan guru, pojok baca'),
('education_infrastructure', 'MICRO', 'Literasi digital, pelatihan kader pendidikan'),

-- water_system
('water_system', 'FULL',  'Pembangunan sistem air bersih terpusat (reservoir + perpipaan)'),
('water_system', 'MAJOR', 'Perluasan jaringan pipa ke dusun terpencil'),
('water_system', 'MEDIUM','Pengadaan pompa, filter, tangki penampung komunal'),
('water_system', 'SMALL', 'Sumur bor, perbaikan sumur existing, edukasi sanitasi'),
('water_system', 'MICRO', 'Distribusi filter air portabel, sosialisasi PHBS air'),

-- livelihood_diversification
('livelihood_diversification', 'FULL',  'Pembangunan fasilitas produksi / cold chain / gudang'),
('livelihood_diversification', 'MAJOR', 'Pengadaan alat pertanian modern, perahu motor nelayan'),
('livelihood_diversification', 'MEDIUM','Pelatihan keahlian vokasional + modal usaha kelompok'),
('livelihood_diversification', 'SMALL', 'Pelatihan UMKM, fasilitasi akses kredit'),
('livelihood_diversification', 'MICRO', 'Penyuluhan pertanian, pembentukan kelompok tani'),

-- community_governance
('community_governance', 'FULL',  'Pembangunan kantor desa / balai pertemuan'),
('community_governance', 'MAJOR', 'Renovasi kantor desa, pengadaan sistem IT administrasi'),
('community_governance', 'MEDIUM','Pelatihan aparatur desa, sistem informasi desa digital'),
('community_governance', 'SMALL', 'Pelatihan BUMDes, fasilitasi musrenbang'),
('community_governance', 'MICRO', 'Sosialisasi regulasi desa, pendampingan tata kelola'),

-- monitoring (semua tier sama)
('monitoring', 'FULL',  'Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'),
('monitoring', 'MAJOR', 'Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'),
('monitoring', 'MEDIUM','Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'),
('monitoring', 'SMALL', 'Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'),
('monitoring', 'MICRO', 'Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa')
ON CONFLICT (rekomendasi_key, tier) DO UPDATE
SET kegiatan = EXCLUDED.kegiatan;
