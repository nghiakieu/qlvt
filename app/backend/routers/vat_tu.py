from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional

from database import get_db
from models.material import VatTu
from schemas import material as schemas

router = APIRouter()

import unicodedata
from pydantic import BaseModel
from utils.string_utils import remove_accents

class VatTuListResponse(BaseModel):
    total: int
    items: List[schemas.VatTu]
    skip: int
    limit: int

@router.get("/", response_model=VatTuListResponse)
def get_vat_tu(
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None,
    nhom_id: Optional[int] = None,
    tinh_chat: Optional[str] = None,
    dvt_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    base_query = db.query(VatTu).filter(VatTu.an.is_(False))
    
    if search:
        search = search.strip()
        search_khong_dau = remove_accents(search)
        terms = search_khong_dau.split()
        
        for term in terms:
            term_like = f"%{term}%"
            base_query = base_query.filter(
                or_(
                    VatTu.ma_hang.ilike(term_like),
                    VatTu.ten_khong_dau.ilike(term_like),
                    VatTu.ten_hang.ilike(term_like)
                )
            )
            
    if nhom_id is not None:
        base_query = base_query.filter(VatTu.nhom_id == nhom_id)
    if tinh_chat:
        base_query = base_query.filter(VatTu.tinh_chat == tinh_chat)
    if dvt_id:
        base_query = base_query.filter(VatTu.dvt_id == dvt_id)
        
    total = base_query.count()
    
    items_query = base_query.options(joinedload(VatTu.dvt), joinedload(VatTu.nhom))
    items = items_query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }

@router.post("/", response_model=schemas.VatTu)
def create_vat_tu(item: schemas.VatTuCreate, db: Session = Depends(get_db)):
    db_item = db.query(VatTu).filter(VatTu.ma_hang == item.ma_hang).first()
    if db_item:
        raise HTTPException(status_code=400, detail="Mã hàng đã tồn tại")
    
    new_item = VatTu(**item.dict())
    new_item.ten_khong_dau = remove_accents(new_item.ten_hang)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/{id}", response_model=schemas.VatTu)
def get_vat_tu_by_id(id: int, db: Session = Depends(get_db)):
    db_item = db.query(VatTu).options(joinedload(VatTu.dvt), joinedload(VatTu.nhom)).filter(VatTu.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy vật tư")
    return db_item

@router.put("/{id}", response_model=schemas.VatTu)
def update_vat_tu(id: int, item: schemas.VatTuCreate, db: Session = Depends(get_db)):
    db_item = db.query(VatTu).filter(VatTu.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy vật tư")
    
    # Kiểm tra mã hàng trùng (trừ chính nó)
    exist = db.query(VatTu).filter(VatTu.ma_hang == item.ma_hang, VatTu.id != id).first()
    if exist:
        raise HTTPException(status_code=400, detail="Mã hàng đã tồn tại")
        
    for k, v in item.dict().items():
        setattr(db_item, k, v)
        
    db_item.ten_khong_dau = remove_accents(db_item.ten_hang)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{id}")
def hide_vat_tu(id: int, db: Session = Depends(get_db)):
    db_item = db.query(VatTu).filter(VatTu.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy vật tư")
    
    db_item.an = True
    db.commit()
    return {"status": "success"}
