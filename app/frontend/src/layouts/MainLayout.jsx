import React, { useState, useEffect } from 'react'
import { Layout, Menu, Typography, Badge, theme, Breadcrumb, Avatar, Button, Space } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, AppstoreOutlined, HomeOutlined,
  DownloadOutlined, UploadOutlined, SwapOutlined,
  AuditOutlined, BarChartOutlined, SettingOutlined,
  BellOutlined, UserOutlined
} from '@ant-design/icons'
import { useMasterStore } from '../store/masterStore'

const { Sider, Header, Content, Footer } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/dashboard',          icon: <DashboardOutlined />,  label: 'Tổng quan' },
  { key: '/danh-muc-vat-tu',    icon: <AppstoreOutlined />,   label: 'Danh mục vật tư' },
  { key: '/kho-cong-trinh',     icon: <HomeOutlined />,       label: 'Vị trí tập kết & Công trình' },
  { type: 'divider' },
  { key: '/gia-cong',           icon: <SwapOutlined />,       label: 'Phiếu gia công/mua mới' },
  { key: '/lenh-dieu-chuyen',   icon: <SwapOutlined />,       label: 'Lệnh điều chuyển' },
  { key: '/xuat-kho',           icon: <UploadOutlined />,     label: 'Phiếu xuất' },
  { key: '/nhap-kho',           icon: <DownloadOutlined />,   label: 'Phiếu nhập' },
  { key: '/kiem-ke',            icon: <AuditOutlined />,      label: 'Kiểm kê' },
  { type: 'divider' },
  { key: '/bao-cao',            icon: <BarChartOutlined />,   label: 'Báo cáo' },
  { key: '/danh-muc-he-thong',  icon: <SettingOutlined />,    label: 'Danh mục hệ thống' },
]

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const { fetchKho, fetchNhom, fetchDvt } = useMasterStore()
  
  useEffect(() => {
    fetchKho()
    fetchNhom()
    fetchDvt()
  }, [fetchKho, fetchNhom, fetchDvt])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── SIDEBAR ── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={230}
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100, overflow: 'auto' }}
      >
        {/* Logo / Tên hệ thống */}
        <div style={{
          padding: collapsed ? '16px 8px' : '16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 8,
        }}>
          {!collapsed && (
            <>
              <Text strong style={{ color: '#fff', fontSize: 13, display: 'block', lineHeight: 1.3 }}>
                QL VẬT TƯ THI CÔNG
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                XDGT Phương Thành
              </Text>
            </>
          )}
          {collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 16 }}>PT</Text>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      {/* ── MAIN AREA ── */}
      <Layout style={{ marginLeft: collapsed ? 80 : 230, transition: 'margin-left 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div>
            <Breadcrumb style={{ margin: '16px 0' }}>
              <Breadcrumb.Item><HomeOutlined /></Breadcrumb.Item>
              <Breadcrumb.Item>
                {menuItems.find(m => m.key === location.pathname)?.label || 'Quản lý vật tư'}
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Text style={{ color: '#666', fontSize: 13, display: 'none' }}>
              🏗️ CÔNG TY CỔ PHẦN ĐTXD GIAO THÔNG PHƯƠNG THÀNH
            </Text>
            <Badge count={2} size="small">
              <Button type="text" icon={<BellOutlined style={{ fontSize: 18, color: '#666' }} />} />
            </Badge>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
              <Text strong style={{ color: '#333' }}>Admin</Text>
            </Space>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ margin: '16px 16px 0', minHeight: 280 }}>
          {children}
        </Content>

        <Footer style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: 12 }}>
          Hệ thống Quản lý Vật tư Thi công © 2026
        </Footer>
      </Layout>
    </Layout>
  )
}
