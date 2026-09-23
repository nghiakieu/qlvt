from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.master import Kho, NhomVatTu, DonViTinh, ViTri, CongTrinh
from schemas import master as schemas

router = APIRouter()

# --- ĐƠN VỊ TÍNH ---
@router.get("/don-vi-tinh", response_model=List[schemas.DonViTinh])
def get_don_vi_tinh(db: Session = Depends(get_db)):
    return db.query(DonViTinh).all()

@router.post("/don-vi-tinh", response_model=schemas.DonViTinh)
def create_don_vi_tinh(data: schemas.DonViTinhBase, db: Session = Depends(get_db)):
    db_item = DonViTinh(**data.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/don-vi-tinh/{id}", response_model=schemas.DonViTinh)
def update_don_vi_tinh(id: int, data: schemas.DonViTinhBase, db: Session = Depends(get_db)):
    db_item = db.query(DonViTinh).filter(DonViTinh.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    for k, v in data.dict().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/don-vi-tinh/{id}")
def delete_don_vi_tinh(id: int, db: Session = Depends(get_db)):
    db_item = db.query(DonViTinh).filter(DonViTinh.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    db.delete(db_item)
    db.commit()
    return {"status": "success"}

# --- NHÓM VẬT TƯ ---
@router.get("/nhom-vat-tu", response_model=List[schemas.NhomVatTu])
def get_nhom_vat_tu(db: Session = Depends(get_db)):
    return db.query(NhomVatTu).filter(NhomVatTu.an.is_(False)).all()

@router.post("/nhom-vat-tu", response_model=schemas.NhomVatTu)
def create_nhom_vat_tu(data: schemas.NhomVatTuBase, db: Session = Depends(get_db)):
    db_item = NhomVatTu(**data.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/nhom-vat-tu/{id}", response_model=schemas.NhomVatTu)
def update_nhom_vat_tu(id: int, data: schemas.NhomVatTuBase, db: Session = Depends(get_db)):
    db_item = db.query(NhomVatTu).filter(NhomVatTu.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    for k, v in data.dict().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/nhom-vat-tu/{id}")
def hide_nhom_vat_tu(id: int, db: Session = Depends(get_db)):
    db_item = db.query(NhomVatTu).filter(NhomVatTu.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    db_item.an = True
    db.commit()
    return {"status": "success"}

# --- KHO ---
@router.get("/kho", response_model=List[schemas.Kho])
def get_kho(db: Session = Depends(get_db)):
    return db.query(Kho).filter(Kho.an.is_(False)).all()

@router.post("/kho", response_model=schemas.Kho)
def create_kho(data: schemas.KhoBase, db: Session = Depends(get_db)):
    db_item = Kho(**data.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/kho/{id}", response_model=schemas.Kho)
def update_kho(id: int, data: schemas.KhoBase, db: Session = Depends(get_db)):
    db_item = db.query(Kho).filter(Kho.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    for k, v in data.dict().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/kho/{id}")
def hide_kho(id: int, db: Session = Depends(get_db)):
    db_item = db.query(Kho).filter(Kho.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    db_item.an = True
    db.commit()
    return {"status": "success"}

# --- CÔNG TRÌNH ---
@router.get("/cong-trinh", response_model=List[schemas.CongTrinh])
def get_cong_trinh(db: Session = Depends(get_db)):
    return db.query(CongTrinh).all()

@router.post("/cong-trinh", response_model=schemas.CongTrinh)
def create_cong_trinh(data: schemas.CongTrinhBase, db: Session = Depends(get_db)):
    db_item = CongTrinh(**data.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/cong-trinh/{id}", response_model=schemas.CongTrinh)
def update_cong_trinh(id: int, data: schemas.CongTrinhBase, db: Session = Depends(get_db)):
    db_item = db.query(CongTrinh).filter(CongTrinh.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    for k, v in data.dict().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

# --- VỊ TRÍ KHO ---
@router.get("/vi-tri", response_model=List[schemas.ViTri])
def get_vi_tri(db: Session = Depends(get_db)):
    return db.query(ViTri).all()

@router.post("/vi-tri", response_model=schemas.ViTri)
def create_vi_tri(data: schemas.ViTriBase, db: Session = Depends(get_db)):
    db_item = ViTri(**data.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/vi-tri/{id}", response_model=schemas.ViTri)
def update_vi_tri(id: int, data: schemas.ViTriBase, db: Session = Depends(get_db)):
    db_item = db.query(ViTri).filter(ViTri.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    for k, v in data.dict().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/vi-tri/{id}")
def delete_vi_tri(id: int, db: Session = Depends(get_db)):
    db_item = db.query(ViTri).filter(ViTri.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    db.delete(db_item)
    db.commit()
    return {"status": "success"}
