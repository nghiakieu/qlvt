from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from schemas.master import Kho, ViTri
from schemas.material import VatTu

class TonKhoBase(BaseModel):
    so_luong: float
    so_luong_kg: float

class TonKho(TonKhoBase):
    id: int
    vat_tu_id: int
    kho_id: int
    vi_tri_id: Optional[int] = None
    cap_nhat: Optional[datetime] = None
    
    vat_tu: Optional[VatTu] = None
    kho: Optional[Kho] = None
    vi_tri: Optional[ViTri] = None

    class Config:
        from_attributes = True
