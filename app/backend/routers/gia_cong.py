from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime

from database import get_db
from models.transaction import PhieuGiaCong, CtPhieuGiaCong, PhieuNhap, CtPhieuNhap
from models.inventory import TonKho
from models.material import VatTu
from schemas import transaction as schemas
from routers.nhap_kho import generate_so_phieu, _find_or_create_ton_kho

router = APIRouter()

from pydantic import BaseModel

class PhieuGiaCongListResponse(BaseModel):
    total: int
    items: List[schemas.PhieuGiaCong]
    skip: int
    limit: int

@router.get("/", response_model=PhieuGiaCongListResponse)
def get_list(
    skip: int = 0, limit: int = 50,
    trang_thai: Optional[str] = None,
    kho_nhan_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PhieuGiaCong).options(joinedload(PhieuGiaCong.kho_nhan))
    if trang_thai:
        query = query.filter(PhieuGiaCong.trang_thai == trang_thai)
    if kho_nhan_id:
        query = query.filter(PhieuGiaCong.kho_nhan_id == kho_nhan_id)
    query = query.order_by(PhieuGiaCong.created_at.desc())
    total = query.count()
    return {"total": total, "items": query.offset(skip).limit(limit).all(), "skip": skip, "limit": limit}

@router.get("/{phieu_id}", response_model=schemas.PhieuGiaCong)
def get_detail(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuGiaCong).options(
        joinedload(PhieuGiaCong.kho_nhan),
        joinedload(PhieuGiaCong.chi_tiet).joinedload(CtPhieuGiaCong.vat_tu).joinedload(VatTu.dvt)
    ).filter(PhieuGiaCong.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu gia công")
    return phieu

@router.post("/", response_model=schemas.PhieuGiaCong)
def create(phieu: schemas.PhieuGiaCongCreate, db: Session = Depends(get_db)):
    so_phieu = generate_so_phieu(db, "PGC")
    db_phieu = PhieuGiaCong(
        so_phieu=so_phieu,
        ngay_tao=phieu.ngay_tao,
        nha_cung_cap=phieu.nha_cung_cap,
        so_hop_dong=phieu.so_hop_dong,
        kho_nhan_id=phieu.kho_nhan_id,
        ghi_chu=phieu.ghi_chu,
        trang_thai="cho_giao"
    )
    db.add(db_phieu)
    db.flush()

    for ct in phieu.chi_tiet:
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi

        db_ct = CtPhieuGiaCong(
            phieu_id=db_phieu.id,
            vat_tu_id=ct.vat_tu_id,
            so_luong=ct.so_luong,
            so_luong_kg=so_luong_kg,
            da_nhan_sl=0,
            da_nhan_kg=0,
            ghi_chu=ct.ghi_chu
        )
        db.add(db_ct)

    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.put("/{phieu_id}", response_model=schemas.PhieuGiaCong)
def update(phieu_id: int, phieu: schemas.PhieuGiaCongCreate, db: Session = Depends(get_db)):
    db_phieu = db.query(PhieuGiaCong).filter(PhieuGiaCong.id == phieu_id).first()
    if not db_phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if db_phieu.trang_thai not in ("cho_giao",):
        raise HTTPException(status_code=400, detail="Chỉ sửa được phiếu ở trạng thái chờ giao")

    db_phieu.ngay_tao = phieu.ngay_tao
    db_phieu.nha_cung_cap = phieu.nha_cung_cap
    db_phieu.so_hop_dong = phieu.so_hop_dong
    db_phieu.kho_nhan_id = phieu.kho_nhan_id
    db_phieu.ghi_chu = phieu.ghi_chu

    db.query(CtPhieuGiaCong).filter(CtPhieuGiaCong.phieu_id == phieu_id).delete()
    for ct in phieu.chi_tiet:
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi
        db_ct = CtPhieuGiaCong(
            phieu_id=db_phieu.id, vat_tu_id=ct.vat_tu_id,
            so_luong=ct.so_luong, so_luong_kg=so_luong_kg,
            da_nhan_sl=0, da_nhan_kg=0, ghi_chu=ct.ghi_chu
        )
        db.add(db_ct)

    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.delete("/{phieu_id}")
def delete(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuGiaCong).filter(PhieuGiaCong.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai not in ("cho_giao",):
        raise HTTPException(status_code=400, detail="Chỉ xóa được phiếu ở trạng thái chờ giao")
    db.query(CtPhieuGiaCong).filter(CtPhieuGiaCong.phieu_id == phieu.id).delete()
    db.delete(phieu)
    db.commit()
    return {"status": "success", "message": "Xóa phiếu thành công"}

@router.post("/{phieu_id}/tao-phieu-nhap")
def tao_phieu_nhap(phieu_id: int, req: schemas.TaoPhieuNhapTuGC, db: Session = Depends(get_db)):
    """Tạo phiếu nhập từng phần từ phiếu gia công"""
    phieu = db.query(PhieuGiaCong).filter(PhieuGiaCong.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai in ("hoan_thanh", "huy"):
        raise HTTPException(status_code=400, detail="Phiếu đã hoàn thành hoặc đã hủy")

    # Tạo phiếu nhập
    so_phieu = generate_so_phieu(db, "PNK")
    phieu_nhap = PhieuNhap(
        so_phieu=so_phieu,
        loai_nhap="gc_moi",
        ngay_nhap=req.ngay_nhap,
        kho_id=phieu.kho_nhan_id,
        don_vi_giao=req.don_vi_giao or phieu.nha_cung_cap,
        bien_so_xe=req.bien_so_xe,
        tai_xe=req.tai_xe,
        so_hop_dong=phieu.so_hop_dong,
        phieu_gc_id=phieu.id,
        ghi_chu=req.ghi_chu or f"Nhận hàng từ phiếu GC {phieu.so_phieu}",
        trang_thai="nhap"
    )
    db.add(phieu_nhap)
    db.flush()

    for ct in req.chi_tiet:
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi
        ct_nhap = CtPhieuNhap(
            phieu_id=phieu_nhap.id, vat_tu_id=ct.vat_tu_id,
            vi_tri_id=ct.vi_tri_id, so_luong=ct.so_luong,
            so_luong_kg=so_luong_kg, ghi_chu=ct.ghi_chu
        )
        db.add(ct_nhap)

    # Cập nhật trạng thái phiếu GC
    if phieu.trang_thai == "cho_giao":
        phieu.trang_thai = "dang_giao"

    db.commit()
    return {"status": "success", "message": f"Tạo phiếu nhập {so_phieu} thành công", "phieu_nhap_id": phieu_nhap.id}

@router.get("/{phieu_id}/tinh-hinh")
def tinh_hinh(phieu_id: int, db: Session = Depends(get_db)):
    """Báo cáo tình hình giao nhận"""
    phieu = db.query(PhieuGiaCong).options(
        joinedload(PhieuGiaCong.chi_tiet).joinedload(CtPhieuGiaCong.vat_tu)
    ).filter(PhieuGiaCong.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")

    # Lấy danh sách phiếu nhập liên quan
    phieu_nhaps = db.query(PhieuNhap).filter(PhieuNhap.phieu_gc_id == phieu.id).all()

    result = []
    for ct in phieu.chi_tiet:
        result.append({
            "vat_tu_id": ct.vat_tu_id,
            "ma_hang": ct.vat_tu.ma_hang if ct.vat_tu else "",
            "ten_hang": ct.vat_tu.ten_hang if ct.vat_tu else "",
            "sl_dat": ct.so_luong,
            "kg_dat": ct.so_luong_kg,
            "sl_da_nhan": ct.da_nhan_sl or 0,
            "kg_da_nhan": ct.da_nhan_kg or 0,
            "sl_con_lai": ct.so_luong - (ct.da_nhan_sl or 0),
            "trang_thai": "Đã nhận đủ" if (ct.da_nhan_sl or 0) >= ct.so_luong else (
                "Đang giao" if (ct.da_nhan_sl or 0) > 0 else "Chưa giao"
            )
        })

    return {
        "phieu": {"so_phieu": phieu.so_phieu, "trang_thai": phieu.trang_thai},
        "so_phieu_nhap": len(phieu_nhaps),
        "ds_phieu_nhap": [{"so_phieu": p.so_phieu, "ngay_nhap": str(p.ngay_nhap), "trang_thai": p.trang_thai} for p in phieu_nhaps],
        "chi_tiet": result
    }

@router.post("/{phieu_id}/hoan-thanh")
def hoan_thanh(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuGiaCong).filter(PhieuGiaCong.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "hoan_thanh":
        raise HTTPException(status_code=400, detail="Phiếu đã hoàn thành")
    phieu.trang_thai = "hoan_thanh"
    db.commit()
    return {"status": "success", "message": "Đã đánh dấu phiếu gia công hoàn thành"}
