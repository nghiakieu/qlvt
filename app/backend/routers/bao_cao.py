from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional
from datetime import date
import io
import openpyxl

from database import get_db
from models.inventory import TonKho
from models.master import Kho, NhomVatTu, DonViTinh
from models.material import VatTu
from models.transaction import PhieuNhap, PhieuXuat, CtPhieuNhap, CtPhieuXuat

router = APIRouter()

@router.get("/tong-hop-ton-kho")
def bao_cao_tong_hop(
    kho_ids: str = None,  # comma separated
    nhom_id: int = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    """
    Báo cáo tổng hợp tồn kho theo thời gian thực.
    Trong thực tế, báo cáo kỳ cần cộng trừ ngược từ tồn hiện tại
    bằng lịch sử nhập xuất. Để tinh gọn giai đoạn 1, 
    ta xuất báo cáo dựa trên số liệu hiện tại (thời điểm xem).
    """
    query_str = """
        SELECT v.ma_hang, v.ten_hang, d.ten AS dvt_chinh,
               k.ma_kho, k.ten_kho,
               SUM(t.so_luong) AS tong_sl,
               SUM(t.so_luong_kg) AS tong_kg
        FROM ton_kho t
        JOIN vat_tu v ON t.vat_tu_id = v.id
        JOIN kho k ON t.kho_id = k.id
        JOIN don_vi_tinh d ON v.dvt_id = d.id
        WHERE 1=1
    """
    params = {}
    
    if kho_ids:
        k_ids = [int(k) for k in kho_ids.split(',')]
        # Create named parameters for each id
        in_clause = ', '.join([f":k_{i}" for i in range(len(k_ids))])
        query_str += f" AND t.kho_id IN ({in_clause})"
        for i, k_id in enumerate(k_ids):
            params[f"k_{i}"] = k_id
            
    if nhom_id:
        query_str += " AND v.nhom_id = :nhom_id"
        params["nhom_id"] = nhom_id
        
    if search:
        search = search.strip()
        from utils.string_utils import remove_accents
        search_khong_dau = remove_accents(search)
        terms = search_khong_dau.split()
        for i, term in enumerate(terms):
            query_str += f" AND (v.ma_hang LIKE :term_{i} OR v.ten_khong_dau LIKE :term_{i} OR v.ten_hang LIKE :term_{i})"
            params[f"term_{i}"] = f"%{term}%"
        
    query_str += " GROUP BY v.ma_hang, v.ten_hang, d.ten, k.ma_kho, k.ten_kho"
    
    results = db.execute(text(query_str), params).fetchall()
    
    formatted = []
    for r in results:
        formatted.append({
            "ma_hang": r.ma_hang,
            "ten_hang": r.ten_hang,
            "dvt": r.dvt_chinh,
            "ma_kho": r.ma_kho,
            "ten_kho": r.ten_kho,
            "ton_sl": r.tong_sl,
            "ton_kg": r.tong_kg
        })
        
    return {"data": formatted}

@router.get("/ton-kho-cong-trinh")
def bao_cao_cong_trinh(search: str = None, db: Session = Depends(get_db)):
    """
    Báo cáo vật tư đang nằm tại các kho Công trình.
    """
    query_str = """
        SELECT k.ten_kho AS cong_trinh, v.ma_hang, v.ten_hang, d.ten AS dvt,
               SUM(t.so_luong) AS ton_sl,
               SUM(t.so_luong_kg) AS ton_kg
        FROM ton_kho t
        JOIN vat_tu v ON t.vat_tu_id = v.id
        JOIN kho k ON t.kho_id = k.id
        JOIN don_vi_tinh d ON v.dvt_id = d.id
        WHERE k.loai_kho = 'cong_trinh'
    """
    params = {}
    
    if search:
        search = search.strip()
        from utils.string_utils import remove_accents
        search_khong_dau = remove_accents(search)
        terms = search_khong_dau.split()
        for i, term in enumerate(terms):
            query_str += f" AND (v.ma_hang LIKE :term_{i} OR v.ten_khong_dau LIKE :term_{i} OR v.ten_hang LIKE :term_{i})"
            params[f"term_{i}"] = f"%{term}%"
            
    query_str += " GROUP BY k.ten_kho, v.ma_hang, v.ten_hang, d.ten"
    
    results = db.execute(text(query_str), params).fetchall()
    
    formatted = []
    for r in results:
        formatted.append({
            "cong_trinh": r.cong_trinh,
            "ma_hang": r.ma_hang,
            "ten_hang": r.ten_hang,
            "dvt": r.dvt,
            "ton_sl": r.ton_sl,
            "ton_kg": r.ton_kg
        })
    return formatted

@router.get("/export-excel")
def export_bao_cao(kho_ids: str = None, nhom_id: int = None, search: str = None, db: Session = Depends(get_db)):
    res = bao_cao_tong_hop(kho_ids, nhom_id, search, db)
    data = res["data"]
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BaoCaoTonKho"
    
    headers = ["Mã hàng", "Tên vật tư", "ĐVT", "Mã kho", "Tên kho", "Tồn kho (SL)", "Tồn kho (Kg)"]
    ws.append(headers)
    
    for item in data:
        ws.append([
            item["ma_hang"],
            item["ten_hang"],
            item["dvt"],
            item["ma_kho"],
            item["ten_kho"],
            item["ton_sl"],
            item["ton_kg"]
        ])
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=bao_cao_ton_kho.xlsx"
        }
    )

