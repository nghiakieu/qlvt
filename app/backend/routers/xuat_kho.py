from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List

from database import get_db
from models.transaction import PhieuXuat, CtPhieuXuat, PhieuDieuChuyen, CtDieuChuyen, PhieuNhap, CtPhieuNhap
from models.inventory import TonKho
from models.material import VatTu
from schemas import transaction as schemas
from routers.nhap_kho import generate_so_phieu

router = APIRouter()

from pydantic import BaseModel

class PhieuXuatListResponse(BaseModel):
    total: int
    items: List[schemas.PhieuXuat]
    skip: int
    limit: int

@router.get("/", response_model=PhieuXuatListResponse)
def get_phieu_xuat(
    skip: int = 0, limit: int = 50,
    loai_xuat: Optional[str] = None,
    kho_xuat_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    base_query = db.query(PhieuXuat)
    
    if loai_xuat:
        base_query = base_query.filter(PhieuXuat.loai_xuat == loai_xuat)
    if kho_xuat_id is not None:
        base_query = base_query.filter(PhieuXuat.kho_xuat_id == kho_xuat_id)
        
    total = base_query.count()
    items_query = base_query.options(
        joinedload(PhieuXuat.kho_xuat),
        joinedload(PhieuXuat.kho_nhan)
    )
    items_query = items_query.order_by(PhieuXuat.created_at.desc())
    return {"total": total, "items": items_query.offset(skip).limit(limit).all(), 'skip': skip, 'limit': limit}

@router.get("/{phieu_id}", response_model=schemas.PhieuXuat)
def get_phieu_xuat_detail(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuXuat).options(
        joinedload(PhieuXuat.kho_xuat), joinedload(PhieuXuat.kho_nhan),
        joinedload(PhieuXuat.chi_tiet).joinedload(CtPhieuXuat.vat_tu).joinedload(VatTu.dvt),
        joinedload(PhieuXuat.chi_tiet).joinedload(CtPhieuXuat.vi_tri)
    ).filter(PhieuXuat.id == phieu_id).first()
    
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    return phieu

@router.post("/", response_model=schemas.PhieuXuat)
def create_phieu_xuat(phieu: schemas.PhieuXuatCreate, db: Session = Depends(get_db)):
    so_phieu = generate_so_phieu(db, "PXK")
    db_phieu = PhieuXuat(
        so_phieu=so_phieu,
        loai_xuat=phieu.loai_xuat,
        ngay_xuat=phieu.ngay_xuat,
        kho_xuat_id=phieu.kho_xuat_id,
        kho_nhan_id=phieu.kho_nhan_id,
        so_lenh_dieu_dong=phieu.so_lenh_dieu_dong,
        bien_so_xe=phieu.bien_so_xe,
        nguoi_giao=phieu.nguoi_giao,
        nguoi_nhan=phieu.nguoi_nhan,
        doi_tac_mua=phieu.doi_tac_mua,
        ghi_chu=phieu.ghi_chu,
        trang_thai="nhap"
    )
    db.add(db_phieu)
    db.flush()
    
    for ct in phieu.chi_tiet:
        filters = [TonKho.vat_tu_id == ct.vat_tu_id, TonKho.kho_id == phieu.kho_xuat_id]
        if ct.vi_tri_id is not None:
            filters.append(TonKho.vi_tri_id == ct.vi_tri_id)
        else:
            filters.append(TonKho.vi_tri_id.is_(None))
            
        ton = db.query(TonKho).filter(*filters).first()
        if not ton or ton.so_luong < ct.so_luong:
            raise HTTPException(status_code=400, detail=f"Vật tư {ct.vat_tu_id} không đủ tồn trong kho!")

        # Auto-calculate kg nếu FE chưa gửi
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi

        db_ct = CtPhieuXuat(
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

@router.put("/{phieu_id}", response_model=schemas.PhieuXuat)
def update_xuat_kho(phieu_id: int, phieu: schemas.PhieuXuatCreate, db: Session = Depends(get_db)):
    db_phieu = db.query(PhieuXuat).filter(PhieuXuat.id == phieu_id).first()
    if not db_phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if db_phieu.trang_thai != "nhap":
        raise HTTPException(status_code=400, detail="Chỉ có thể sửa phiếu ở trạng thái nháp")
        
    db_phieu.loai_xuat = phieu.loai_xuat
    db_phieu.ngay_xuat = phieu.ngay_xuat
    db_phieu.kho_xuat_id = phieu.kho_xuat_id
    db_phieu.kho_nhan_id = phieu.kho_nhan_id
    db_phieu.so_lenh_dieu_dong = phieu.so_lenh_dieu_dong
    db_phieu.bien_so_xe = phieu.bien_so_xe
    db_phieu.nguoi_giao = phieu.nguoi_giao
    db_phieu.nguoi_nhan = phieu.nguoi_nhan
    db_phieu.doi_tac_mua = phieu.doi_tac_mua
    db_phieu.ghi_chu = phieu.ghi_chu
    
    # Delete old details
    db.query(CtPhieuXuat).filter(CtPhieuXuat.phieu_id == phieu_id).delete()
    
    # Add new details
    for ct in phieu.chi_tiet:
        so_luong_kg = ct.so_luong_kg or 0.0
        if so_luong_kg == 0 and ct.so_luong > 0:
            vt = db.query(VatTu).filter(VatTu.id == ct.vat_tu_id).first()
            if vt and vt.ty_le_quy_doi:
                so_luong_kg = ct.so_luong / vt.ty_le_quy_doi if vt.phep_tinh == 'chia' else ct.so_luong * vt.ty_le_quy_doi

        db_ct = CtPhieuXuat(
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
def xac_nhan_phieu_xuat(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuXuat).filter(PhieuXuat.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "xac_nhan":
        raise HTTPException(status_code=400, detail="Phiếu đã được xác nhận")
        
    # Cập nhật tồn kho (Trừ tồn)
    chi_tiet = db.query(CtPhieuXuat).filter(CtPhieuXuat.phieu_id == phieu.id).all()
    for ct in chi_tiet:
        filters = [TonKho.vat_tu_id == ct.vat_tu_id, TonKho.kho_id == phieu.kho_xuat_id]
        if ct.vi_tri_id is not None:
            filters.append(TonKho.vi_tri_id == ct.vi_tri_id)
        else:
            filters.append(TonKho.vi_tri_id.is_(None))
            
        ton = db.query(TonKho).filter(*filters).first()
        
        if not ton or ton.so_luong < ct.so_luong:
            raise HTTPException(status_code=400, detail=f"Lỗi: Vật tư {ct.vat_tu_id} số lượng xuất vượt tồn.")
            
        ton.so_luong -= (ct.so_luong or 0)
        ton.so_luong_kg -= (ct.so_luong_kg or 0)
        
    phieu.trang_thai = "xac_nhan"
    
    # [LOGIC MỚI] Nếu phiếu xuất có lenh_dc_id (từ Lệnh ĐC) → tự tạo phiếu nhập bên nhận + cập nhật da_xuat
    if phieu.lenh_dc_id and phieu.kho_nhan_id:
        from routers.nhap_kho import generate_so_phieu as gen_sp
        lenh_dc = db.query(PhieuDieuChuyen).filter(PhieuDieuChuyen.id == phieu.lenh_dc_id).first()
        
        # Tạo phiếu nhập tự động bên nhận
        so_phieu_nhap = gen_sp(db, "PNK")
        phieu_nhap = PhieuNhap(
            so_phieu=so_phieu_nhap,
            loai_nhap="nhan_dieu_chuyen",
            ngay_nhap=phieu.ngay_xuat,
            kho_id=phieu.kho_nhan_id,
            phieu_dc_id=phieu.lenh_dc_id,
            phieu_xuat_id=phieu.id,
            ghi_chu=f"Nhận ĐC từ phiếu xuất {phieu.so_phieu}",
            trang_thai="nhap"  # Nháp để bên nhận xác nhận
        )
        db.add(phieu_nhap)
        db.flush()
        
        for ct in chi_tiet:
            ct_nhap = CtPhieuNhap(
                phieu_id=phieu_nhap.id,
                vat_tu_id=ct.vat_tu_id,
                vi_tri_id=None,
                so_luong=ct.so_luong,
                so_luong_kg=ct.so_luong_kg,
                ghi_chu=ct.ghi_chu
            )
            db.add(ct_nhap)
            
            # Cập nhật da_xuat trên chi tiết lệnh ĐC
            if lenh_dc:
                ct_dc = db.query(CtDieuChuyen).filter(
                    CtDieuChuyen.phieu_id == lenh_dc.id,
                    CtDieuChuyen.vat_tu_id == ct.vat_tu_id
                ).first()
                if ct_dc:
                    ct_dc.da_xuat_sl = (ct_dc.da_xuat_sl or 0) + (ct.so_luong or 0)
                    ct_dc.da_xuat_kg = (ct_dc.da_xuat_kg or 0) + (ct.so_luong_kg or 0)
    
    # [LEGACY] Nếu là phiếu xuất ĐC độc lập (không qua lệnh) → tạo PhieuDieuChuyen cũ
    elif phieu.loai_xuat == "dieu_chuyen" and not phieu.lenh_dc_id and phieu.kho_nhan_id:
        so_phieu_dc = generate_so_phieu(db, "PDC")
        phieu_dc = PhieuDieuChuyen(
            so_phieu=so_phieu_dc,
            ngay_dc=phieu.ngay_xuat,
            so_lenh_dieu_dong=phieu.so_lenh_dieu_dong,
            kho_xuat_id=phieu.kho_xuat_id,
            kho_nhan_id=phieu.kho_nhan_id,
            bien_so_xe=phieu.bien_so_xe,
            nguoi_giao=phieu.nguoi_giao,
            nguoi_nhan=phieu.nguoi_nhan,
            ghi_chu=phieu.ghi_chu,
            trang_thai="dang_van_chuyen"
        )
        db.add(phieu_dc)
        db.flush()
        phieu.phieu_dc_id = phieu_dc.id
        
        for ct in chi_tiet:
            db_ct_dc = CtDieuChuyen(
                phieu_id=phieu_dc.id, vat_tu_id=ct.vat_tu_id,
                vi_tri_nhan_id=None, so_luong_gui=ct.so_luong,
                so_luong_gui_kg=ct.so_luong_kg
            )
            db.add(db_ct_dc)
            
    db.commit()
    return {"status": "success", "message": "Xuất kho thành công"}


@router.delete("/{phieu_id}")
def delete_phieu_xuat(phieu_id: int, db: Session = Depends(get_db)):
    phieu = db.query(PhieuXuat).filter(PhieuXuat.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "xac_nhan":
        raise HTTPException(status_code=400, detail="Không thể xóa phiếu đã xác nhận")
    
    db.query(CtPhieuXuat).filter(CtPhieuXuat.phieu_id == phieu.id).delete()
    db.delete(phieu)
    db.commit()
    return {"status": "success", "message": "Xóa phiếu thành công"}
