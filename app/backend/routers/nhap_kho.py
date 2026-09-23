from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime

from database import get_db
from models.transaction import PhieuNhap, CtPhieuNhap, CounterPhieu, CtPhieuGiaCong, CtDieuChuyen
from models.inventory import TonKho
from models.material import VatTu
from schemas import transaction as schemas

router = APIRouter()

def generate_so_phieu(db: Session, loai: str) -> str:
    """Tạo số phiếu tự động. Dùng flush() thay commit() để giữ cùng transaction."""
    nam = datetime.now().year
    counter = db.query(CounterPhieu).filter(
        CounterPhieu.loai == loai, CounterPhieu.nam == nam
    ).with_for_update().first()
    if not counter:
        counter = CounterPhieu(loai=loai, nam=nam, so_thu_tu=0)
        db.add(counter)
        db.flush()
    
    counter.so_thu_tu += 1
    db.flush()  # flush — không commit riêng, để cùng transaction với phiếu chính
    return f"{loai}-{nam}-{counter.so_thu_tu:03d}"

def _find_or_create_ton_kho(db: Session, vat_tu_id: int, kho_id: int, vi_tri_id) -> TonKho:
    """Tìm hoặc tạo bản ghi tồn kho. Xử lý vi_tri_id=None an toàn."""
    filters = [TonKho.vat_tu_id == vat_tu_id, TonKho.kho_id == kho_id]
    if vi_tri_id is not None:
        filters.append(TonKho.vi_tri_id == vi_tri_id)
    else:
        filters.append(TonKho.vi_tri_id.is_(None))
    
    ton = db.query(TonKho).filter(*filters).first()
    if not ton:
        ton = TonKho(
            vat_tu_id=vat_tu_id,
            kho_id=kho_id,
            vi_tri_id=vi_tri_id,
            so_luong=0.0,
            so_luong_kg=0.0
        )
        db.add(ton)
        db.flush()
    return ton

from pydantic import BaseModel

class PhieuNhapListResponse(BaseModel):
    total: int
    items: List[schemas.PhieuNhap]
    skip: int
    limit: int