@router.get("/nhap-xuat-ton")
def bao_cao_nxt(
    tu_ngay: date,
    den_ngay: date,
    kho_id: int = None,
    db: Session = Depends(get_db)
):
    # Lấy danh sách tất cả vật tư
    vat_tu_list = db.query(
        VatTu.id, VatTu.ma_hang, VatTu.ten_hang, DonViTinh.ten.label("dvt")
    ).join(DonViTinh, VatTu.dvt_id == DonViTinh.id).all()
    
    # 1. Tính Tồn đầu kỳ (Nhập trước tu_ngay - Xuất trước tu_ngay)
    # Nhập trước tu_ngay
    nhap_dau_query = db.query(
        CtPhieuNhap.vat_tu_id,
        func.sum(CtPhieuNhap.so_luong).label("sl"),
        func.sum(CtPhieuNhap.so_luong_kg).label("kg")
    ).join(PhieuNhap).filter(
        PhieuNhap.trang_thai == "xac_nhan",
        PhieuNhap.ngay_nhap < tu_ngay
    )
    if kho_id:
        nhap_dau_query = nhap_dau_query.filter(PhieuNhap.kho_id == kho_id)
    nhap_dau = nhap_dau_query.group_by(CtPhieuNhap.vat_tu_id).all()
    
    # Xuất trước tu_ngay
    xuat_dau_query = db.query(
        CtPhieuXuat.vat_tu_id,
        func.sum(CtPhieuXuat.so_luong).label("sl"),
        func.sum(CtPhieuXuat.so_luong_kg).label("kg")
    ).join(PhieuXuat).filter(
        PhieuXuat.trang_thai == "xac_nhan",
        PhieuXuat.ngay_xuat < tu_ngay
    )
    if kho_id:
        xuat_dau_query = xuat_dau_query.filter(PhieuXuat.kho_xuat_id == kho_id)
    xuat_dau = xuat_dau_query.group_by(CtPhieuXuat.vat_tu_id).all()
    
    # 2. Tính Nhập trong kỳ
    nhap_ky_query = db.query(
        CtPhieuNhap.vat_tu_id,
        func.sum(CtPhieuNhap.so_luong).label("sl"),
        func.sum(CtPhieuNhap.so_luong_kg).label("kg")
    ).join(PhieuNhap).filter(
        PhieuNhap.trang_thai == "xac_nhan",
        PhieuNhap.ngay_nhap >= tu_ngay,
        PhieuNhap.ngay_nhap <= den_ngay
    )
    if kho_id:
        nhap_ky_query = nhap_ky_query.filter(PhieuNhap.kho_id == kho_id)
    nhap_ky = nhap_ky_query.group_by(CtPhieuNhap.vat_tu_id).all()
    
    # 3. Tính Xuất trong kỳ
    xuat_ky_query = db.query(
        CtPhieuXuat.vat_tu_id,
        func.sum(CtPhieuXuat.so_luong).label("sl"),
        func.sum(CtPhieuXuat.so_luong_kg).label("kg")
    ).join(PhieuXuat).filter(
        PhieuXuat.trang_thai == "xac_nhan",
        PhieuXuat.ngay_xuat >= tu_ngay,
        PhieuXuat.ngay_xuat <= den_ngay
    )
    if kho_id:
        xuat_ky_query = xuat_ky_query.filter(PhieuXuat.kho_xuat_id == kho_id)
    xuat_ky = xuat_ky_query.group_by(CtPhieuXuat.vat_tu_id).all()
    
    # Gom dữ liệu
    data_map = {}
    for vt in vat_tu_list:
        data_map[vt.id] = {
            "ma_hang": vt.ma_hang,
            "ten_hang": vt.ten_hang,
            "dvt": vt.dvt,
            "dau_sl": 0, "dau_kg": 0,
            "nhap_sl": 0, "nhap_kg": 0,
            "xuat_sl": 0, "xuat_kg": 0,
            "cuoi_sl": 0, "cuoi_kg": 0
        }
        
    for r in nhap_dau:
        if r.vat_tu_id in data_map:
            data_map[r.vat_tu_id]["dau_sl"] += r.sl or 0
            data_map[r.vat_tu_id]["dau_kg"] += r.kg or 0
    for r in xuat_dau:
        if r.vat_tu_id in data_map:
            data_map[r.vat_tu_id]["dau_sl"] -= r.sl or 0
            data_map[r.vat_tu_id]["dau_kg"] -= r.kg or 0
            
    for r in nhap_ky:
        if r.vat_tu_id in data_map:
            data_map[r.vat_tu_id]["nhap_sl"] += r.sl or 0
            data_map[r.vat_tu_id]["nhap_kg"] += r.kg or 0
    for r in xuat_ky:
        if r.vat_tu_id in data_map:
            data_map[r.vat_tu_id]["xuat_sl"] += r.sl or 0
            data_map[r.vat_tu_id]["xuat_kg"] += r.kg or 0
            
    result = []
    for vt_id, item in data_map.items():
        item["cuoi_sl"] = item["dau_sl"] + item["nhap_sl"] - item["xuat_sl"]
        item["cuoi_kg"] = item["dau_kg"] + item["nhap_kg"] - item["xuat_kg"]
        
        # Chỉ hiển thị nếu có phát sinh hoặc có tồn
        if (item["dau_sl"] != 0 or item["nhap_sl"] != 0 or 
            item["xuat_sl"] != 0 or item["cuoi_sl"] != 0):
            result.append(item)
            
    return {"data": result}

