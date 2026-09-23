from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from schemas.master import Kho, ViTri
from schemas.material import VatTu

# --- CT Phiếu Gia Công ---
class CtPhieuGiaCongBase(BaseModel):
    vat_tu_id: int
    so_luong: float
    so_luong_kg: Optional[float] = 0.0
    ghi_chu: Optional[str] = None

class CtPhieuGiaCongCreate(CtPhieuGiaCongBase):
    pass

class CtPhieuGiaCong(CtPhieuGiaCongBase):
    id: int
    phieu_id: int
    da_nhan_sl: Optional[float] = 0
    da_nhan_kg: Optional[float] = 0
    vat_tu: Optional[VatTu] = None
    class Config:
        from_attributes = True

# --- Phiếu Gia Công ---
class PhieuGiaCongBase(BaseModel):
    ngay_tao: date
    nha_cung_cap: Optional[str] = None
    so_hop_dong: Optional[str] = None
    kho_nhan_id: int
    ghi_chu: Optional[str] = None

class PhieuGiaCongCreate(PhieuGiaCongBase):
    chi_tiet: List[CtPhieuGiaCongCreate]

class PhieuGiaCong(PhieuGiaCongBase):
    id: int
    so_phieu: str
    trang_thai: str
    created_at: Optional[datetime] = None
    kho_nhan: Optional[Kho] = None
    chi_tiet: List[CtPhieuGiaCong] = []
    class Config:
        from_attributes = True

# --- CT Phiếu Nhập ---
class CtPhieuNhapBase(BaseModel):
    vat_tu_id: int
    vi_tri_id: Optional[int] = None
    so_luong: float
    so_luong_kg: Optional[float] = 0.0
    ghi_chu: Optional[str] = None

class CtPhieuNhapCreate(CtPhieuNhapBase):
    pass

class CtPhieuNhap(CtPhieuNhapBase):
    id: int
    phieu_id: int
    vat_tu: Optional[VatTu] = None
    vi_tri: Optional[ViTri] = None
    class Config:
        from_attributes = True

# --- Phiếu Nhập ---
class PhieuNhapBase(BaseModel):
    loai_nhap: str  # gc_moi, nhan_dieu_chuyen
    ngay_nhap: date
    kho_id: int
    don_vi_giao: Optional[str] = None
    bien_so_xe: Optional[str] = None
    tai_xe: Optional[str] = None
    so_hop_dong: Optional[str] = None
    ghi_chu: Optional[str] = None

class PhieuNhapCreate(PhieuNhapBase):
    chi_tiet: List[CtPhieuNhapCreate]

class PhieuNhap(PhieuNhapBase):
    id: int
    so_phieu: str
    trang_thai: str
    phieu_dc_id: Optional[int] = None
    phieu_gc_id: Optional[int] = None
    phieu_xuat_id: Optional[int] = None
    created_at: Optional[datetime] = None
    kho: Optional[Kho] = None
    chi_tiet: List[CtPhieuNhap] = []
    class Config:
        from_attributes = True

# --- CT Phiếu Xuất ---
class CtPhieuXuatBase(BaseModel):
    vat_tu_id: int
    vi_tri_id: Optional[int] = None
    so_luong: float
    so_luong_kg: Optional[float] = 0.0
    sl_theo_lenh: Optional[float] = None
    ghi_chu: Optional[str] = None

class CtPhieuXuatCreate(CtPhieuXuatBase):
    pass

class CtPhieuXuat(CtPhieuXuatBase):
    id: int
    phieu_id: int
    vat_tu: Optional[VatTu] = None
    vi_tri: Optional[ViTri] = None
    class Config:
        from_attributes = True

# --- Phiếu Xuất ---
class PhieuXuatBase(BaseModel):
    loai_xuat: str  # dieu_chuyen, ban_thanh_ly
    ngay_xuat: date
    kho_xuat_id: int
    kho_nhan_id: Optional[int] = None
    so_lenh_dieu_dong: Optional[str] = None
    bien_so_xe: Optional[str] = None
    nguoi_giao: Optional[str] = None
    nguoi_nhan: Optional[str] = None
    doi_tac_mua: Optional[str] = None
    lenh_dc_id: Optional[int] = None
    ghi_chu: Optional[str] = None

class PhieuXuatCreate(PhieuXuatBase):
    chi_tiet: List[CtPhieuXuatCreate]

