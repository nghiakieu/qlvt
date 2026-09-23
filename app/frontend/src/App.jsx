import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Empty } from 'antd'
import viVN from 'antd/locale/vi_VN'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import DanhMucVatTu from './pages/DanhMucVatTu'
import KhoCongTrinh from './pages/KhoCongTrinh'
import NhapKho from './pages/NhapKho'
import XuatKho from './pages/XuatKho'
import LenhDieuChuyen from './pages/DieuChuyen'
import GiaCongMuaMoi from './pages/GiaCongMuaMoi'
import KiemKe from './pages/KiemKe'
import BaoCao from './pages/BaoCao'
import DanhMucHeThong from './pages/DanhMucHeThong'

const customizeRenderEmpty = () => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={<span style={{ color: '#888' }}>Không có dữ liệu</span>}
  />
)

export default function App() {
  return (
    <ConfigProvider locale={viVN} renderEmpty={customizeRenderEmpty} theme={{ token: { fontFamily: 'Inter, sans-serif' } }}>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/danh-muc-vat-tu" element={<DanhMucVatTu />} />
          <Route path="/kho-cong-trinh" element={<KhoCongTrinh />} />
          <Route path="/gia-cong" element={<GiaCongMuaMoi />} />
          <Route path="/lenh-dieu-chuyen" element={<LenhDieuChuyen />} />
          <Route path="/xuat-kho" element={<XuatKho />} />
          <Route path="/nhap-kho" element={<NhapKho />} />
          <Route path="/kiem-ke" element={<KiemKe />} />
          <Route path="/bao-cao" element={<BaoCao />} />
          <Route path="/danh-muc-he-thong" element={<DanhMucHeThong />} />
        </Routes>
      </MainLayout>
    </ConfigProvider>
  )
}
