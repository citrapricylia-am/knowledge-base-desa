export type KlasifikasiPodes = 'CRITICAL' | 'LOW' | 'MODERATE' | 'HIGH';
export type Tier = 'FULL' | 'MAJOR' | 'MEDIUM' | 'SMALL' | 'MICRO';
export type StatusIdm =
  | 'SANGAT TERTINGGAL'
  | 'TERTINGGAL'
  | 'BERKEMBANG'
  | 'MAJU'
  | 'MANDIRI';

export interface Desa {
  kode_bps: string;
  village_id?: number | null;
  nama_desa: string;
  nama_kecamatan: string;
  nama_kabupaten: string;
  nama_provinsi: string;
  alamat_lengkap?: string | null;
  luas_hektar?: number | null;
  skor_overall?: number | null;
  klasifikasi_podes?: KlasifikasiPodes | null;
  komponen_0?: number | null;
  komponen_1?: number | null;
  komponen_2?: number | null;
  tantangan?: string | null;
  rekomendasi?: string | null;
  estimasi_biaya?: number | null;
  pct_air_bersih?: number | null;
  pct_pertanian?: number | null;
  pct_smp_plus?: number | null;
  pct_rumah_miskin?: number | null;
  target_air?: number | null;
  target_pertanian?: number | null;
  jumlah_rt?: number | null;
  jumlah_jiwa?: number | null;
  ada_sd?: number | null;
  ada_smp?: number | null;
  ada_faskes?: number | null;
  iks?: number | null;
  ike?: number | null;
  ikl?: number | null;
  idm?: number | null;
  status_idm?: string | null;
  status_idm_computed?: StatusIdm | string | null;
  tantangan_arr?: string[] | null;
  rekomendasi_arr?: string[] | null;

  // Podes 2025 data baru
  luas_admin_ha?: number | null;
  podes2025_prov_nama?: string | null;
  podes2025_kab_nama?: string | null;
  podes2025_kec_nama?: string | null;
  podes2025_desa_nama?: string | null;
  podes2025_lat?: number | null;
  podes2025_lon?: number | null;
  podes2021_status?: string | null;
  hutan_alam_ha_2024?: number | null;
  lahan_kritis_status?: string | null;
  lahan_kritis_ha?: number | null;
  podes2025_data_tersedia?: boolean | null;

  sumber_data?: string | null;
  disinkron_pada?: string | null;
  updated_at?: string | null;
}

export type DesaSearchResult = Pick<
  Desa,
  | 'kode_bps'
  | 'nama_desa'
  | 'nama_kecamatan'
  | 'nama_kabupaten'
  | 'nama_provinsi'
  | 'status_idm_computed'
  | 'idm'
  | 'klasifikasi_podes'
>;

export interface AnalisisRequest {
  kode_bps: string;
  anggaran: number;
}

export interface NarasiItem {
  judul: string;
  poin: string[];
}

export interface NarasiJson {
  konteks: string;
  posisi_anggaran: string;
  rekomendasi: NarasiItem[];
  disclaimer: string;
}

export interface AnalisisPayload {
  anggaran: number;
  estimasi_biaya_ideal: number;
  coverage_pct: number;
  tier: Tier;
  kegiatan: string[];
  narasi: NarasiJson;
  sumber_narasi: 'llm' | 'template' | 'cache';
  tahun_data: string;
  podes_tersedia: boolean;
}

export interface AnalisisResponse {
  desa: DesaPublic;
  analisis: AnalisisPayload;
}

/** Profil desa untuk UI — tanpa kolom teknis internal */
export type DesaPublic = Omit<
  Desa,
  'village_id' | 'komponen_0' | 'komponen_1' | 'komponen_2'
>;

export interface KegiatanConfig {
  id: number;
  rekomendasi_key: string;
  tier: Tier;
  kegiatan: string;
}

export interface CakupanStats {
  total_desa: number;
  dengan_podes: number;
  tanpa_podes: number;
  dengan_status_idm: number;
  tanpa_status_idm: number;
  dengan_podes2025: number;
  tanpa_podes2025: number;
  dengan_koordinat: number;
  dengan_hutan: number;
  dengan_lahan_kritis: number;
  per_status_idm: { status: string; count: number }[];
  per_klasifikasi: { klasifikasi: string; count: number }[];
  per_provinsi_top: { nama_provinsi: string; count: number }[];
}

export interface ProvinsiSummary {
  provinsi: string;
  jumlah_desa: number;
  jumlah_ha: number;
}