class PhieuXuat(PhieuXuatBase):
    id: int
    so_phieu: str
    trang_thai: str
    created_at: Optional[datetime] = None
    kho_xuat: Optional[Kho] = None
    kho_nhan: Optional[Kho] = None
    chi_tiet: List[CtPhieuXuat] = []
    class Config:
        from_attributes = True

# --- CT Điều Chuyển ---
class CtDieuChuyenBase(BaseModel):
    vat_tu_id: int
    vi_tri_nhan_id: Optional[int] = None
    so_luong_gui: float
    so_luong_gui_kg: Optional[float] = 0.0
    so_luong_nhan: Optional[float] = None
    so_luong_nhan_kg: Optional[float] = None
    da_xuat_sl: Optional[float] = 0
    da_xuat_kg: Optional[float] = 0
    ly_do_chenh_lech: Optional[str] = None

class CtDieuChuyenCreate(BaseModel):
    vat_tu_id: int
    so_luong_gui: float
    so_luong_gui_kg: Optional[float] = 0.0
    ghi_chu: Optional[str] = None

class CtDieuChuyen(CtDieuChuyenBase):
    id: int
    phieu_id: int
    vat_tu: Optional[VatTu] = None
    vi_tri_nhan: Optional[ViTri] = None
    class Config:
        from_attributes = True

# --- Lệnh Điều Chuyển ---
class PhieuDieuChuyenBase(BaseModel):
    ngay_dc: date
    so_lenh_dieu_dong: Optional[str] = None
    kho_xuat_id: int
    kho_nhan_id: int
    bien_so_xe: Optional[str] = None
    nguoi_giao: Optional[str] = None
    nguoi_nhan: Optional[str] = None
    ghi_chu: Optional[str] = None

class PhieuDieuChuyenCreate(PhieuDieuChuyenBase):
    chi_tiet: List[CtDieuChuyenCreate]

class PhieuDieuChuyen(PhieuDieuChuyenBase):
    id: int
    so_phieu: str
    trang_thai: str
    created_at: Optional[datetime] = None
    kho_xuat: Optional[Kho] = None
    kho_nhan: Optional[Kho] = None
    chi_tiet: List[CtDieuChuyen] = []
    class Config:
        from_attributes = True

# --- Request: Tạo phiếu xuất từ Lệnh ĐC ---
class TaoPhieuXuatTuLenhDC(BaseModel):
    ngay_xuat: date
    bien_so_xe: Optional[str] = None
    nguoi_giao: Optional[str] = None
    nguoi_nhan: Optional[str] = None
    ghi_chu: Optional[str] = None
    chi_tiet: List[CtPhieuXuatCreate]  # Chọn VT + SL xuất chuyến này

# --- Request: Tạo phiếu nhập từ Phiếu GC ---
class TaoPhieuNhapTuGC(BaseModel):
    ngay_nhap: date
    bien_so_xe: Optional[str] = None
    tai_xe: Optional[str] = None
    don_vi_giao: Optional[str] = None
    ghi_chu: Optional[str] = None
    chi_tiet: List[CtPhieuNhapCreate]

# --- CT Kiểm Kê ---
class CtKiemKeBase(BaseModel):
    vat_tu_id: int
    vi_tri_id: Optional[int] = None
    sl_so_sach: Optional[float] = 0.0
    sl_so_sach_kg: Optional[float] = 0.0
    sl_thuc_te: float
    sl_thuc_te_kg: Optional[float] = 0.0
    ly_do: Optional[str] = None

class CtKiemKeCreate(CtKiemKeBase):
    pass

class CtKiemKe(CtKiemKeBase):
    id: int
    phieu_id: int
    vat_tu: Optional[VatTu] = None
    vi_tri: Optional[ViTri] = None
    class Config:
        from_attributes = True

# --- Phiếu Kiểm Kê ---
class PhieuKiemKeBase(BaseModel):
    ngay_kiem_ke: date
    kho_id: int
    muc_dich: Optional[str] = None
    ghi_chu: Optional[str] = None

class PhieuKiemKeCreate(PhieuKiemKeBase):
    chi_tiet: List[CtKiemKeCreate]

class PhieuKiemKe(PhieuKiemKeBase):
    id: int
    so_phieu: str
    trang_thai: str
    created_at: Optional[datetime] = None
    kho: Optional[Kho] = None
    chi_tiet: List[CtKiemKe] = []
    class Config:
        from_attributes = True