@router.get("/export-nxt-excel")
def export_nxt_excel(
    tu_ngay: date,
    den_ngay: date,
    kho_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    import io
    import openpyxl
    from fastapi.responses import StreamingResponse
    
    # Lấy dữ liệu NXT
    res = nhap_xuat_ton(tu_ngay, den_ngay, kho_id, db)
    data = res["data"]
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bao_Cao_NXT"
    
    headers = [
        "Mã hàng", "Tên hàng", "ĐVT", 
        "Tồn đầu (SL)", "Tồn đầu (KG)", 
        "Nhập trong kỳ (SL)", "Nhập trong kỳ (KG)",
        "Xuất trong kỳ (SL)", "Xuất trong kỳ (KG)",
        "Tồn cuối (SL)", "Tồn cuối (KG)"
    ]
    ws.append(headers)
    
    for item in data:
        ws.append([
            item["ma_hang"], item["ten_hang"], item["dvt"],
            item["dau_sl"], item["dau_kg"],
            item["nhap_sl"], item["nhap_kg"],
            item["xuat_sl"], item["xuat_kg"],
            item["cuoi_sl"], item["cuoi_kg"]
        ])
        
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws.column_dimensions[col_letter].width = max_length + 2

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Bao_Cao_NXT.xlsx"}
    )
