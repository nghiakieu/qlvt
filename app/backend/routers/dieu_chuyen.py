from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime
import io
import openpyxl

from database import get_db
from models.transaction import (
    PhieuDieuChuyen, CtDieuChuyen,
    PhieuXuat, CtPhieuXuat,
    PhieuNhap, CtPhieuNhap
)
from models.inventory import TonKho
from models.material import VatTu
from schemas import transaction as schemas
from routers.nhap_kho import generate_so_phieu, _find_or_create_ton_kho

router = APIRouter()

from pydantic import BaseModel

class LenhDCListResponse(BaseModel):
    total: int
    items: List[schemas.PhieuDieuChuyen]
    skip: int
    limit: int

@router.get("/", response_model=LenhDCListResponse)
def get_list(
    skip: int = 0, limit: int = 50,
    kho_id: Optional[int] = None,
    trang_thai: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PhieuDieuChuyen).options(
        joinedload(PhieuDieuChuyen.kho_xuat),
        joinedload(PhieuDieuChuyen.kho_nhan)
    )
    if trang_thai:
        query = query.filter(PhieuDieuChuyen.trang_thai == trang_thai)
    if kho_id:
        query = query.filter(
            (PhieuDieuChuyen.kho_xuat_id == kho_id) | (PhieuDieuChuyen.kho_nhan_id == kho_id)
        )
    query = query.order_by(PhieuDieuChuyen.created_at.desc())
    total = query.count()
    return {"total": total, "items": query.offset(skip).limit(limit).all(), "skip": skip, "limit": limit}

@router.get("/{phieu_id}", response_model=schemas.PhieuDieuChuyen)
def get_detail(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuDieuChuyen).options(
        joinedload(PhieuDieuChuyen.kho_xuat),
        joinedload(PhieuDieuChuyen.kho_nhan),
        joinedload(PhieuDieuChuyen.chi_tiet).joinedload(CtDieuChuyen.vat_tu).joinedload(VatTu.dvt),
        joinedload(PhieuDieuChuyen.chi_tiet).joinedload(CtDieuChuyen.vi_tri_nhan)
    ).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh điều chuyển")
    return phieu

@router.post("/", response_model=schemas.PhieuDieuChuyen)
def create(phieu: schemas.PhieuDieuChuyenCreate, db: Session = Depends(get_db)):
    so_phieu = generate_so_phieu(db, "LDC")
    db_phieu = PhieuDieuChuyen(
        so_phieu=so_phieu,
        ngay_dc=phieu.ngay_dc,
        so_lenh_dieu_dong=phieu.so_lenh_dieu_dong,
        kho_xuat_id=phieu.kho_xuat_id,
        kho_nhan_id=phieu.kho_nhan_id,
        bien_so_xe=phieu.bien_so_xe,
        nguoi_giao=phieu.nguoi_giao,
        nguoi_nhan=phieu.nguoi_nhan,
        ghi_chu=phieu.ghi_chu,
        trang_thai="cho_xuat"
    )
    db.add(db_phieu)
    db.flush()

    for ct in phieu.chi_tiet:
        so_luong_kg = ct.so_luong_gui_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong_gui > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong_gui / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong_gui * vt.ty_le_quy_doi

        db_ct = CtDieuChuyen(
            phieu_id=db_phieu.id,
            vat_tu_id=ct.vat_tu_id,
            so_luong_gui=ct.so_luong_gui,
            so_luong_gui_kg=so_luong_kg,
            da_xuat_sl=0, da_xuat_kg=0
        )
        db.add(db_ct)

    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.put("/{phieu_id}", response_model=schemas.PhieuDieuChuyen)
def update(phieu_id: int, phieu: schemas.PhieuDieuChuyenCreate, db: Session = Depends(get_db)):
    db_phieu = db.query(PhieuDieuChuyen).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not db_phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh")
    if db_phieu.trang_thai not in ("cho_xuat",):
        raise HTTPException(status_code=400, detail="Chỉ sửa được lệnh ở trạng thái chờ xuất")

    db_phieu.ngay_dc = phieu.ngay_dc
    db_phieu.so_lenh_dieu_dong = phieu.so_lenh_dieu_dong
    db_phieu.kho_xuat_id = phieu.kho_xuat_id
    db_phieu.kho_nhan_id = phieu.kho_nhan_id
    db_phieu.bien_so_xe = phieu.bien_so_xe
    db_phieu.nguoi_giao = phieu.nguoi_giao
    db_phieu.nguoi_nhan = phieu.nguoi_nhan
    db_phieu.ghi_chu = phieu.ghi_chu

    db.query(CtDieuChuyen).filter(CtDieuChuyen.phieu_id == phieu_id).delete()
    for ct in phieu.chi_tiet:
        so_luong_kg = ct.so_luong_gui_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong_gui > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong_gui / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong_gui * vt.ty_le_quy_doi
        db_ct = CtDieuChuyen(
            phieu_id=db_phieu.id, vat_tu_id=ct.vat_tu_id,
            so_luong_gui=ct.so_luong_gui, so_luong_gui_kg=so_luong_kg,
            da_xuat_sl=0, da_xuat_kg=0
        )
        db.add(db_ct)

    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.delete("/{phieu_id}")
def delete(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuDieuChuyen).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh")
    if phieu.trang_thai not in ("cho_xuat",):
        raise HTTPException(status_code=400, detail="Chỉ xóa được lệnh ở trạng thái chờ xuất")
    db.query(CtDieuChuyen).filter(CtDieuChuyen.phieu_id == phieu.id).delete()
    db.delete(phieu)
    db.commit()
    return {"status": "success", "message": "Xóa lệnh thành công"}

@router.post("/{phieu_id}/tao-phieu-xuat")
def tao_phieu_xuat(phieu_id: int, req: schemas.TaoPhieuXuatTuLenhDC, db: Session = Depends(get_db)):
    """Tạo phiếu xuất từng phần từ lệnh điều chuyển"""
    lenh = db.query(PhieuDieuChuyen).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not lenh:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh")
    if lenh.trang_thai in ("hoan_thanh", "huy"):
        raise HTTPException(status_code=400, detail="Lệnh đã hoàn thành hoặc đã hủy")

    so_phieu = generate_so_phieu(db, "PXK")
    phieu_xuat = PhieuXuat(
        so_phieu=so_phieu,
        loai_xuat="dieu_chuyen",
        ngay_xuat=req.ngay_xuat,
        kho_xuat_id=lenh.kho_xuat_id,
        kho_nhan_id=lenh.kho_nhan_id,
        so_lenh_dieu_dong=lenh.so_lenh_dieu_dong,
        bien_so_xe=req.bien_so_xe or lenh.bien_so_xe,
        nguoi_giao=req.nguoi_giao or lenh.nguoi_giao,
        nguoi_nhan=req.nguoi_nhan or lenh.nguoi_nhan,
        lenh_dc_id=lenh.id,
        ghi_chu=req.ghi_chu or f"Xuất theo lệnh ĐC {lenh.so_phieu}",
        trang_thai="nhap"
    )
    db.add(phieu_xuat)
    db.flush()

    for ct in req.chi_tiet:
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi
        ct_xuat = CtPhieuXuat(
            phieu_id=phieu_xuat.id, vat_tu_id=ct.vat_tu_id,
            vi_tri_id=ct.vi_tri_id, so_luong=ct.so_luong,
            so_luong_kg=so_luong_kg, sl_theo_lenh=ct.sl_theo_lenh,
            ghi_chu=ct.ghi_chu
        )
        db.add(ct_xuat)

    # Cập nhật trạng thái lệnh
    if lenh.trang_thai == "cho_xuat":
        lenh.trang_thai = "dang_xuat"

    db.commit()
    return {"status": "success", "message": f"Tạo phiếu xuất {so_phieu} thành công", "phieu_xuat_id": phieu_xuat.id}

