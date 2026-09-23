from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from models.inventory import TonKho
from models.master import Kho
from models.material import VatTu
from schemas import inventory as schemas

router = APIRouter()

from pydantic import BaseModel

class TonKhoListResponse(BaseModel):
    total: int
    items: List[schemas.TonKho]
    skip: int
    limit: int

@router.get("/", response_model=TonKhoListResponse)
def get_ton_kho(
    skip: int = 0, 
    limit: int = 50,
    kho_id: Optional[int] = None,
    vat_tu_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    base_query = db.query(TonKho)
    
    if kho_id is not None:
        base_query = base_query.filter(TonKho.kho_id == kho_id)
    if vat_tu_id is not None:
        base_query = base_query.filter(TonKho.vat_tu_id == vat_tu_id)
        
    total = base_query.count()
    
    items_query = base_query.options(
        joinedload(TonKho.vat_tu).joinedload(VatTu.dvt),
        joinedload(TonKho.kho),
        joinedload(TonKho.vi_tri)
    )
    items = items_query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }
