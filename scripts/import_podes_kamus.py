#!/usr/bin/env python3
"""
Fase 2: Import CSV ke Supabase via psql COPY
Pakai psql \copy untuk bulk insert yang cepat.
"""
import subprocess
import os
import csv
import sys

DB_HOST = 'aws-0-ap-southeast-1.pooler.supabase.com'
DB_PORT = '6543'
DB_USER = 'postgres.ieiwmuvvumilueyktcsv'
DB_NAME = 'postgres'
DB_PASS = os.environ.get('SUPABASE_PASS') or os.environ.get('PGPASSWORD') or ''
if not DB_PASS:
    raise SystemExit('Set SUPABASE_PASS dulu: export SUPABASE_PASS="<password>"')

DATA_DIR = '/home/citra/knowledge-base-desa/scripts/data'

def psql_copy(csv_path, table_name, columns):
    """Import CSV ke tabel via psql \copy"""
    cols_str = ','.join(columns)
    # Buat SQL perintah \copy
    sql = f"\\copy {table_name}({cols_str}) FROM '{csv_path}' WITH (FORMAT csv, HEADER true, NULL '');"
    
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASS
    
    cmd = [
        'psql',
        '-h', DB_HOST,
        '-p', DB_PORT,
        '-U', DB_USER,
        '-d', DB_NAME,
        '-c', sql,
    ]
    
    print(f'  Importing {csv_path} -> {table_name}...')
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=600)
    
    if result.returncode != 0:
        print(f'  ERROR: {result.stderr[:500]}')
        return False
    
    print(f'  {result.stdout.strip()}')
    return True

def import_podes_infra():
    """Import podes2025_infra.csv ke tabel podes2025_infra"""
    csv_path = os.path.join(DATA_DIR, 'podes2025_infra.csv')
    
    # Tambah kolom kode_bps (gabungan R101+R102+R103+R104) di CSV
    # Baca header dulu
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
    
    print(f'  CSV header: {header}')
    
    # Buat CSV baru dengan kolom kode_bps tambahan
    enriched_path = os.path.join(DATA_DIR, 'podes2025_infra_enriched.csv')
    print(f'  Enriching dengan kode_bps...')
    
    with open(csv_path, 'r', encoding='utf-8') as fin, \
         open(enriched_path, 'w', newline='', encoding='utf-8') as fout:
        reader = csv.DictReader(fin)
        writer = csv.DictWriter(fout, fieldnames=['r101','r102','r103','r104','kode_bps','nama_prov','nama_kab','nama_kec','nama_desa','jenis','nama'])
        writer.writeheader()
        
        count = 0
        for rec in reader:
            kode_bps = f"{rec.get('R101','')}{rec.get('R102','')}{rec.get('R103','')}{rec.get('R104','')}"
            writer.writerow({
                'r101': rec.get('R101',''),
                'r102': rec.get('R102',''),
                'r103': rec.get('R103',''),
                'r104': rec.get('R104',''),
                'kode_bps': kode_bps,
                'nama_prov': rec.get('nama_prov',''),
                'nama_kab': rec.get('nama_kab',''),
                'nama_kec': rec.get('nama_kec',''),
                'nama_desa': rec.get('nama_desa',''),
                'jenis': rec.get('jenis',''),
                'nama': rec.get('nama',''),
            })
            count += 1
            if count % 100000 == 0:
                print(f'    {count:,} records...', flush=True)
    
    print(f'  Enriched: {count:,} records')
    
    # Import via \copy
    return psql_copy(
        enriched_path,
        'podes2025_infra',
        ['r101','r102','r103','r104','kode_bps','nama_prov','nama_kab','nama_kec','nama_desa','jenis','nama']
    )

def import_susenas_kamus():
    """Import kamus variabel dan value label dari layout CSV"""
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASS
    
    def escape_sql(s):
        """Escape single quote untuk SQL"""
        return str(s).replace("'", "''")
    
    def insert_row(table, columns, values):
        """Insert satu row via psql"""
        cols_str = ','.join(columns)
        vals_str = ','.join([f"'{escape_sql(v)}'" for v in values])
        cmd = [
            'psql', '-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME,
            '-c', f"INSERT INTO {table} ({cols_str}) VALUES ({vals_str});"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=10)
        return result.returncode == 0
    
    # 1. Variabel ruta
    ruta_vars = os.path.join(DATA_DIR, 'layout_variabel_ruta.csv')
    print('  Importing kamus variabel ruta...')
    with open(ruta_vars, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        next(reader)
        count = 0
        for row in reader:
            if len(row) < 2 or not row[0]:
                continue
            if insert_row('susenas_variabel', ['variabel','label','level'], [row[0], row[1], 'ruta']):
                count += 1
    print(f'    {count} variabel ruta')
    
    # 2. Variabel individu
    ind_vars = os.path.join(DATA_DIR, 'layout_variabel_individu.csv')
    print('  Importing kamus variabel individu...')
    with open(ind_vars, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        next(reader)
        count = 0
        for row in reader:
            if len(row) < 2 or not row[0]:
                continue
            if insert_row('susenas_variabel', ['variabel','label','level'], [row[0], row[1], 'individu']):
                count += 1
    print(f'    {count} variabel individu')
    
    # 3. Value labels ruta
    ruta_vals = os.path.join(DATA_DIR, 'layout_value_label_ruta.csv')
    print('  Importing value label ruta...')
    with open(ruta_vals, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        count = 0
        current_var = None
        for row in reader:
            if len(row) < 3:
                continue
            var_cell, val_cell, label = row[0], row[1], row[2]
            if var_cell:
                current_var = var_cell
            if not current_var or not val_cell:
                continue
            val = val_cell.replace('.0', '') if val_cell.endswith('.0') else val_cell
            if insert_row('susenas_value_label', ['variabel','nilai','label'], [current_var, val, label]):
                count += 1
    print(f'    {count} value labels ruta')
    
    # 4. Value labels individu
    ind_vals = os.path.join(DATA_DIR, 'layout_value_label_individu.csv')
    print('  Importing value label individu...')
    with open(ind_vals, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        count = 0
        current_var = None
        for row in reader:
            if len(row) < 3:
                continue
            var_cell, val_cell, label = row[0], row[1], row[2]
            if var_cell:
                current_var = var_cell
            if not current_var or not val_cell:
                continue
            val = val_cell.replace('.0', '') if val_cell.endswith('.0') else val_cell
            if insert_row('susenas_value_label', ['variabel','nilai','label'], [current_var, val, label]):
                count += 1
    print(f'    {count} value labels individu')

if __name__ == '__main__':
    print('=' * 60)
    print('FASE 2: IMPORT PODES INFRA + KAMUS SUSNAS')
    print('=' * 60)
    
    # 1. Import podes2025_infra
    print('\n[1/2] Import podes2025_infra (874.798 record)')
    import_podes_infra()
    
    # 2. Import kamus
    print('\n[2/2] Import kamus Susenas')
    import_susenas_kamus()
    
    print(f'\n{"="*60}')
    print('FASE 2 SELESAI')
    print(f'{"="*60}')
