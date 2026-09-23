"""
Model: Vật Tư Hàng Hóa
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class VatTu(Base):
    __tablename__ = "vat_tu"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ma_hang = Column(String(50), unique=True, nullable=False)
    ten_hang = Column(String(500), nullable=False)
    ten_khong_dau = Column(String(500), nullable=True) # Dùng cho tìm kiếm không dấu
    tinh_chat = Column(String(30), default="hang_hoa")  # hang_hoa / ccdc
    dvt_id = Column(Integer, ForeignKey("don_vi_tinh.id"))   # ĐVT chính (thường là Kg)
    nhom_id = Column(Integer, ForeignKey("nhom_vat_tu.id"))

    # Đơn vị phụ (Thanh, Tấm, Bộ, Cái...)
    dvt_phu = Column(String(30))
    ty_le_quy_doi = Column(Float)      # 1 tấm = 84.56 Kg
    phep_tinh = Column(String(10), default="nhan")  # nhan / chia

    mo_ta = Column(String(500))
    an = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    dvt = relationship("DonViTinh", back_populates="vat_tu_list")
    nhom = relationship("NhomVatTu", back_populates="vat_tu_list")
    ton_kho_list = relationship("TonKho", back_populates="vat_tu", cascade="all, delete-orphan")
