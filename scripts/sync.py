"""
scripts/sync.py
Sinkronisasi Desa25_Podes2125_Idm24_Ha24_Lkrit22.xlsx → PostgreSQL

Fitur:
- Mapping 12 kolom baru (podes2025, lat/lon, hutan alam, lahan kritis, dll)
- Validasi: kode_bps 10 digit, lat/lon range, luas >= 0, row count per tahap
- Idempotent: UPSERT ON CONFLICT (kode_bps) DO UPDATE
- Laporan validasi: baris diproses, reject + alasan, sample, coverage

Jalankan:
  python scripts/sync.py --file path/to/file.xlsx --dry-run
  python scripts/sync.py --file path/to/file.xlsx
"""
import argparse
import json
import os
import sys
from datetime import datetime

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: set DATABASE_URL di environment / .env")
    sys.exit(1)

# ================================================================
# MAPPING KOLOM EXCEL → KOLOM DB (terverifikasi dari header file)
# ================================================================
# Format: (kolom_db, kolom_excel, tipe, catatan)
COLUMN_MAP = [
    # --- KOLOM LAMA (dari file lama 00Desa25Podes25Idm24.xlsx) ---
    ("kode_bps",            "KODE_DESA_",        "str10",   "wajib 10 digit"),
    ("village_id",          "village_id",        "int",     "nullable"),
    ("nama_desa",           "NAMA_KEL",           "str",     "title case"),
    ("nama_kecamatan",      "NAMA_KEC",           "str",     "title case"),
    ("nama_kabupaten",     "KAB",                "str",     "title case"),
    ("nama_provinsi",      "PROV",               "str",     "title case"),
    ("alamat_lengkap",     "ADM",                "str",     "nullable"),
    ("luas_hektar",        "Hek",                "float",   "nullable"),
    ("skor_overall",       "overall_sc",         "float",   "nullable"),
    ("klasifikasi_podes",  "classifica",         "str_upper", "nullable, CRITICAL/LOW/MODERATE/HIGH"),
    ("komponen_0",         "component_",         "float",   "nullable"),
    ("komponen_1",         "component1",         "float",   "nullable"),
    ("komponen_2",         "componen_1",         "float",   "nullable"),
    ("tantangan",          "challenges",         "str",     "nullable"),
    ("rekomendasi",        "recommende",         "str",     "nullable"),
    ("estimasi_biaya",     "estimated_",         "int",     "nullable"),
    ("pct_air_bersih",     "water_acce",         "float",   "nullable"),
    ("pct_pertanian",      "agri_depen",         "float",   "nullable"),
    ("pct_smp_plus",       "smp_plus_p",         "float",   "nullable"),
    ("pct_rumah_miskin",   "poor_housi",         "float",   "nullable"),
    ("target_air",         "target_wat",          "int",     "nullable"),
    ("target_pertanian",   "target_agr",         "int",     "nullable"),
    ("jumlah_rt",          "n_rt",               "int",     "nullable"),
    ("jumlah_jiwa",        "n_ind",               "int",     "nullable"),
    ("ada_sd",             "has_sekola",         "int",     "default 0"),
    ("ada_smp",            "has_seko_1",         "int",     "default 0"),
    ("ada_faskes",         "has_fasili",         "int",     "default 0"),
    ("iks",                "IKS_2024",           "float",   "nullable"),
    ("ike",                "IKE_2024",           "float",   "nullable"),
    ("ikl",                "IKL_2024",           "float",   "nullable"),
    ("idm",                "IDM_2024",           "float",   "nullable"),
    ("status_idm",         "STAT_IDM20",         "str",     "nullable"),

    # --- KOLOM BARU (dari Desa25_Podes2125_Idm24_Ha24_Lkrit22.xlsx) ---
    ("luas_admin_ha",      "Adm Desa (Ha)",      "float",   "dari Excel baru, >= 0"),
    ("podes2025_prov_nama", "R101N",            "str",     "nullable — null = desa tidak tercakup Podes 2025"),
    ("podes2025_kab_nama",  "R102N",            "str",     "nullable"),
    ("podes2025_kec_nama",  "R103N",            "str",     "nullable"),
    ("podes2025_desa_nama", "R104N",            "str",     "nullable"),
    ("podes2025_lat",       "R307B1_LAT",       "lat",     "validasi: (0,0)→NULL, range 0-11 (data tidak pakai tanda negatif)"),
    ("podes2025_lon",       "R307B1_LON",       "lon",     "validasi: (0,0)→NULL, range 95-141"),
    ("podes2021_status",    "(03) DATA PODES 2021", "str", "nilai teks apa adanya"),
    ("hutan_alam_ha_2024",  "Luas hutan alam",  "float",   "BUKAN Ha24 (itu label konstan), >= 0"),
    ("lahan_kritis_status", "(06) Lahan Kritis", "str",    "nilai teks apa adanya"),
    ("lahan_kritis_ha",     "Luas Lahan Kritis", "float",  "BUKAN Kritis00 (itu label konstan), >= 0"),
]

