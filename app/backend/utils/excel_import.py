"""
Script import toàn bộ dữ liệu từ 5 file Excel vào SQLite.
Chạy: python utils/excel_import.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import openpyxl
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from database import engine, init_db, SessionLocal
from models import (
    DonViTinh, NhomVatTu, Kho, ViTri, VatTu, TonKho, CounterPhieu
)

DATA_DIR = r"c:\QLVT"

# ─────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────
def clean(v):
    """Làm sạch giá trị ô Excel."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def safe_float(v):
    try:
        return float(v) if v is not None else None
    except (ValueError, TypeError):
        return None


def read_excel_rows(path: str, skip_rows: int = 3) -> list[tuple]:
    """Đọc rows từ Excel, bỏ qua header rows."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < skip_rows:
            continue
        rows.append(row)
    wb.close()
    return rows


# ─────────────────────────────────────────────────────────
# 1. ĐƠN VỊ TÍNH
# ─────────────────────────────────────────────────────────
def import_don_vi_tinh(db: Session):
    path = os.path.join(DATA_DIR, "Đơn vị tính.xlsx")
    rows = read_excel_rows(path, skip_rows=3)
    count = 0
    added_tens = set()
    for row in rows:
        # Cột: STT | Đơn vị tính | Mô tả | Trạng thái
        if not row or not row[1]:
            continue
        ten = clean(row[1])
        if not ten or ten in added_tens:
            continue
        existing = db.query(DonViTinh).filter(DonViTinh.ten == ten).first()
        if not existing:
            db.add(DonViTinh(ten=ten, mo_ta=clean(row[2])))
            added_tens.add(ten)
            count += 1
    db.flush()  # flush để cập nhật added_tens
    # Thêm các ĐVT cần thiết chưa có (re-query sau flush)
    for ten in ["Kg", "Tấm", "Thanh", "Bộ", "Cái", "Tấn", "Cuộn", "m"]:
        if ten not in added_tens and not db.query(DonViTinh).filter(DonViTinh.ten == ten).first():
            db.add(DonViTinh(ten=ten))
            count += 1
    db.commit()
    print(f"  ✓ Don vi tinh: {count} moi")


# ─────────────────────────────────────────────────────────
# 2. NHÓM VẬT TƯ
# ─────────────────────────────────────────────────────────
def import_nhom_vat_tu(db: Session):
    path = os.path.join(DATA_DIR, "Nhóm vật tư hàng hóa.xlsx")
    rows = read_excel_rows(path, skip_rows=3)
    count = 0
    for row in rows:
        # Cột: STT | Mã nhóm | Tên nhóm | Trạng thái
        if not row or not row[1]:
            continue
        ma = clean(row[1])
        ten = clean(row[2])
        if not ma or not ten:
            continue
        existing = db.query(NhomVatTu).filter(NhomVatTu.ma_nhom == ma).first()
        if not existing:
            db.add(NhomVatTu(ma_nhom=ma, ten_nhom=ten))
            count += 1
    db.commit()
    print(f"  ✓ Nhóm vật tư: {count} mới")


# ─────────────────────────────────────────────────────────
# 3. KHO
# ─────────────────────────────────────────────────────────
def import_kho(db: Session):
    path = os.path.join(DATA_DIR, "Kho.xlsx")
    rows = read_excel_rows(path, skip_rows=3)
    count = 0
    # Danh sách kho trung tâm dựa theo tên
    kho_trung_tam = {"001", "002", "141", "293", "294"}
    for row in rows:
        # Cột: STT | Mã kho | Tên kho | Địa chỉ | Chi nhánh | Mã kế toán | Trạng thái
        if not row or not row[1]:
            continue
        ma = clean(row[1])
        ten = clean(row[2])
        if not ma or not ten:
            continue
        existing = db.query(Kho).filter(Kho.ma_kho == ma).first()
        if not existing:
            loai = "trung_tam" if ma in kho_trung_tam else "cong_trinh"
            db.add(Kho(
                ma_kho=ma,
                ten_kho=ten,
                loai_kho=loai,
                dia_chi=clean(row[3]),
                ma_kho_ke_toan=clean(row[5]),
            ))
            count += 1
    db.commit()
    print(f"  ✓ Kho: {count} mới")


# ─────────────────────────────────────────────────────────
# 4. VỊ TRÍ VẬT TƯ
# ─────────────────────────────────────────────────────────
def import_vi_tri(db: Session):
    path = os.path.join(DATA_DIR, "Vị trí vật tư, hàng hóa.xlsx")
    rows = read_excel_rows(path, skip_rows=3)
    count = 0
    # Lấy kho mặc định (001 - Kho gia công) làm kho cho các vị trí này
    kho_default = db.query(Kho).filter(Kho.ma_kho == "001").first()
    kho_id = kho_default.id if kho_default else None
    for row in rows:
        # Cột: STT | Mã vị trí | Tên vị trí | Mô tả | Trạng thái
        if not row or not row[1]:
            continue
        ma = clean(row[1])
        ten = clean(row[2])
        if not ma or not ten:
            continue
        existing = db.query(ViTri).filter(ViTri.ma_vi_tri == ma).first()
        if not existing:
            db.add(ViTri(
                kho_id=kho_id,
                ma_vi_tri=ma,
                ten_vi_tri=ten,
            ))
            count += 1
    db.commit()
    print(f"  ✓ Vị trí: {count} mới")


# ─────────────────────────────────────────────────────────
# 5. VẬT TƯ HÀNG HÓA
# ─────────────────────────────────────────────────────────
def import_vat_tu(db: Session):
    path = os.path.join(DATA_DIR, "Vật tư hàng hóa.xlsx")

    # Build lookup maps
    dvt_map = {d.ten: d.id for d in db.query(DonViTinh).all()}
    nhom_map = {n.ma_nhom: n.id for n in db.query(NhomVatTu).all()}

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active

    count = 0
    skip = 3  # 3 header rows
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < skip:
            continue
        # Cột: STT | Mã hàng | Tên hàng | Tính chất | ĐVT chính | Nhóm VTHH |
        #       Số lượng tồn | Mô tả | ... | Trạng thái | ĐVT chuyển đổi | Tỷ lệ | Phép tính | ...
        if not row or not row[1]:
            continue

        ma = clean(row[1])
        ten = clean(row[2])
        if not ma or not ten:
            continue

        tinh_chat_raw = clean(row[3]) or ""
        if "công cụ" in tinh_chat_raw.lower() or "dụng cụ" in tinh_chat_raw.lower():
            tinh_chat = "ccdc"
        else:
            tinh_chat = "hang_hoa"

        dvt_ten = clean(row[4])
        dvt_id = dvt_map.get(dvt_ten) if dvt_ten else None

        nhom_ma = clean(row[5])
        nhom_id = nhom_map.get(nhom_ma) if nhom_ma else None

        mo_ta = clean(row[7])

        # ĐVT phụ và tỷ lệ (cột 27, 28, 29)
        dvt_phu = clean(row[27]) if len(row) > 27 else None
        ty_le = safe_float(row[28]) if len(row) > 28 else None
        phep_tinh_raw = clean(row[29]) if len(row) > 29 else None
        phep_tinh = "chia" if phep_tinh_raw and "chia" in phep_tinh_raw.lower() else "nhan"

        existing = db.query(VatTu).filter(VatTu.ma_hang == ma).first()
        if not existing:
            db.add(VatTu(
                ma_hang=ma,
                ten_hang=ten,
                tinh_chat=tinh_chat,
                dvt_id=dvt_id,
                nhom_id=nhom_id,
                dvt_phu=dvt_phu,
                ty_le_quy_doi=ty_le,
                phep_tinh=phep_tinh,
                mo_ta=mo_ta,
            ))
            count += 1
            if count % 200 == 0:
                db.commit()
                print(f"    ... đã import {count} vật tư")

    db.commit()
    wb.close()
    print(f"  ✓ Vật tư: {count} mới")


# ─────────────────────────────────────────────────────────
# 6. TỒN KHO ĐẦU KỲ (từ báo cáo tổng hợp)
# ─────────────────────────────────────────────────────────
def import_ton_kho(db: Session):
    """
    Đọc file Bao_cao_tong_hop_ton_kho.xlsx để lấy tồn cuối kỳ
    làm tồn đầu kỳ cho hệ thống.
    Cấu trúc: mỗi kho có 1 header row, rồi các dòng vật tư.
    """
    path = os.path.join(DATA_DIR, "Bao_cao_tong_hop_ton_kho.xlsx")

    # Build lookup
    vat_tu_map = {v.ma_hang: v for v in db.query(VatTu).all()}
    kho_map = {k.ma_kho: k for k in db.query(Kho).all()}

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active

    # Cấu trúc file:
    # Row 1: Tổng hợp tồn kho
    # Row 2: Năm 2026
    # Row 3: (blank)
    # Row 4: header: Mã hàng | Tên... | ĐVT | ĐVT chính | Tồn đầu kỳ SL |
    #         Nhập GC mới SL | Nhập ĐC SL | Tổng nhập SL | Tổng nhập KL |
    #         Xuất ĐC SL | Xuất bán TL SL | Tổng xuất SL | Tổng xuất KL |
    #         Tồn CK SL | Tồn CK KL
    # Sau đó: "Mã kho: 001 (1)" → group header
    #          Dòng vật tư
    # Columns: 0=MãHàng, 1=Tên, 2=ĐVT, 3=ĐVTchính, 4=TồnĐK,
    #           5=NhậpGCmới, 6=NhậpĐC, 7=TổngNhập, 8=TổngNhậpKL,
    #           9=XuấtĐC, 10=XuấtBánTL, 11=TổngXuất, 12=TổngXuấtKL,
    #           13=TồnCK_SL, 14=TồnCK_KL

    current_kho = None
    count = 0
    skip = 5  # bỏ 5 dòng đầu (title + header)

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < skip:
            continue
        if not row or all(v is None for v in row):
            continue

        ma_hang = clean(row[0])
        if not ma_hang:
            continue

        # Nhận diện dòng header kho: "Mã kho: 001 (1)"
        if ma_hang.startswith("Mã kho:"):
            # Trích mã kho: "Mã kho: 001 (1)" → "001"
            try:
                ma_kho = ma_hang.split(":")[1].strip().split(" ")[0]
                current_kho = kho_map.get(ma_kho)
            except Exception:
                current_kho = None
            continue

        # Bỏ dòng tên kho: "Tên kho: Kho gia công (319)"
        if ma_hang.startswith("Tên kho:"):
            continue

        # Dòng vật tư thực tế
        vat_tu = vat_tu_map.get(ma_hang)
        if not vat_tu or not current_kho:
            continue

        ton_ck_sl = safe_float(row[13])   # Tồn cuối kỳ - Số lượng
        ton_ck_kg = safe_float(row[14])   # Tồn cuối kỳ - Khối lượng

        if ton_ck_sl is None:
            ton_ck_sl = 0.0
        if ton_ck_kg is None:
            ton_ck_kg = 0.0

        # Upsert tồn kho
        existing = db.query(TonKho).filter(
            TonKho.vat_tu_id == vat_tu.id,
            TonKho.kho_id == current_kho.id,
            TonKho.vi_tri_id == None,
        ).first()

        if existing:
            existing.so_luong += ton_ck_sl
            existing.so_luong_kg += ton_ck_kg
        else:
            db.add(TonKho(
                vat_tu_id=vat_tu.id,
                kho_id=current_kho.id,
                vi_tri_id=None,
                so_luong=ton_ck_sl,
                so_luong_kg=ton_ck_kg,
            ))
            count += 1

        if count % 500 == 0 and count > 0:
            db.commit()
            print(f"    ... đã import {count} dòng tồn kho")

    db.commit()
    wb.close()
    print(f"  ✓ Tồn kho: {count} dòng mới")


# ─────────────────────────────────────────────────────────
# 7. KHỞI TẠO COUNTER PHIẾU
# ─────────────────────────────────────────────────────────
def init_counter(db: Session):
    nam = datetime.now().year
    for loai in ["PNK", "PXK", "PDC", "KK"]:
        existing = db.query(CounterPhieu).filter(CounterPhieu.loai == loai).first()
        if not existing:
            db.add(CounterPhieu(loai=loai, nam=nam, so_thu_tu=0))
    db.commit()
    print("  ✓ Counter phiếu khởi tạo OK")


# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────
def run_import():
    print("=" * 55)
    print("  IMPORT DỮ LIỆU EXCEL → SQLITE")
    print("=" * 55)

    print("\n[1] Khởi tạo database schema...")
    init_db()

    db = SessionLocal()
    try:
        print("\n[2] Import Đơn vị tính...")
        import_don_vi_tinh(db)

        print("\n[3] Import Nhóm vật tư...")
        import_nhom_vat_tu(db)

        print("\n[4] Import Kho...")
        import_kho(db)

        print("\n[5] Import Vị trí vật tư...")
        import_vi_tri(db)

        print("\n[6] Import Vật tư hàng hóa (~3086 mặt hàng)...")
        import_vat_tu(db)

        print("\n[7] Import Tồn kho đầu kỳ (~3565 dòng)...")
        import_ton_kho(db)

        print("\n[8] Khởi tạo counter phiếu...")
        init_counter(db)

        # Thống kê kết quả
        print("\n" + "=" * 55)
        print("  KẾT QUẢ IMPORT")
        print("=" * 55)
        print(f"  Đơn vị tính : {db.query(DonViTinh).count()}")
        print(f"  Nhóm vật tư : {db.query(NhomVatTu).count()}")
        print(f"  Kho         : {db.query(Kho).count()}")
        print(f"  Vị trí      : {db.query(ViTri).count()}")
        print(f"  Vật tư      : {db.query(VatTu).count()}")
        print(f"  Tồn kho     : {db.query(TonKho).count()}")
        print("=" * 55)
        print("  ✅ IMPORT HOÀN TẤT!")
        print("=" * 55)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    run_import()