@router.get("/{phieu_id}/tinh-hinh")
def tinh_hinh(phieu_id: int, db: Session = Depends(get_db)):
    """Báo cáo tình hình điều chuyển"""
    lenh = db.query(PhieuDieuChuyen).options(
        joinedload(PhieuDieuChuyen.chi_tiet).joinedload(CtDieuChuyen.vat_tu),
        joinedload(PhieuDieuChuyen.kho_xuat),
        joinedload(PhieuDieuChuyen.kho_nhan)
    ).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not lenh:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh")

    # Phiếu xuất liên quan
    phieu_xuats = db.query(PhieuXuat).filter(PhieuXuat.lenh_dc_id == lenh.id).all()
    # Phiếu nhập liên quan
    phieu_nhaps = db.query(PhieuNhap).filter(PhieuNhap.phieu_dc_id == lenh.id).all()

    chi_tiet = []
    for ct in lenh.chi_tiet:
        chi_tiet.append({
            "vat_tu_id": ct.vat_tu_id,
            "ma_hang": ct.vat_tu.ma_hang if ct.vat_tu else "",
            "ten_hang": ct.vat_tu.ten_hang if ct.vat_tu else "",
            "sl_theo_lenh": ct.so_luong_gui,
            "kg_theo_lenh": ct.so_luong_gui_kg,
            "sl_da_xuat": ct.da_xuat_sl or 0,
            "kg_da_xuat": ct.da_xuat_kg or 0,
            "sl_da_nhan": ct.so_luong_nhan or 0,
            "kg_da_nhan": ct.so_luong_nhan_kg or 0,
            "sl_con_lai": ct.so_luong_gui - (ct.da_xuat_sl or 0),
            "trang_thai": "Đã nhận đủ" if (ct.so_luong_nhan or 0) >= ct.so_luong_gui else (
                "Đã xuất, chờ nhận" if (ct.da_xuat_sl or 0) >= ct.so_luong_gui else (
                    "Đang xuất" if (ct.da_xuat_sl or 0) > 0 else "Chờ xuất"
                )
            )
        })

    return {
        "lenh": {"so_phieu": lenh.so_phieu, "trang_thai": lenh.trang_thai,
                 "kho_xuat": lenh.kho_xuat.ten_kho if lenh.kho_xuat else "",
                 "kho_nhan": lenh.kho_nhan.ten_kho if lenh.kho_nhan else ""},
        "so_phieu_xuat": len(phieu_xuats),
        "ds_phieu_xuat": [{"so_phieu": p.so_phieu, "ngay_xuat": str(p.ngay_xuat), "trang_thai": p.trang_thai} for p in phieu_xuats],
        "so_phieu_nhap": len(phieu_nhaps),
        "ds_phieu_nhap": [{"so_phieu": p.so_phieu, "ngay_nhap": str(p.ngay_nhap), "trang_thai": p.trang_thai} for p in phieu_nhaps],
        "chi_tiet": chi_tiet
    }

@router.post("/{phieu_id}/hoan-thanh")
def hoan_thanh(phieu_id: int, db: Session = Depends(get_db)):
    lenh = db.query(PhieuDieuChuyen).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not lenh:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh")
    if lenh.trang_thai == "hoan_thanh":
        raise HTTPException(status_code=400, detail="Lệnh đã hoàn thành")
    lenh.trang_thai = "hoan_thanh"
    db.commit()
    return {"status": "success", "message": "Lệnh điều chuyển đã hoàn thành"}

@router.get("/{phieu_id}/export-excel")
def export_excel(phieu_id: int, db: Session = Depends(get_db)):
    """Xuất Excel biên bản giao nhận"""
    lenh = db.query(PhieuDieuChuyen).options(
        joinedload(PhieuDieuChuyen.chi_tiet).joinedload(CtDieuChuyen.vat_tu).joinedload(VatTu.dvt),
        joinedload(PhieuDieuChuyen.kho_xuat),
        joinedload(PhieuDieuChuyen.kho_nhan)
    ).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not lenh:
        raise HTTPException(status_code=404, detail="Không tìm thấy lệnh")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bien_Ban_Giao_Nhan"

    ws.append(["BIÊN BẢN GIAO NHẬN VẬT TƯ"])
    ws.append([f"Lệnh điều chuyển: {lenh.so_phieu}"])
    ws.append([f"Ngày: {lenh.ngay_dc}"])
    ws.append([f"Nơi xuất: {lenh.kho_xuat.ten_kho if lenh.kho_xuat else ''}"])
    ws.append([f"Nơi nhận: {lenh.kho_nhan.ten_kho if lenh.kho_nhan else ''}"])
    ws.append([])

    headers = ["STT", "Mã hàng", "Tên vật tư", "ĐVT", "SL theo lệnh", "KL theo lệnh (Kg)", "SL thực giao", "KL thực giao (Kg)", "SL thực nhận", "Ghi chú"]
    ws.append(headers)

    for i, ct in enumerate(lenh.chi_tiet, 1):
        ws.append([
            i,
            ct.vat_tu.ma_hang if ct.vat_tu else "",
            ct.vat_tu.ten_hang if ct.vat_tu else "",
            ct.vat_tu.dvt.ten if ct.vat_tu and ct.vat_tu.dvt else "Kg",
            ct.so_luong_gui,
            ct.so_luong_gui_kg,
            "", "", "", ""
        ])

    ws.append([])
    ws.append(["Người giao", "", "", "", "", "Người nhận"])
    ws.append([lenh.nguoi_giao or "", "", "", "", "", lenh.nguoi_nhan or ""])

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
        headers={"Content-Disposition": f"attachment; filename=Bien_Ban_{lenh.so_phieu}.xlsx"}
    )