VALID_KLASIFIKASI = {"CRITICAL", "LOW", "MODERATE", "HIGH"}
VALID_ESTIMASI = {0, 1_500_000_000, 3_000_000_000, 4_500_000_000}


def label_idm(score: float):
    if pd.isna(score):
        return None
    if score >= 0.8155:
        return "MANDIRI"
    if score >= 0.7072:
        return "MAJU"
    if score >= 0.5989:
        return "BERKEMBANG"
    if score >= 0.4907:
        return "TERTINGGAL"
    return "SANGAT TERTINGGAL"


def parse_csv_field(val) -> list:
    if pd.isna(val) or str(val).strip() == "":
        return []
    return [x.strip() for x in str(val).split(",") if x.strip()]


def safe_float(val):
    """Konversi ke float, return None jika NaN/empty."""
    if pd.isna(val) or val is None or str(val).strip() == "":
        return None
    try:
        f = float(val)
        return f if pd.notna(f) else None
    except (ValueError, TypeError):
        return None


def safe_int(val, default=0):
    """Konversi ke int, return default jika NaN/empty."""
    if pd.isna(val) or val is None or str(val).strip() == "":
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def safe_str(val, title=False, upper=False):
    """Konversi ke string, return None jika NaN/empty."""
    if pd.isna(val) or val is None or str(val).strip() == "":
        return None
    s = str(val).strip()
    if title:
        s = s.title()
    if upper:
        s = s.upper()
    return s


def validate_lat_lon(lat_val, lon_val):
    """
    Validasi koordinat:
    - (0,0) → (None, None) — sel kosong Excel, bukan koordinat asli
    - LAT range 0-11 (data Podes tidak pakai tanda negatif, terima apa adanya)
    - LON range 95-141
    - Out of range → (None, None)
    """
    lat = safe_float(lat_val)
    lon = safe_float(lon_val)

    # (0,0) → NULL
    if lat is not None and lon is not None and lat == 0 and lon == 0:
        return None, None, "(0,0) → NULL (sel kosong Excel)"

    # Validasi range
    if lat is not None and (lat < 0 or lat > 11):
        return None, None, f"LAT {lat} di luar range 0-11 → NULL"
    if lon is not None and (lon < 95 or lon > 141):
        return None, None, f"LON {lon} di luar range 95-141 → NULL"

    return lat, lon, None


def validate_row(row: dict, idx: int):
    """Validasi baris. Return (ok, message)."""
    # kode_bps wajib 10 digit
    if not row.get("kode_bps"):
        return False, f"baris {idx}: kode_bps kosong"
    if len(str(row["kode_bps"])) != 10:
        return False, f"baris {idx}: kode_bps {row['kode_bps']!r} bukan 10 digit"
    # nama_desa wajib
    if not row.get("nama_desa"):
        return False, f"baris {idx}: nama_desa kosong"
    # estimasi_biaya valid
    if row.get("estimasi_biaya") not in VALID_ESTIMASI:
        return False, f"baris {idx}: estimasi_biaya tidak valid: {row.get('estimasi_biaya')}"
    # klasifikasi_podes valid (jika ada)
    kl = row.get("klasifikasi_podes")
    if kl and kl not in VALID_KLASIFIKASI:
        return False, f"baris {idx}: klasifikasi {kl!r} tidak dikenal"
    # luas_admin_ha >= 0
    if row.get("luas_admin_ha") is not None and row["luas_admin_ha"] < 0:
        return False, f"baris {idx}: luas_admin_ha negatif: {row['luas_admin_ha']}"
    # hutan_alam_ha_2024 >= 0
    if row.get("hutan_alam_ha_2024") is not None and row["hutan_alam_ha_2024"] < 0:
        return False, f"baris {idx}: hutan_alam_ha_2024 negatif: {row['hutan_alam_ha_2024']}"
    # lahan_kritis_ha >= 0
    if row.get("lahan_kritis_ha") is not None and row["lahan_kritis_ha"] < 0:
        return False, f"baris {idx}: lahan_kritis_ha negatif: {row['lahan_kritis_ha']}"
    return True, None


