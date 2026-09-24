"""
Models: Phiếu Nhập, Phiếu Xuất, Lệnh Điều Chuyển, Phiếu Gia Công/Mua Mới, Kiểm Kê
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Date, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ─────────────────────────────────────────────
# PHIẾU GIA CÔNG / MUA MỚI
# ─────────────────────────────────────────────
class PhieuGiaCong(Base):
    __tablename__ = "phieu_gia_cong"

    id = Column(Integer, primary_key=True, autoincrement=True)
    so_phieu = Column(String(30), unique=True, nullable=False)   # PGC-2026-001
    ngay_tao = Column(Date, nullable=False)
    nha_cung_cap = Column(String(200))        # Xưởng GC / NCC
    so_hop_dong = Column(String(100))
    kho_nhan_id = Column(Integer, ForeignKey("kho.id"))  # Nơi giao hàng đến
    ghi_chu = Column(String(500))
    trang_thai = Column(String(30), default="cho_giao")
    # cho_giao / dang_giao / hoan_thanh / huy

    created_at = Column(DateTime, server_default=func.now())

    kho_nhan = relationship("Kho")
    chi_tiet = relationship("CtPhieuGiaCong", back_populates="phieu", cascade="all, delete-orphan")


class CtPhieuGiaCong(Base):
    __tablename__ = "ct_phieu_gia_cong"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phieu_id = Column(Integer, ForeignKey("phieu_gia_cong.id", ondelete="CASCADE"), nullable=False)
    vat_tu_id = Column(Integer, ForeignKey("vat_tu.id"))

    so_luong = Column(Float, nullable=False)       # SL đặt
    so_luong_kg = Column(Float, default=0)         # KL đặt
    da_nhan_sl = Column(Float, default=0)          # Tổng đã nhận qua các phiếu nhập
    da_nhan_kg = Column(Float, default=0)
    ghi_chu = Column(String(200))

    phieu = relationship("PhieuGiaCong", back_populates="chi_tiet")
    vat_tu = relationship("VatTu")


# ─────────────────────────────────────────────
# PHIẾU NHẬP KHO
# ─────────────────────────────────────────────
class PhieuNhap(Base):
    __tablename__ = "phieu_nhap"

    id = Column(Integer, primary_key=True, autoincrement=True)
    so_phieu = Column(String(30), unique=True, nullable=False)   # PNK-2026-001
    loai_nhap = Column(String(30), nullable=False)
    # gc_moi (gia công mới) / nhan_dieu_chuyen (nhận từ kho/CT khác)

    ngay_nhap = Column(Date, nullable=False)
    kho_id = Column(Integer, ForeignKey("kho.id"))
    don_vi_giao = Column(String(200))      # Xưởng / đơn vị giao hàng
    bien_so_xe = Column(String(30))
    tai_xe = Column(String(100))
    so_hop_dong = Column(String(100))      # Cho loại gc_moi
    phieu_dc_id = Column(Integer, ForeignKey("phieu_dieu_chuyen.id"), nullable=True)
    phieu_gc_id = Column(Integer, ForeignKey("phieu_gia_cong.id"), nullable=True)
    phieu_xuat_id = Column(Integer, ForeignKey("phieu_xuat.id"), nullable=True)  # Link về phiếu xuất gốc
    ghi_chu = Column(String(500))
    trang_thai = Column(String(20), default="nhap")
    # nhap (nháp) / xac_nhan / huy

    created_at = Column(DateTime, server_default=func.now())

    kho = relationship("Kho")
    chi_tiet = relationship("CtPhieuNhap", back_populates="phieu", cascade="all, delete-orphan")


class CtPhieuNhap(Base):
    __tablename__ = "ct_phieu_nhap"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phieu_id = Column(Integer, ForeignKey("phieu_nhap.id", ondelete="CASCADE"), nullable=False)
    vat_tu_id = Column(Integer, ForeignKey("vat_tu.id"))
    vi_tri_id = Column(Integer, ForeignKey("vi_tri.id"), nullable=True)

    so_luong = Column(Float, nullable=False)   # Theo ĐVT phụ
    so_luong_kg = Column(Float)                # Tự tính
    ghi_chu = Column(String(200))

    phieu = relationship("PhieuNhap", back_populates="chi_tiet")
    vat_tu = relationship("VatTu")
    vi_tri = relationship("ViTri")


# ─────────────────────────────────────────────
# PHIẾU XUẤT KHO
# ─────────────────────────────────────────────
class PhieuXuat(Base):
    __tablename__ = "phieu_xuat"

    id = Column(Integer, primary_key=True, autoincrement=True)
    so_phieu = Column(String(30), unique=True, nullable=False)   # PXK-2026-001
    loai_xuat = Column(String(30), nullable=False)
    # dieu_chuyen / ban_thanh_ly

    ngay_xuat = Column(Date, nullable=False)
    kho_xuat_id = Column(Integer, ForeignKey("kho.id"))
    kho_nhan_id = Column(Integer, ForeignKey("kho.id"), nullable=True)   # Cho dieu_chuyen
    so_lenh_dieu_dong = Column(String(100))     # 5872/CV-PT
    bien_so_xe = Column(String(30))
    nguoi_giao = Column(String(100))
    nguoi_nhan = Column(String(100))
    doi_tac_mua = Column(String(200))           # Cho ban_thanh_ly
    lenh_dc_id = Column(Integer, ForeignKey("phieu_dieu_chuyen.id"), nullable=True)  # Link về lệnh ĐC gốc
    phieu_dc_id = Column(Integer, ForeignKey("phieu_dieu_chuyen.id"), nullable=True)  # Legacy
    ghi_chu = Column(String(500))
    trang_thai = Column(String(20), default="nhap")

    created_at = Column(DateTime, server_default=func.now())

    kho_xuat = relationship("Kho", foreign_keys=[kho_xuat_id])
    kho_nhan = relationship("Kho", foreign_keys=[kho_nhan_id])
    chi_tiet = relationship("CtPhieuXuat", back_populates="phieu", cascade="all, delete-orphan")


class CtPhieuXuat(Base):
    __tablename__ = "ct_phieu_xuat"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phieu_id = Column(Integer, ForeignKey("phieu_xuat.id", ondelete="CASCADE"), nullable=False)
    vat_tu_id = Column(Integer, ForeignKey("vat_tu.id"))
    vi_tri_id = Column(Integer, ForeignKey("vi_tri.id"), nullable=True)

    so_luong = Column(Float, nullable=False)        # SL thực tế xuất
    so_luong_kg = Column(Float)
    sl_theo_lenh = Column(Float, nullable=True)     # SL theo lệnh ĐC (để so sánh)
    ghi_chu = Column(String(200))

    phieu = relationship("PhieuXuat", back_populates="chi_tiet")
    vat_tu = relationship("VatTu")
    vi_tri = relationship("ViTri")


# ─────────────────────────────────────────────
# LỆNH ĐIỀU CHUYỂN
# ─────────────────────────────────────────────
class PhieuDieuChuyen(Base):
    __tablename__ = "phieu_dieu_chuyen"

    id = Column(Integer, primary_key=True, autoincrement=True)
    so_phieu = Column(String(30), unique=True, nullable=False)   # LDC-2026-001
    ngay_dc = Column(Date, nullable=False)
    so_lenh_dieu_dong = Column(String(100))
    kho_xuat_id = Column(Integer, ForeignKey("kho.id"))
    kho_nhan_id = Column(Integer, ForeignKey("kho.id"))
    bien_so_xe = Column(String(30))
    nguoi_giao = Column(String(100))
    nguoi_nhan = Column(String(100))
    ghi_chu = Column(String(500))
    ly_do_dieu_chuyen = Column(String(300))
    don_vi_van_chuyen = Column(String(200))
    thoi_gian_hoan_thanh = Column(String(100))
    trang_thai = Column(String(30), default="cho_xuat")
    # cho_xuat / dang_xuat / hoan_thanh / huy
    # Legacy values: dang_van_chuyen / da_nhan / chenh_lech

    created_at = Column(DateTime, server_default=func.now())

    kho_xuat = relationship("Kho", foreign_keys=[kho_xuat_id])
    kho_nhan = relationship("Kho", foreign_keys=[kho_nhan_id])
    chi_tiet = relationship("CtDieuChuyen", back_populates="phieu", cascade="all, delete-orphan")


class CtDieuChuyen(Base):
    __tablename__ = "ct_dieu_chuyen"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phieu_id = Column(Integer, ForeignKey("phieu_dieu_chuyen.id", ondelete="CASCADE"))
    vat_tu_id = Column(Integer, ForeignKey("vat_tu.id"), nullable=True)
    vi_tri_nhan_id = Column(Integer, ForeignKey("vi_tri.id"), nullable=True)

    is_group = Column(Boolean, default=False)
    ten_nhom = Column(String(200), nullable=True)

    so_luong_gui = Column(Float, nullable=True)      # SL theo lệnh (nullable cho group)
    so_luong_gui_kg = Column(Float, nullable=True)
    da_xuat_sl = Column(Float, default=0)             # Tổng đã xuất qua các phiếu xuất
    da_xuat_kg = Column(Float, default=0)
    so_luong_nhan = Column(Float, nullable=True)      # Tổng đã nhận (legacy + tổng hợp)
    so_luong_nhan_kg = Column(Float, nullable=True)
    ly_do_chenh_lech = Column(String(300))

    phieu = relationship("PhieuDieuChuyen", back_populates="chi_tiet")
    vat_tu = relationship("VatTu")
    vi_tri_nhan = relationship("ViTri")


# ─────────────────────────────────────────────
# PHIẾU KIỂM KÊ
# ─────────────────────────────────────────────
class PhieuKiemKe(Base):
    __tablename__ = "phieu_kiem_ke"

    id = Column(Integer, primary_key=True, autoincrement=True)
    so_phieu = Column(String(30), unique=True, nullable=False)
    ngay_kiem_ke = Column(Date, nullable=False)
    kho_id = Column(Integer, ForeignKey("kho.id"))
    muc_dich = Column(String(200))
    ghi_chu = Column(String(500))
    trang_thai = Column(String(20), default="dang_kiem_ke")
    # dang_kiem_ke / hoan_thanh

    created_at = Column(DateTime, server_default=func.now())

    kho = relationship("Kho")
    chi_tiet = relationship("CtKiemKe", back_populates="phieu", cascade="all, delete-orphan")


class CtKiemKe(Base):
    __tablename__ = "ct_kiem_ke"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phieu_id = Column(Integer, ForeignKey("phieu_kiem_ke.id", ondelete="CASCADE"))
    vat_tu_id = Column(Integer, ForeignKey("vat_tu.id"))
    vi_tri_id = Column(Integer, ForeignKey("vi_tri.id"), nullable=True)

    sl_so_sach = Column(Float)       # Lấy từ tồn kho tại thời điểm KK
    sl_so_sach_kg = Column(Float)
    sl_thuc_te = Column(Float)       # Người dùng nhập
    sl_thuc_te_kg = Column(Float)
    ly_do = Column(String(300))

    phieu = relationship("PhieuKiemKe", back_populates="chi_tiet")
    vat_tu = relationship("VatTu")
    vi_tri = relationship("ViTri")


# ─────────────────────────────────────────────
# COUNTER SỐ PHIẾU TỰ ĐỘNG
# ─────────────────────────────────────────────
class CounterPhieu(Base):
    __tablename__ = "counter_phieu"

    id = Column(Integer, primary_key=True, autoincrement=True)
    loai = Column(String(10), nullable=False)   # PNK, PXK, LDC, PGC, KK
    nam = Column(Integer, nullable=False)
    so_thu_tu = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("loai", "nam", name="uq_counter_loai_nam"),
    )