# --- Legacy endpoint: xác nhận nhận cho phiếu ĐC cũ ---
class CtDieuChuyenNhanRequest(BaseModel):
    id: int
    so_luong_nhan: float
    so_luong_nhan_kg: Optional[float] = None
    vi_tri_nhan_id: Optional[int] = None
    ly_do_chenh_lech: Optional[str] = None

class XacNhanNhanRequest(BaseModel):
    chi_tiet: list[CtDieuChuyenNhanRequest]

@router.post("/{phieu_id}/xac-nhan-nhan")
def xac_nhan_nhan(phieu_id: int, req: XacNhanNhanRequest, db: Session = Depends(get_db)):
    """Legacy: Xác nhận nhận hàng trực tiếp trên phiếu ĐC (cho dữ liệu cũ)"""
    phieu = db.query(PhieuDieuChuyen).filter(PhieuDieuChuyen.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai in ("da_nhan", "hoan_thanh"):
        raise HTTPException(status_code=400, detail="Phiếu đã được nhận/hoàn thành")

    co_chenh_lech = False
    req_dict = {item.id: item for item in req.chi_tiet}
    db_chi_tiet = db.query(CtDieuChuyen).filter(CtDieuChuyen.phieu_id == phieu.id).all()

    so_phieu_nhap = generate_so_phieu(db, "PNK")
    phieu_nhap = PhieuNhap(
        so_phieu=so_phieu_nhap, loai_nhap="nhan_dieu_chuyen",
        ngay_nhap=datetime.now().date(), kho_id=phieu.kho_nhan_id,
        phieu_dc_id=phieu.id,
        ghi_chu=f"Nhận điều chuyển tự động từ lệnh {phieu.so_phieu}",
        trang_thai="xac_nhan"
    )
    db.add(phieu_nhap)
    db.flush()

    for db_ct in db_chi_tiet:
        req_ct = req_dict.get(db_ct.id)
        if not req_ct:
            raise HTTPException(status_code=400, detail=f"Thiếu thông tin nhận chi tiết {db_ct.id}")

        db_ct.so_luong_nhan = req_ct.so_luong_nhan
        db_ct.so_luong_nhan_kg = req_ct.so_luong_nhan_kg
        db_ct.vi_tri_nhan_id = req_ct.vi_tri_nhan_id
        db_ct.ly_do_chenh_lech = req_ct.ly_do_chenh_lech

        if db_ct.so_luong_nhan != db_ct.so_luong_gui:
            co_chenh_lech = True

        ct_nhap = CtPhieuNhap(
            phieu_id=phieu_nhap.id, vat_tu_id=db_ct.vat_tu_id,
            vi_tri_id=db_ct.vi_tri_nhan_id,
            so_luong=db_ct.so_luong_nhan, so_luong_kg=db_ct.so_luong_nhan_kg
        )
        db.add(ct_nhap)

        ton = _find_or_create_ton_kho(db, db_ct.vat_tu_id, phieu.kho_nhan_id, db_ct.vi_tri_nhan_id)
        ton.so_luong = (ton.so_luong or 0) + (db_ct.so_luong_nhan or 0)
        ton.so_luong_kg = (ton.so_luong_kg or 0) + (db_ct.so_luong_nhan_kg or 0)

    phieu.trang_thai = "chenh_lech" if co_chenh_lech else "da_nhan"
    db.commit()
    return {"status": "success", "message": "Xác nhận nhận hàng thành công"}