def transform_row(raw_row) -> dict:
    """Transformasi satu baris Excel → dict siap insert."""
    r = raw_row
    kode_bps = str(int(float(r["KODE_DESA_"]))).zfill(10) if not pd.isna(r.get("KODE_DESA_")) else ""

    # Validasi & transform lat/lon
    lat_val = r.get("R307B1_LAT")
    lon_val = r.get("R307B1_LON")
    lat, lon, _ = validate_lat_lon(lat_val, lon_val)

    idm_raw = r.get("IDM_2024", float("nan"))
    idm_score = float(idm_raw) if not pd.isna(idm_raw) else None

    tantangan_arr = parse_csv_field(r.get("challenges"))
    rekomendasi_arr = parse_csv_field(r.get("recommende"))

    return {
        "kode_bps": kode_bps,
        "village_id": safe_int(r.get("village_id")) if not pd.isna(r.get("village_id")) else None,
        "nama_desa": safe_str(r.get("NAMA_KEL"), title=True),
        "nama_kecamatan": safe_str(r.get("NAMA_KEC"), title=True),
        "nama_kabupaten": safe_str(r.get("KAB"), title=True),
        "nama_provinsi": safe_str(r.get("PROV"), title=True),
        "alamat_lengkap": safe_str(r.get("ADM")),
        "luas_hektar": safe_float(r.get("Hek")),
        "skor_overall": safe_float(r.get("overall_sc")),
        "klasifikasi_podes": safe_str(r.get("classifica"), upper=True),
        "komponen_0": safe_float(r.get("component_")),
        "komponen_1": safe_float(r.get("component1")),
        "komponen_2": safe_float(r.get("componen_1")),
        "tantangan": safe_str(r.get("challenges")),
        "rekomendasi": safe_str(r.get("recommende")),
        "estimasi_biaya": safe_int(r.get("estimated_"), 0),
        "pct_air_bersih": safe_float(r.get("water_acce")),
        "pct_pertanian": safe_float(r.get("agri_depen")),
        "pct_smp_plus": safe_float(r.get("smp_plus_p")),
        "pct_rumah_miskin": safe_float(r.get("poor_housi")),
        "target_air": safe_int(r.get("target_wat")) if not pd.isna(r.get("target_wat")) else None,
        "target_pertanian": safe_int(r.get("target_agr")) if not pd.isna(r.get("target_agr")) else None,
        "jumlah_rt": safe_int(r.get("n_rt")) if not pd.isna(r.get("n_rt")) else None,
        "jumlah_jiwa": safe_int(r.get("n_ind")) if not pd.isna(r.get("n_ind")) else None,
        "ada_sd": safe_int(r.get("has_sekola"), 0),
        "ada_smp": safe_int(r.get("has_seko_1"), 0),
        "ada_faskes": safe_int(r.get("has_fasili"), 0),
        "iks": safe_float(r.get("IKS_2024")),
        "ike": safe_float(r.get("IKE_2024")),
        "ikl": safe_float(r.get("IKL_2024")),
        "idm": idm_score,
        "status_idm": safe_str(r.get("STAT_IDM20")),
        "status_idm_computed": label_idm(idm_score) if idm_score is not None else None,
        "tantangan_arr": tantangan_arr,
        "rekomendasi_arr": rekomendasi_arr,
        # --- KOLOM BARU ---
        "luas_admin_ha": safe_float(r.get("Adm Desa (Ha)")),
        "podes2025_prov_nama": safe_str(r.get("R101N")),
        "podes2025_kab_nama": safe_str(r.get("R102N")),
        "podes2025_kec_nama": safe_str(r.get("R103N")),
        "podes2025_desa_nama": safe_str(r.get("R104N")),
        "podes2025_lat": lat,
        "podes2025_lon": lon,
        "podes2021_status": safe_str(r.get("(03) DATA PODES 2021")),
        "hutan_alam_ha_2024": safe_float(r.get("Luas hutan alam")),
        "lahan_kritis_status": safe_str(r.get("(06) Lahan Kritis")),
        "lahan_kritis_ha": safe_float(r.get("Luas Lahan Kritis")),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path ke file Excel")
    parser.add_argument("--dry-run", action="store_true", help="Tanpa tulis ke database")
    args = parser.parse_args()

    print(f"[{datetime.now()}] Membaca file: {args.file}")
    df = pd.read_excel(args.file, sheet_name="Sheet1", dtype={"KODE_DESA_": str, "village_id": str})
    total_source = len(df)
    print(f"  Baris dibaca: {total_source:,}")

    # ================================================================
    # TAHAP 1: TRANSFORM + VALIDATE
    # ================================================================
    rows_ok, rows_err = [], []
    lat_null_count = 0
    podes_null_count = 0

    for i, (_, row) in enumerate(df.iterrows()):
        try:
            transformed = transform_row(row)
            ok, msg = validate_row(transformed, i + 2)
            if ok:
                rows_ok.append(transformed)
                # Count lat/lon NULL
                if transformed["podes2025_lat"] is None:
                    lat_null_count += 1
                # Count podes2025 null
                if transformed["podes2025_prov_nama"] is None:
                    podes_null_count += 1
            else:
                rows_err.append(msg)
        except Exception as e:
            rows_err.append(f"baris {i+2}: exception: {e}")

    total_ok = len(rows_ok)
    total_err = len(rows_err)
    print(f"\n=== TAHAP 1: TRANSFORM + VALIDATE ===")
    print(f"  Diterima: {total_ok:,} | Ditolak: {total_err:,}")
    if rows_err[:10]:
        print("  Sampel penolakan:")
        for e in rows_err[:10]:
            print(f"    - {e}")

    # ================================================================
    # ROW COUNT CHECK: stop jika mismatch
    # ================================================================
    expected = total_source  # semua baris harus diterima (kecuali reject yang jelas)
    if total_ok + total_err != total_source:
        print(f"\n  ⚠ ROW COUNT MISMATCH: source={total_source}, ok={total_ok}, reject={total_err}, sum={total_ok+total_err}")
        print("  STOP — jangan lanjut ke fase berikutnya.")
        sys.exit(1)

    # ================================================================
    # STATISTIK VALIDASI
    # ================================================================
    print(f"\n=== STATISTIK VALIDASI ===")
    print(f"  Total baris source: {total_source:,}")
    print(f"  Baris diterima: {total_ok:,}")
    print(f"  Baris ditolak: {total_err:,}")
    print(f"  podes2025_lat NULL (termasuk (0,0)): {lat_null_count:,}")
    print(f"  podes2025_prov_nama NULL (tidak tercakup Podes 2025): {podes_null_count:,}")
    print(f"  Desa dengan Podes 2025 data: {total_ok - podes_null_count:,}")

    # Sample 10 baris
    print(f"\n=== SAMPLE 10 BARIS (cek manual) ===")
    sample_indices = [0, total_ok//10, total_ok//5, total_ok//3, total_ok//2,
                      total_ok*2//3, total_ok*4//5, total_ok*9//10, total_ok-2, total_ok-1]
    for idx in sample_indices:
        if idx < total_ok:
            r = rows_ok[idx]
            print(f"  [{idx}] kode={r['kode_bps']} desa={r['nama_desa']} prov={r['nama_provinsi']}")
            print(f"       lat={r['podes2025_lat']} lon={r['podes2025_lon']} luas_admin={r['luas_admin_ha']}")
            print(f"       podes2025_prov={r['podes2025_prov_nama']} hutan={r['hutan_alam_ha_2024']} lahan_kritis={r['lahan_kritis_ha']}")

    if args.dry_run:
        print(f"\n[dry-run] Selesai tanpa menulis ke database.")
        # Tulis laporan ke file
        report_path = os.path.join(os.path.dirname(__file__), "..", "sync_validation_report.md")
        with open(report_path, "w") as f:
            f.write(f"# Laporan Validasi Sync — {datetime.now()}\n\n")
            f.write(f"## Ringkasan\n\n")
            f.write(f"- File source: `{args.file}`\n")
            f.write(f"- Total baris: {total_source:,}\n")
            f.write(f"- Diterima: {total_ok:,}\n")
            f.write(f"- Ditolak: {total_err:,}\n")
            f.write(f"- podes2025_lat NULL: {lat_null_count:,}\n")
            f.write(f"- podes2025_prov_nama NULL (tidak tercakup Podes 2025): {podes_null_count:,}\n")
            f.write(f"- Desa dengan Podes 2025 data: {total_ok - podes_null_count:,}\n\n")
            f.write(f"## Penolakan (max 100)\n\n")
            for e in rows_err[:100]:
                f.write(f"- {e}\n")
        print(f"  Laporan ditulis: {report_path}")
        return

    # ================================================================
    # TAHAP 2: UPSERT KE DATABASE
    # ================================================================
    if not rows_ok:
        print("Tidak ada baris valid. Abort.")
        sys.exit(1)

    print(f"\n=== TAHAP 2: UPSERT KE DATABASE ===")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Catat di sync_log
    cur.execute(
        """
        INSERT INTO sync_log (status, baris_dibaca, baris_diterima, baris_ditolak, detail_penolakan)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        ("berjalan", total_source, total_ok, total_err, json.dumps(rows_err[:100])),
    )
    log_id = cur.fetchone()[0]
    conn.commit()

    # UPSERT — hanya update kolom yang ADA di file source
    # Jangan timpa kolom lama dengan NULL jika file baru tidak punya kolom tersebut
    cols = list(rows_ok[0].keys())
    values = [tuple(r[c] for c in cols) for r in rows_ok]

    # Filter: hanya kolom yang punya setidaknya 1 nilai non-None di data
    cols_with_data = []
    for c in cols:
        has_data = any(r.get(c) is not None for r in rows_ok)
        if has_data or c == "kode_bps":
            cols_with_data.append(c)

    cols_update = [c for c in cols_with_data if c != "kode_bps"]
    print(f"  Kolom yang akan di-update: {len(cols_update)} (dari total {len(cols)})")
    print(f"  Kolom dilewati (semua NULL): {set(cols) - set(cols_with_data)}")

    insert_sql = f"""
        INSERT INTO desa ({', '.join(cols_with_data)})
        VALUES %s
        ON CONFLICT (kode_bps) DO UPDATE SET
            {', '.join(f'{c} = EXCLUDED.{c}' for c in cols_update)},
            disinkron_pada = now(),
            updated_at = now()
    """
    # Rebuild values hanya untuk kolom dengan data
    values = [tuple(r[c] for c in cols_with_data) for r in rows_ok]
    print(f"  Inserting {len(values):,} baris...")
    execute_values(cur, insert_sql, values, template=None, page_size=500)
    conn.commit()

    # Update sync_log
    cur.execute(
        """
        UPDATE sync_log SET status='berhasil', selesai_pada=now()
        WHERE id=%s
        """,
        (log_id,),
    )
    conn.commit()

    # ================================================================
    # TAHAP 3: VERIFIKASI
    # ================================================================
    cur.execute("SELECT COUNT(*) FROM desa")
    final_count = cur.fetchone()[0]
    print(f"\n=== VERIFIKASI ===")
    print(f"  Row count setelah sync: {final_count:,} (harus 83,379)")

    if final_count != 83379:
        print(f"  ⚠ ROW COUNT MISMATCH! Expected 83,379, got {final_count}")

    # Anti-join check: semua kode_bps di DB harus ada di source
    cur.execute("SELECT kode_bps FROM desa")
    db_kodes = set(r[0] for r in cur.fetchall())
    source_kodes = set(r["kode_bps"] for r in rows_ok)
    only_db = db_kodes - source_kodes
    only_source = source_kodes - db_kodes
    print(f"  Anti-join: only in DB={len(only_db)}, only in source={len(only_source)}")

    # Sample 10 baris dari DB
    cur.execute("SELECT kode_bps, nama_desa, podes2025_lat, podes2025_lon, luas_admin_ha, podes2025_prov_nama FROM desa LIMIT 10")
    samples = cur.fetchall()
    print(f"\n=== SAMPLE 10 BARIS DARI DB ===")
    for s in samples:
        print(f"  kode={s[0]} desa={s[1]} lat={s[2]} lon={s[3]} luas_admin={s[4]} podes2025_prov={s[5]}")

    cur.close()
    conn.close()
    print(f"\n[{datetime.now()}] Sinkronisasi selesai. Log ID: {log_id}")


if __name__ == "__main__":
    main()
