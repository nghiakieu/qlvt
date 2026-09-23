"""
Model: Tồn Kho — trạng thái tồn kho hiện tại
"""
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class TonKho(Base):
    __tablename__ = "ton_kho"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vat_tu_id = Column(Integer, ForeignKey("vat_tu.id"), nullable=False)
    kho_id = Column(Integer, ForeignKey("kho.id"), nullable=False)
    vi_tri_id = Column(Integer, ForeignKey("vi_tri.id"), nullable=True)

    so_luong = Column(Float, default=0)       # Theo ĐVT phụ (tấm, thanh, cái...)
    so_luong_kg = Column(Float, default=0)    # Theo ĐVT chính (Kg)

    cap_nhat = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("vat_tu_id", "kho_id", "vi_tri_id", name="uq_ton_kho"),
    )

    vat_tu = relationship("VatTu", back_populates="ton_kho_list")
    kho = relationship("Kho")
    vi_tri = relationship("ViTri")