@router.get("/", response_model=PhieuNhapListResponse)
def get_phieu_nhap(
    skip: int = 0, 
    limit: int = 50,
    loai_nhap: Optional[str] = None,
    kho_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    base_query = db.query(PhieuNhap)
    
    if loai_nhap:
        base_query = base_query.filter(PhieuNhap.loai_nhap == loai_nhap)
    if kho_id is not None:
        base_query = base_query.filter(PhieuNhap.kho_id == kho_id)
        
    total = base_query.count()
    
    items_query = base_query.options(joinedload(PhieuNhap.kho))
    items_query = items_query.order_by(PhieuNhap.created_at.desc())
    items = items_query.offset(skip).limit(limit).all()
    
    return {"total": total, "items": items, "skip": skip, "limit": limit}

@router.get("/{phieu_id}", response_model=schemas.PhieuNhap)
def get_phieu_nhap_detail(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuNhap).options(
        joinedload(PhieuNhap.kho),
        joinedload(PhieuNhap.chi_tiet).joinedload(CtPhieuNhap.vat_tu).joinedload(VatTu.dvt),
        joinedload(PhieuNhap.chi_tiet).joinedload(CtPhieuNhap.vi_tri)
    ).filter(PhieuNhap.id == phieu_id).first()
    
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu nhập")
    return phieu

@router.post("/", response_model=schemas.PhieuNhap)
def create_phieu_nhap(phieu: schemas.PhieuNhapCreate, db: Session = Depends(get_db)):
    so_phieu = generate_so_phieu(db, "PNK")
    db_phieu = PhieuNhap(
        so_phieu=so_phieu,
        loai_nhap=phieu.loai_nhap,
        ngay_nhap=phieu.ngay_nhap,
        kho_id=phieu.kho_id,
        don_vi_giao=phieu.don_vi_giao,
        bien_so_xe=phieu.bien_so_xe,
        tai_xe=phieu.tai_xe,
        so_hop_dong=phieu.so_hop_dong,
        ghi_chu=phieu.ghi_chu,
        trang_thai="nhap"
    )
    db.add(db_phieu)
    db.flush()
    
    for ct in phieu.chi_tiet:
        # Auto-calculate kg nếu FE chưa gửi
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi

        db_ct = CtPhieuNhap(
            phieu_id=db_phieu.id,
            vat_tu_id=ct.vat_tu_id,
            vi_tri_id=ct.vi_tri_id,
            so_luong=ct.so_luong,
            so_luong_kg=so_luong_kg,
            ghi_chu=ct.ghi_chu
        )
        db.add(db_ct)
        
    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.put("/{phieu_id}", response_model=schemas.PhieuNhap)
def update_nhap_kho(phieu_id: int, phieu: schemas.PhieuNhapCreate, db: Session = Depends(get_db)):
    db_phieu = db.query(PhieuNhap).filter(PhieuNhap.id == phieu_id).first()
    if not db_phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if db_phieu.trang_thai != "nhap":
        raise HTTPException(status_code=400, detail="Chỉ có thể sửa phiếu ở trạng thái nháp")
        
    db_phieu.loai_nhap = phieu.loai_nhap
    db_phieu.ngay_nhap = phieu.ngay_nhap
    db_phieu.kho_id = phieu.kho_id
    db_phieu.don_vi_giao = phieu.don_vi_giao
    db_phieu.bien_so_xe = phieu.bien_so_xe
    db_phieu.tai_xe = phieu.tai_xe
    db_phieu.so_hop_dong = phieu.so_hop_dong
    db_phieu.ghi_chu = phieu.ghi_chu
    
    # Delete old details
    db.query(CtPhieuNhap).filter(CtPhieuNhap.phieu_id == phieu_id).delete()
    
    # Add new details
    for ct in phieu.chi_tiet:
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi

        db_ct = CtPhieuNhap(
            phieu_id=db_phieu.id,
            vat_tu_id=ct.vat_tu_id,
            vi_tri_id=ct.vi_tri_id,
            so_luong=ct.so_luong,
            so_luong_kg=so_luong_kg,
            ghi_chu=ct.ghi_chu
        )
        db.add(db_ct)
        
    db.commit()
    db.refresh(db_phieu)
    return db_phieu

@router.post("/{phieu_id}/xac-nhan")
def xac_nhan_phieu_nhap(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuNhap).filter(PhieuNhap.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "xac_nhan":
        raise HTTPException(status_code=400, detail="Phiếu đã được xác nhận")
        
    chi_tiet = db.query(CtPhieuNhap).filter(CtPhieuNhap.phieu_id == phieu.id).all()
    for ct in chi_tiet:
        ton = _find_or_create_ton_kho(db, ct.vat_tu_id, phieu.kho_id, ct.vi_tri_id)
        ton.so_luong = (ton.so_luong or 0) + (ct.so_luong or 0)
        ton.so_luong_kg = (ton.so_luong_kg or 0) + (ct.so_luong_kg or 0)

        # Cập nhật da_nhan trên phiếu Gia công gốc (nếu có)
        if phieu.phieu_gc_id:
            ct_gc = db.query(CtPhieuGiaCong).filter(
                CtPhieuGiaCong.phieu_id == phieu.phieu_gc_id,
                CtPhieuGiaCong.vat_tu_id == ct.vat_tu_id
            ).first()
            if ct_gc:
                ct_gc.da_nhan_sl = (ct_gc.da_nhan_sl or 0) + (ct.so_luong or 0)
                ct_gc.da_nhan_kg = (ct_gc.da_nhan_kg or 0) + (ct.so_luong_kg or 0)

        # Cập nhật so_luong_nhan trên Lệnh ĐC gốc (nếu có)
        if phieu.phieu_dc_id:
            ct_dc = db.query(CtDieuChuyen).filter(
                CtDieuChuyen.phieu_id == phieu.phieu_dc_id,
                CtDieuChuyen.vat_tu_id == ct.vat_tu_id
            ).first()
            if ct_dc:
                ct_dc.so_luong_nhan = (ct_dc.so_luong_nhan or 0) + (ct.so_luong or 0)
                ct_dc.so_luong_nhan_kg = (ct_dc.so_luong_nhan_kg or 0) + (ct.so_luong_kg or 0)
            
    phieu.trang_thai = "xac_nhan"
    db.commit()
    return {"status": "success", "message": "Xác nhận phiếu thành công và đã cập nhật tồn kho"}


@router.delete("/{phieu_id}")
def delete_phieu_nhap(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuNhap).filter(PhieuNhap.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "xac_nhan":
        raise HTTPException(status_code=400, detail="Không thể xóa phiếu đã xác nhận")
    
    db.query(CtPhieuNhap).filter(CtPhieuNhap.phieu_id == phieu.id).delete()
    db.delete(phieu)
    db.commit()
    return {"status": "success", "message": "Xóa phiếu thành công"}
