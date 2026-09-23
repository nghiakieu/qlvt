from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List

from database import get_db
from models.transaction import PhieuKiemKe, CtKiemKe
from models.inventory import TonKho
from models.material import VatTu
from schemas import transaction as schemas
from routers.nhap_kho import generate_so_phieu

router = APIRouter()

from pydantic import BaseModel

class PhieuKiemKeListResponse(BaseModel):
    total: int
    items: List[schemas.PhieuKiemKe]
    skip: int
    limit: int

@router.get("/", response_model=PhieuKiemKeListResponse)
def get_kiem_ke(
    skip: int = 0, limit: int = 50,
    kho_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(PhieuKiemKe).options(joinedload(PhieuKiemKe.kho))
    if kho_id:
        query = query.filter(PhieuKiemKe.kho_id == kho_id)
        
    query = query.order_by(PhieuKiemKe.created_at.desc())
    return {"total": query.count(), "items": query.offset(skip).limit(limit).all(), "skip": skip, "limit": limit}

@router.get("/{phieu_id}", response_model=schemas.PhieuKiemKe)
def get_kiem_ke_detail(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuKiemKe).options(
        joinedload(PhieuKiemKe.kho),
        joinedload(PhieuKiemKe.chi_tiet).joinedload(CtKiemKe.vat_tu).joinedload(VatTu.dvt),
        joinedload(PhieuKiemKe.chi_tiet).joinedload(CtKiemKe.vi_tri)
    ).filter(PhieuKiemKe.id == phieu_id).first()
    
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    return phieu

@router.post("/", response_model=schemas.PhieuKiemKe)
def create_kiem_ke(phieu: schemas.PhieuKiemKeCreate, db: Session = Depends(get_db)):
    so_phieu = generate_so_phieu(db, "KK")
    db_phieu = PhieuKiemKe(
        so_phieu=so_phieu,
        ngay_kiem_ke=phieu.ngay_kiem_ke,
        kho_id=phieu.kho_id,
        muc_dich=phieu.muc_dich,
        ghi_chu=phieu.ghi_chu,
        trang_thai="dang_kiem_ke"
    )
    db.add(db_phieu)
    db.flush()
    
    for ct in phieu.chi_tiet:
        # Lấy tồn kho hiện tại để đối chiếu
        ton = db.query(TonKho).filter(
            TonKho.vat_tu_id == ct.vat_tu_id,
            TonKho.kho_id == phieu.kho_id,
            TonKho.vi_tri_id == ct.vi_tri_id
        ).first()
        
        sl_so_sach = ton.so_luong if ton else 0
        sl_so_sach_kg = ton.so_luong_kg if ton else 0
        
        db_ct = CtKiemKe(
            phieu_id=db_phieu.id,
            vat_tu_id=ct.vat_tu_id,
            vi_tri_id=ct.vi_tri_id,
            sl_so_sach=sl_so_sach,
            sl_so_sach_kg=sl_so_sach_kg,
            sl_thuc_te=ct.sl_thuc_te,
            sl_thuc_te_kg=ct.sl_thuc_te_kg,
            ly_do=ct.ly_do
        )
        db.add(db_ct)
        
    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.post("/{phieu_id}/duyet")
def duyet_kiem_ke(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuKiemKe).filter(PhieuKiemKe.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "hoan_thanh":
        raise HTTPException(status_code=400, detail="Phiếu đã được duyệt")
        
    # Cập nhật tồn kho theo số lượng thực tế
    chi_tiet = db.query(CtKiemKe).filter(CtKiemKe.phieu_id == phieu.id).all()
    for ct in chi_tiet:
        ton = db.query(TonKho).filter(
            TonKho.vat_tu_id == ct.vat_tu_id,
            TonKho.kho_id == phieu.kho_id,
            TonKho.vi_tri_id == ct.vi_tri_id
        ).first()
        
        if ton:
            ton.so_luong = ct.sl_thuc_te
            ton.so_luong_kg = ct.sl_thuc_te_kg or 0
        else:
            if ct.sl_thuc_te > 0:
                new_ton = TonKho(
                    vat_tu_id=ct.vat_tu_id,
                    kho_id=phieu.kho_id,
                    vi_tri_id=ct.vi_tri_id,
                    so_luong=ct.sl_thuc_te,
                    so_luong_kg=ct.sl_thuc_te_kg or 0
                )
                db.add(new_ton)
            
    phieu.trang_thai = "hoan_thanh"
    db.commit()
    return {"status": "success", "message": "Duyệt kiểm kê thành công, đã cập nhật tồn kho"}

@router.delete("/{phieu_id}")
def delete_kiem_ke(phieu_id: int, db: Session = Depends(get_db)):
    from models.transaction import PhieuKiemKe, CtKiemKe
    phieu = db.query(PhieuKiemKe).filter(PhieuKiemKe.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "hoan_thanh":
        raise HTTPException(status_code=400, detail="Không thể xóa phiếu đã duyệt")
    
    db.query(CtKiemKe).filter(CtKiemKe.phieu_id == phieu.id).delete()
    db.delete(phieu)
    db.commit()
    return {"status": "success", "message": "Xóa phiếu thành công"}
