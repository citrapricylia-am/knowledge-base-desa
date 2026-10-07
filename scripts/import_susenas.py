#!/usr/bin/env python3
"""
Fase 3: Import Susenas RT dan Individu via psql COPY
Enrich CSV ke file temp (rename header lowercase), lalu COPY FROM file.
"""
import subprocess
import os
import csv
import io
import tempfile

DB_HOST = 'aws-0-ap-southeast-1.pooler.supabase.com'
DB_PORT = '6543'
DB_USER = 'postgres.ieiwmuvvumilueyktcsv'
DB_NAME = 'postgres'
DB_PASS = os.environ.get('SUPABASE_PASS') or os.environ.get('PGPASSWORD') or ''
if not DB_PASS:
    raise SystemExit('Set SUPABASE_PASS dulu: export SUPABASE_PASS="<password>"')

DATA_DIR = '/home/citra/knowledge-base-desa/scripts/data'

def psql_copy_file(csv_path, table_name, columns):
    """Import CSV ke tabel via psql COPY. 
    Enrich: rename header ke lowercase, select kolom yang relevan."""
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASS
    
    cols_str = ','.join(columns)
    
    # Baca CSV asli, tulis ulang ke temp file dengan header lowercase
    with open(csv_path, 'r', encoding='utf-8') as fin:
        reader = csv.reader(fin)
        header = next(reader)
        
        # Map: nama kolom di tabel -> index di CSV asli
        col_to_idx = {}
        for i, h in enumerate(header):
            h_norm = h.lower().replace('.', '_')
            if h_norm in columns:
                col_to_idx[h_norm] = i
        
        # Tulis file temp dengan hanya kolom yang relevan
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8', newline='')
        writer = csv.writer(tmp)
        writer.writerow(columns)
        
        count = 0
        for row in reader:
            out_row = []
            for col in columns:
                idx = col_to_idx.get(col)
                if idx is not None and idx < len(row):
                    val = row[idx]
                    # Empty string -> NULL
                    out_row.append(val if val else '')
                else:
                    out_row.append('')
            writer.writerow(out_row)
            count += 1
            if count % 100000 == 0:
                print(f'    {count:,} records...', flush=True)
        
        tmp.close()
        print(f'  Total: {count:,} records prepared -> {tmp.name}')
        
        # \copy (client-side copy, bekerja untuk semua user)
        # \copy tidak bisa pakai -c, harus pakai -f atau stdin
        # Alternatif: pipe file ke psql dengan perintah \copy
        copy_cmd = f"\\copy {table_name}({cols_str}) FROM '{tmp.name}' WITH (FORMAT csv, HEADER true, NULL '')"
        
        cmd = [
            'psql', '-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME,
            '-c', copy_cmd
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=600)
        os.unlink(tmp.name)
        
        if result.returncode != 0:
            print(f'  ERROR: {result.stderr[:500]}')
            return False
        
        print(f'  {result.stdout.strip()}')
        return True

if __name__ == '__main__':
    print('=' * 60)
    print('FASE 3: IMPORT SUSNAS RT + INDIVIDU')
    print('=' * 60)
    
    # 1. Susenas RT
    print('\n[1/3] Import susenas_rt (343.460 record)')
    rt_csv = os.path.join(DATA_DIR, 'susenas_rt.csv')
    rt_columns = [
        'urut','psu','ssu','strata','r101','r102','r105','nuinfort',
        'r1501','r1502','r1503','r1504','r1505','r1506','r1507','r1508',
        'r1601','r1602','r1603','r1604','r1605','r1606','r1607','r1608',
        'r1609a','r1609b','r1609c','r1609d','r1609e',
        'r1610a','r1610b','r1610c','r1611a','r1611b','r1612',
        'r1613a','r1613b','r1613c','r1613d','r1613e',
        'r1614a','r1614b','r1615a','r1615b','r1615c',
        'r1616','r1616b1'
    ]
    psql_copy_file(rt_csv, 'susenas_rt', rt_columns)
    
    # 2. Susenas IND
    print('\n[2/3] Import susenas_ind dari ind1 (1.173.633 record)')
    ind1_csv = os.path.join(DATA_DIR, 'susenas_ind1.csv')
    ind_columns = [
        'urut','psu','ssu','strata','r101','r102','r105',
        'r401','r403','r404','r405','r406a','r406b','r406c','r407','r408','r409','r410',
        'r501','r502','r503','r504','r505','r507','r508','r509','r510',
        'r601','r602','r603','r604','r605','r606',
        'r608','r609','r611','r612','r613','r614','r615','r616','r617','r618_a','r618_b'
    ]
    psql_copy_file(ind1_csv, 'susenas_ind', ind_columns)
    
    # 3. Verifikasi
    print('\n[3/3] Verifikasi')
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASS
    cmd = [
        'psql', '-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME,
        '-c', "SELECT 'susenas_rt' as tabel, count(*) as total FROM susenas_rt UNION ALL SELECT 'susenas_ind', count(*) FROM susenas_ind;"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=30)
    print(result.stdout)
    
    print(f'\n{"="*60}')
    print('FASE 3 SELESAI')
    print(f'{"="*60}')
