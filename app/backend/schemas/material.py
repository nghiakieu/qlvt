from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from schemas.master import DonViTinh, NhomVatTu

class VatTuBase(BaseModel):
    ma_hang: str
    ten_hang: str
    tinh_chat: Optional[str] = "hang_hoa"
    dvt_id: Optional[int] = None
    nhom_id: Optional[int] = None
    dvt_phu: Optional[str] = None
    ty_le_quy_doi: Optional[float] = None
    phep_tinh: Optional[str] = "nhan"
    mo_ta: Optional[str] = None
    an: Optional[bool] = False

class VatTuCreate(VatTuBase):
    pass

class VatTu(VatTuBase):
    id: int
    created_at: Optional[datetime] = None
    
    # Để kèm luôn thông tin hiển thị (nếu cần join)
    dvt: Optional[DonViTinh] = None
    nhom: Optional[NhomVatTu] = None

    class Config:
        from_attributes = True
