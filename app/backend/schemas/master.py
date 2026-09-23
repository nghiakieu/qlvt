from pydantic import BaseModel
from typing import Optional, List

class DonViTinhBase(BaseModel):
    ten: str
    mo_ta: Optional[str] = None

class DonViTinh(DonViTinhBase):
    id: int
    class Config:
        from_attributes = True

class NhomVatTuBase(BaseModel):
    ma_nhom: str
    ten_nhom: str
    an: Optional[bool] = False

class NhomVatTu(NhomVatTuBase):
    id: int
    class Config:
        from_attributes = True

class KhoBase(BaseModel):
    ma_kho: str
    ten_kho: str
    loai_kho: Optional[str] = "cong_trinh"
    dia_chi: Optional[str] = None
    ma_kho_ke_toan: Optional[str] = None
    an: Optional[bool] = False

class Kho(KhoBase):
    id: int
    class Config:
        from_attributes = True

class ViTriBase(BaseModel):
    kho_id: int
    ma_vi_tri: str
    ten_vi_tri: str
    an: Optional[bool] = False

class ViTri(ViTriBase):
    id: int
    class Config:
        from_attributes = True

class CongTrinhBase(BaseModel):
    ma_ct: str
    ten_ct: str
    dia_diem: Optional[str] = None
    trang_thai: Optional[str] = "dang_thi_cong"
    ghi_chu: Optional[str] = None

class CongTrinh(CongTrinhBase):
    id: int
    class Config:
        from_attributes = True
