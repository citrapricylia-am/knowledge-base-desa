"""
scripts/sync.py
Sinkronisasi 00Desa25Podes25Idm24.xlsx → PostgreSQL
Jalankan: python scripts/sync.py --file path/to/file.xlsx
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


VALID_KLASIFIKASI = {"CRITICAL", "LOW", "MODERATE", "HIGH"}
VALID_ESTIMASI = {0, 1_500_000_000, 3_000_000_000, 4_500_000_000}


def validate_row(row: dict, idx: int):
    if not row.get("kode_bps"):
        return False, f"baris {idx}: kode_bps kosong"
    if len(str(row["kode_bps"])) != 10:
        return False, f"baris {idx}: kode_bps {row['kode_bps']!r} bukan 10 digit"
    if not row.get("nama_desa"):
        return False, f"baris {idx}: nama_desa kosong"
    if row.get("estimasi_biaya") not in VALID_ESTIMASI:
        return False, f"baris {idx}: estimasi_biaya tidak valid: {row.get('estimasi_biaya')}"
    kl = row.get("klasifikasi_podes")
    if kl and kl not in VALID_KLASIFIKASI:
        return False, f"baris {idx}: klasifikasi {kl!r} tidak dikenal"
    return True, None


def transform_row(raw_row) -> dict:
    r = raw_row
    tantangan_arr = parse_csv_field(r.get("challenges"))
    rekomendasi_arr = parse_csv_field(r.get("recommende"))
    idm_raw = r.get("IDM_2024", float("nan"))
    idm_score = float(idm_raw) if not pd.isna(idm_raw) else None

    return {
        "kode_bps": str(int(float(r["KODE_DESA_"]))).zfill(10) if not pd.isna(r.get("KODE_DESA_")) else "",
        "village_id": int(float(r["village_id"])) if not pd.isna(r.get("village_id")) else None,
        "nama_desa": str(r["NAMA_KEL"]).strip().title(),
        "nama_kecamatan": str(r["NAMA_KEC"]).strip().title(),
        "nama_kabupaten": str(r["KAB"]).strip().title(),
        "nama_provinsi": str(r["PROV"]).strip().title(),
        "alamat_lengkap": str(r.get("ADM", "") or ""),
        "luas_hektar": float(r["Hek"]) if not pd.isna(r.get("Hek")) else None,
        "skor_overall": float(r["overall_sc"]) if not pd.isna(r.get("overall_sc")) else None,
        "klasifikasi_podes": str(r["classifica"]).upper() if not pd.isna(r.get("classifica")) else None,
        "komponen_0": float(r["component_"]) if not pd.isna(r.get("component_")) else None,
        "komponen_1": float(r["component1"]) if not pd.isna(r.get("component1")) else None,
        "komponen_2": float(r["componen_1"]) if not pd.isna(r.get("componen_1")) else None,
        "tantangan": str(r["challenges"]) if not pd.isna(r.get("challenges")) else None,
        "rekomendasi": str(r["recommende"]) if not pd.isna(r.get("recommende")) else None,
        "estimasi_biaya": int(float(r["estimated_"])) if not pd.isna(r.get("estimated_")) else 0,
        "pct_air_bersih": float(r["water_acce"]) if not pd.isna(r.get("water_acce")) else None,
        "pct_pertanian": float(r["agri_depen"]) if not pd.isna(r.get("agri_depen")) else None,
        "pct_smp_plus": float(r["smp_plus_p"]) if not pd.isna(r.get("smp_plus_p")) else None,
        "pct_rumah_miskin": float(r["poor_housi"]) if not pd.isna(r.get("poor_housi")) else None,
        "target_air": int(float(r["target_wat"])) if not pd.isna(r.get("target_wat")) else None,
        "target_pertanian": int(float(r["target_agr"])) if not pd.isna(r.get("target_agr")) else None,
        "jumlah_rt": int(float(r["n_rt"])) if not pd.isna(r.get("n_rt")) else None,
        "jumlah_jiwa": int(float(r["n_ind"])) if not pd.isna(r.get("n_ind")) else None,
        "ada_sd": int(float(r["has_sekola"])) if not pd.isna(r.get("has_sekola")) else 0,
        "ada_smp": int(float(r["has_seko_1"])) if not pd.isna(r.get("has_seko_1")) else 0,
        "ada_faskes": int(float(r["has_fasili"])) if not pd.isna(r.get("has_fasili")) else 0,
        "iks": float(r["IKS_2024"]) if not pd.isna(r.get("IKS_2024")) else None,
        "ike": float(r["IKE_2024"]) if not pd.isna(r.get("IKE_2024")) else None,
        "ikl": float(r["IKL_2024"]) if not pd.isna(r.get("IKL_2024")) else None,
        "idm": idm_score,
        "status_idm": str(r["STAT_IDM20"]).strip() if not pd.isna(r.get("STAT_IDM20")) else None,
        "status_idm_computed": label_idm(idm_score) if idm_score is not None else None,
        "tantangan_arr": tantangan_arr,
        "rekomendasi_arr": rekomendasi_arr,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"[{datetime.now()}] Membaca file: {args.file}")
    df = pd.read_excel(args.file, sheet_name="Raw", dtype={"KODE_DESA_": str, "village_id": str})
    print(f"  Baris dibaca: {len(df):,}")

    rows_ok, rows_err = [], []
    for i, (_, row) in enumerate(df.iterrows()):
        try:
            transformed = transform_row(row)
            ok, msg = validate_row(transformed, i + 2)
            if ok:
                rows_ok.append(transformed)
            else:
                rows_err.append(msg)
        except Exception as e:
            rows_err.append(f"baris {i+2}: exception: {e}")

    print(f"  Diterima: {len(rows_ok):,} | Ditolak: {len(rows_err):,}")
    if rows_err[:10]:
        print("  Sampel penolakan:")
        for e in rows_err[:10]:
            print(f"    - {e}")

    if args.dry_run:
        print("[dry-run] Selesai tanpa menulis ke database.")
        return

    if not rows_ok:
        print("Tidak ada baris valid. Abort.")
        sys.exit(1)

    cols = list(rows_ok[0].keys())
    values = [tuple(r[c] for c in cols) for r in rows_ok]

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO sync_log (status, baris_dibaca, baris_diterima, baris_ditolak, detail_penolakan)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        ("berjalan", len(df), len(rows_ok), len(rows_err), json.dumps(rows_err[:100])),
    )
    log_id = cur.fetchone()[0]
    conn.commit()

    insert_sql = f"""
        INSERT INTO desa ({', '.join(cols)})
        VALUES %s
        ON CONFLICT (kode_bps) DO UPDATE SET
            {', '.join(f'{c} = EXCLUDED.{c}' for c in cols if c != 'kode_bps')},
            disinkron_pada = now()
    """
    execute_values(cur, insert_sql, values, template=None, page_size=500)
    conn.commit()

    cur.execute(
        """
        UPDATE sync_log SET status='berhasil', selesai_pada=now()
        WHERE id=%s
        """,
        (log_id,),
    )
    conn.commit()
    cur.close()
    conn.close()

    print(f"[{datetime.now()}] Sinkronisasi selesai. Log ID: {log_id}")


if __name__ == "__main__":
    main()
