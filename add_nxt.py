import sys

with open("app/backend/routers/bao_cao.py", "a", encoding="utf-8") as f:
    f.write("""
from models.transaction import PhieuNhap, PhieuXuat, CtPhieuNhap, CtPhieuXuat

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
""")
