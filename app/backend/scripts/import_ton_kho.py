import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import math

# Add parent directory to path so we can import from models
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.inventory import TonKho
from models.master import Kho
from models.material import VatTu
from database import get_db

def main():
    file_path = 'C:/QLVT/Bao_cao_tong_hop_ton_kho.xlsx'
    print(f"Reading {file_path}...")
    try:
        df = pd.read_excel(file_path, header=None)
    except Exception as e:
        print(f"Failed to read excel: {e}")
        return

    # Use existing db session
    from database import SessionLocal
    db = SessionLocal()

    current_kho_id = None
    processed_count = 0
    updated_count = 0
    inserted_count = 0
    not_found_count = 0

    for idx, row in df.iterrows():
        col0 = row[0]
        
        # Check if it's a Kho header row
        if isinstance(col0, str) and str(col0).startswith('Mã kho: '):
            # Mã kho: 001 (1) -> Extract 001
            ma_kho = col0.split('Mã kho: ')[1].split(' (')[0].strip()
            # Find kho in db
            kho = db.query(Kho).filter(Kho.ma_kho == ma_kho).first()
            if kho:
                current_kho_id = kho.id
                print(f"Found Kho: {kho.ten_kho} (ID: {kho.id})")
            else:
                current_kho_id = None
                print(f"Warning: Kho '{ma_kho}' not found in DB.")
            continue
            
        # Ignore empty rows, headers, and rows without a valid current_kho_id
        if current_kho_id is None:
            continue
            
        if pd.isna(col0) or str(col0).strip() in ['Mã hàng', 'Tổng hợp tồn kho', '']:
            continue
            
        if isinstance(col0, str) and (col0.startswith('Tên kho:') or col0.startswith('Từ ngày')):
            continue
            
        # At this point, it should be an item row.
        # Format: col0 = ma_hang
        # col13 = Ton cuoi ky - So luong
        # col14 = Ton cuoi ky - Khoi luong
        
        ma_hang = str(col0).strip()
        sl = row[13]
        kg = row[14]
        
        # Skip if not numeric
        if pd.isna(sl): sl = 0
        if pd.isna(kg): kg = 0
        try:
            sl = float(sl)
            kg = float(kg)
        except ValueError:
            continue # not a data row
            
        # Find vat tu
        vat_tu = db.query(VatTu).filter(VatTu.ma_hang == ma_hang).first()
        if not vat_tu:
            # print(f"Warning: VatTu '{ma_hang}' not found. Skipping.")
            not_found_count += 1
            continue
            
        processed_count += 1
        
        # Upsert TonKho
        ton = db.query(TonKho).filter(
            TonKho.vat_tu_id == vat_tu.id,
            TonKho.kho_id == current_kho_id,
            TonKho.vi_tri_id == None
        ).first()
        
        if ton:
            ton.so_luong = sl
            ton.so_luong_kg = kg
            updated_count += 1
        else:
            if sl != 0 or kg != 0:
                new_ton = TonKho(
                    vat_tu_id=vat_tu.id,
                    kho_id=current_kho_id,
                    vi_tri_id=None,
                    so_luong=sl,
                    so_luong_kg=kg
                )
                db.add(new_ton)
                inserted_count += 1

    db.commit()
    print(f"--- Summary ---")
    print(f"Processed item rows: {processed_count}")
    print(f"Updated records: {updated_count}")
    print(f"Inserted records: {inserted_count}")
    print(f"Not found VatTu: {not_found_count}")
    print("Done!")

if __name__ == "__main__":
    main()
