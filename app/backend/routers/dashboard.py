from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
from models.master import Kho
from models.material import VatTu
from models.transaction import PhieuNhap, PhieuXuat, CtPhieuNhap, CtPhieuXuat
from models.inventory import TonKho

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    tong_vat_tu = db.query(VatTu).filter(VatTu.an.is_(False)).count()
    tong_kho = db.query(Kho).count()
    
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    tong_phieu_nhap = db.query(PhieuNhap).filter(
        PhieuNhap.trang_thai == "xac_nhan",
        func.extract('month', PhieuNhap.ngay_nhap) == current_month,
        func.extract('year', PhieuNhap.ngay_nhap) == current_year
    ).count()
    
    tong_phieu_xuat = db.query(PhieuXuat).filter(
        PhieuXuat.trang_thai == "xac_nhan",
        func.extract('month', PhieuXuat.ngay_xuat) == current_month,
        func.extract('year', PhieuXuat.ngay_xuat) == current_year
    ).count()
    
    # Biểu đồ 6 tháng gần nhất
    chart_data = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=30*i)
        m = d.month
        y = d.year
        
        # Nhập kg
        nhap_kg = db.query(func.sum(CtPhieuNhap.so_luong_kg)).join(PhieuNhap).filter(
            PhieuNhap.trang_thai == "xac_nhan",
            func.extract('month', PhieuNhap.ngay_nhap) == m,
            func.extract('year', PhieuNhap.ngay_nhap) == y
        ).scalar() or 0
        
        # Xuất kg
        xuat_kg = db.query(func.sum(CtPhieuXuat.so_luong_kg)).join(PhieuXuat).filter(
            PhieuXuat.trang_thai == "xac_nhan",
            func.extract('month', PhieuXuat.ngay_xuat) == m,
            func.extract('year', PhieuXuat.ngay_xuat) == y
        ).scalar() or 0
        
        chart_data.append({
            "thang": f"T{m}",
            "nhap": float(nhap_kg),
            "xuat": float(xuat_kg)
        })
    
    # Top 5 tồn kho nhiều nhất
    top_ton_kho_query = db.query(
        VatTu.ten_hang, func.sum(TonKho.so_luong_kg).label("tong_kg")
    ).join(TonKho).group_by(VatTu.id).order_by(func.sum(TonKho.so_luong_kg).desc()).limit(5).all()
    
    top_ton_kho = [{"ten": r.ten_hang, "kg": float(r.tong_kg or 0)} for r in top_ton_kho_query]
    
    # Cảnh báo tồn kho (Dưới 50kg)
    canh_bao_query = db.query(
        VatTu.ten_hang, func.sum(TonKho.so_luong_kg).label("tong_kg")
    ).join(TonKho).group_by(VatTu.id).having(func.sum(TonKho.so_luong_kg) < 50).limit(5).all()
    
    canh_bao = [{"ten": r.ten_hang, "kg": float(r.tong_kg or 0)} for r in canh_bao_query]

    return {
        "tong_vat_tu": tong_vat_tu,
        "tong_kho": tong_kho,
        "phieu_nhap_thang": tong_phieu_nhap,
        "phieu_xuat_thang": tong_phieu_xuat,
        "chart_data": chart_data,
        "top_ton_kho": top_ton_kho,
        "canh_bao": canh_bao
    }
