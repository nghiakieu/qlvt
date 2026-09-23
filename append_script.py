import sys

with open("app/backend/routers/nhap_kho.py", "a", encoding="utf-8") as f:
    f.write("""
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
""")

with open("app/backend/routers/xuat_kho.py", "a", encoding="utf-8") as f:
    f.write("""
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
""")

with open("app/backend/routers/kiem_ke.py", "a", encoding="utf-8") as f:
    f.write("""
@router.delete("/{phieu_id}")
def delete_kiem_ke(phieu_id: int, db: Session = Depends(get_db)):
    from models.transaction import PhieuKiemKe, CtKiemKe
    phieu = db.query(PhieuKiemKe).filter(PhieuKiemKe.id == phieu_id).first()
    if not phieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu")
    if phieu.trang_thai == "da_duyet":
        raise HTTPException(status_code=400, detail="Không thể xóa phiếu đã duyệt")
    
    db.query(CtKiemKe).filter(CtKiemKe.phieu_id == phieu.id).delete()
    db.delete(phieu)
    db.commit()
    return {"status": "success", "message": "Xóa phiếu thành công"}
""")
