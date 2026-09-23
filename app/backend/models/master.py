"""
Models: Danh mục hệ thống — Kho, Vị trí, Nhóm VT, ĐVT, Công trình
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base


# Bảng liên kết công trình ↔ kho (many-to-many)
ct_kho_table = Table(
    "ct_kho",
    Base.metadata,
    Column("cong_trinh_id", Integer, ForeignKey("cong_trinh.id"), primary_key=True),
    Column("kho_id", Integer, ForeignKey("kho.id"), primary_key=True),
)


class DonViTinh(Base):
    __tablename__ = "don_vi_tinh"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ten = Column(String(50), unique=True, nullable=False)
    mo_ta = Column(String(200))

    vat_tu_list = relationship("VatTu", back_populates="dvt")


class NhomVatTu(Base):
    __tablename__ = "nhom_vat_tu"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ma_nhom = Column(String(30), unique=True, nullable=False)
    ten_nhom = Column(String(200), nullable=False)
    an = Column(Boolean, default=False)

    vat_tu_list = relationship("VatTu", back_populates="nhom")


class Kho(Base):
    __tablename__ = "kho"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ma_kho = Column(String(20), unique=True, nullable=False)
    ten_kho = Column(String(200), nullable=False)
    loai_kho = Column(String(20), default="cong_trinh")  # trung_tam / cong_trinh
    dia_chi = Column(String(300))
    ma_kho_ke_toan = Column(String(20))
    an = Column(Boolean, default=False)

    vi_tri_list = relationship("ViTri", back_populates="kho")
    cong_trinh_list = relationship("CongTrinh", secondary=ct_kho_table, back_populates="kho_list")


class ViTri(Base):
    __tablename__ = "vi_tri"

    id = Column(Integer, primary_key=True, autoincrement=True)
    kho_id = Column(Integer, ForeignKey("kho.id"), nullable=False)
    ma_vi_tri = Column(String(50), nullable=False)
    ten_vi_tri = Column(String(200), nullable=False)
    an = Column(Boolean, default=False)

    kho = relationship("Kho", back_populates="vi_tri_list")


class CongTrinh(Base):
    __tablename__ = "cong_trinh"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ma_ct = Column(String(30), unique=True, nullable=False)
    ten_ct = Column(String(300), nullable=False)
    dia_diem = Column(String(300))
    trang_thai = Column(String(30), default="dang_thi_cong")
    # dang_thi_cong / hoan_thanh / tam_dung
    ghi_chu = Column(String(500))

    kho_list = relationship("Kho", secondary=ct_kho_table, back_populates="cong_trinh_list")
