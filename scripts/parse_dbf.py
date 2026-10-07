#!/usr/bin/env python3
"""
Fase 1: Parse DBF + buat CSV + ekstrak kamus Layout XLS
Stream record satu per satu (low memory) untuk hindari OOM.
"""
import csv
import os
import sys
from dbfread import DBF, FieldParser

SRC = '/home/citra/Downloads/datapodes-susenas/'
OUT = '/home/citra/knowledge-base-desa/scripts/data/'
os.makedirs(OUT, exist_ok=True)

class SafeFieldParser(FieldParser):
    """Parse DBF dengan handling nilai numeric yang corrupt."""
    def parseN(self, field, data):
        try:
            return super().parseN(field, data)
        except (ValueError, TypeError):
            return None

def dbf_to_csv(dbf_path, csv_path, max_records=None):
    """Convert DBF ke CSV dengan streaming (low memory)."""
    table = DBF(dbf_path, load=False, encoding='latin-1', parserclass=SafeFieldParser)
    fieldnames = [f.name for f in table.fields]
    
    written = 0
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        for rec in table:
            # Clean None values, keep everything else
            writer.writerow(rec)
            written += 1
            if max_records and written >= max_records:
                break
            if written % 100000 == 0:
                print(f'  {written:,} records...', flush=True)
    
    size = os.path.getsize(csv_path)
    print(f'  Done: {written:,} records, {size/1024/1024:.1f} MB', flush=True)
    return written

def extract_layout(xls_path, out_dir):
    """Ekstrak kamus variabel dari Layout XLS ke CSV."""
    import xlrd
    wb = xlrd.open_workbook(xls_path)
    
    for sheet_name in wb.sheet_names():
        ws = wb.sheet_by_name(sheet_name)
        out_path = os.path.join(out_dir, f'layout_{sheet_name.replace(" ", "_")}.csv')
        
        with open(out_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for r in range(ws.nrows):
                row = [str(ws.cell_value(r, c)).strip() for c in range(ws.ncols)]
                writer.writerow(row)
        
        print(f'  {sheet_name}: {ws.nrows} rows -> {out_path}', flush=True)

if __name__ == '__main__':
    print('=' * 60)
    print('FASE 1: PARSE DBF + CSV + KAMUS')
    print('=' * 60)
    
    # 1. Podes infrastruktur
    print('\n[1/5] podes2025_infra.dbf -> CSV')
    n1 = dbf_to_csv(
        os.path.join(SRC, 'podes2025_infra.dbf'),
        os.path.join(OUT, 'podes2025_infra.csv'),
    )
    
    # 2. Susenas RT
    print('\n[2/5] ssn202503_kor_rt.dbf -> CSV')
    n2 = dbf_to_csv(
        os.path.join(SRC, 'ssn202503_kor_rt.dbf'),
        os.path.join(OUT, 'susenas_rt.csv'),
    )
    
    # 3. Susenas IND1
    print('\n[3/5] ssn202503_kor_ind1.dbf -> CSV')
    n3 = dbf_to_csv(
        os.path.join(SRC, 'ssn202503_kor_ind1.dbf'),
        os.path.join(OUT, 'susenas_ind1.csv'),
    )
    
    # 4. Susenas IND2
    print('\n[4/5] ssn202503_kor_ind2.dbf -> CSV')
    n4 = dbf_to_csv(
        os.path.join(SRC, 'ssn202503_kor_ind2.dbf'),
        os.path.join(OUT, 'susenas_ind2.csv'),
    )
    
    # 5. Layout XLS
    print('\n[5/5] Layout Susenas XLS -> CSV')
    extract_layout(
        os.path.join(SRC, 'Layout Susenas 202503 Kor.xls'),
        OUT,
    )
    
    print(f'\n{"="*60}')
    print(f'SUMMARY:')
    print(f'  Podes infra:    {n1:>10,} records')
    print(f'  Susenas RT:     {n2:>10,} records')
    print(f'  Susenas IND1:   {n3:>10,} records')
    print(f'  Susenas IND2:   {n4:>10,} records')
    print(f'  Total:          {n1+n2+n3+n4:>10,} records')
    print(f'  Output dir: {OUT}')
    print(f'{"="*60}')
