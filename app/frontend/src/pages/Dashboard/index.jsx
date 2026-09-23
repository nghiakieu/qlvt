import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Spin, Typography, message, Alert, List, Badge } from 'antd'
import { InboxOutlined, AppstoreOutlined, DownloadOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { masterApi, tonKhoApi, dashboardApi } from '../../services/api'

const { Title, Text } = Typography

// Màu sắc theo loại kho
const loaiKhoColor = { trung_tam: '#1565C0', cong_trinh: '#2E7D32' }
const loaiKhoLabel = { trung_tam: 'Kho trung tâm', cong_trinh: 'Kho công trình' }

export default function Dashboard() {
  const [khoList, setKhoList] = useState([])
  const [tonKho, setTonKho] = useState({ total: 0, items: [] })
  const [summary, setSummary] = useState({ tong_vat_tu: 0, tong_kho: 0, phieu_nhap_thang: 0, phieu_xuat_thang: 0, chart_data: [], top_ton_kho: [], canh_bao: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      masterApi.getKho(),
      tonKhoApi.getList({ limit: 10 }),
      dashboardApi.getSummary()
    ]).then(([khoRes, tonRes, sumRes]) => {
      setKhoList(khoRes.data)
      setTonKho(tonRes.data)
      setSummary(sumRes.data)
    }).catch(err => {
      console.error(err)
      message.error("Lỗi khi tải dữ liệu tổng quan")
    }).finally(() => setLoading(false))
  }, [])

  // Tổng hợp theo loại kho
  const khoTrungTam = khoList.filter(k => k.loai_kho === 'trung_tam').length
  const khoCongTrinh = khoList.filter(k => k.loai_kho === 'cong_trinh').length

  const khoColumns = [
    { title: 'Mã kho', dataIndex: 'ma_kho', width: 80, render: v => <Tag color="blue">{v}</Tag> },
    { title: 'Tên kho', dataIndex: 'ten_kho', ellipsis: true },
    {
      title: 'Loại', dataIndex: 'loai_kho', width: 130,
      render: v => <Tag color={loaiKhoColor[v]}>{loaiKhoLabel[v]}</Tag>
    },
    { title: 'Địa chỉ', dataIndex: 'dia_chi', ellipsis: true, render: v => v || '—' },
  ]

  const cardStyle = {
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    height: '100%',
    border: 'none',
  }
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: '#1A3A5C' }}>📊 Tổng quan hệ thống</Title>
        <Text type="secondary">Năm {new Date().getFullYear()} — Cập nhật theo thời gian thực</Text>
      </div>

      {/* ── KPI CARDS ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
            <Statistic
              title="Tổng vật tư"
              value={summary.tong_vat_tu}
              prefix={<AppstoreOutlined style={{ color: '#1565C0' }} />}
              valueStyle={{ color: '#1565C0' }}
              suffix="mặt hàng"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
            <Statistic
              title="Kho hoạt động"
              value={summary.tong_kho}
              prefix={<InboxOutlined style={{ color: '#2E7D32' }} />}
              valueStyle={{ color: '#2E7D32' }}
              suffix={`kho (${khoCongTrinh} CT)`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
            <Statistic
              title="Nhập kho (tháng này)"
              value={summary.phieu_nhap_thang}
              prefix={<DownloadOutlined style={{ color: '#E65100' }} />}
              valueStyle={{ color: '#E65100' }}
              suffix="phiếu"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
            <Statistic
              title="Xuất kho (tháng này)"
              value={summary.phieu_xuat_thang}
              prefix={<UploadOutlined style={{ color: '#6A1B9A' }} />}
              valueStyle={{ color: '#6A1B9A' }}
              suffix="phiếu"
            />
          </Card>
        </Col>
      </Row>

      {/* ── BIỂU ĐỒ + BẢNG KHO ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="📈 Nhập / Xuất 6 tháng gần nhất (Kg)" style={cardStyle}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.chart_data}>
                <XAxis dataKey="thang" />
                <YAxis />
                <Tooltip formatter={(v) => `${v.toLocaleString()} Kg`} />
                <Legend />
                <Bar dataKey="nhap" name="Nhập" fill="#1565C0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="xuat" name="Xuất" fill="#E65100" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="🏆 Top 5 Vật tư tồn nhiều nhất (Kg)" style={cardStyle}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={summary.top_ton_kho}
                  dataKey="kg"
                  nameKey="ten"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {summary.top_ton_kho.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v.toLocaleString()} Kg`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<><WarningOutlined style={{ color: '#faad14' }} /> Cảnh báo tồn kho (Dưới 50kg)</>}
            style={cardStyle}
          >
            {summary.canh_bao?.length > 0 ? (
              <List
                size="small"
                dataSource={summary.canh_bao}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text mark>[Sắp hết]</Typography.Text> {item.ten} - <Text type="danger" strong>{item.kg.toLocaleString()} Kg</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Alert message="Tuyệt vời! Không có vật tư nào sắp hết hàng." type="success" showIcon />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="🏗️ Danh sách kho đang hoạt động"
            style={cardStyle}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={khoList.slice(0, 8)}
              columns={khoColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 220 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── TỒN KHO HIỆN TẠI ── */}
      <Card
        title={`📦 Tồn kho hiện tại — ${tonKho.total?.toLocaleString()} dòng`}
        style={cardStyle}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={tonKho.items}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { title: 'Kho', dataIndex: ['kho', 'ten_kho'], width: 180, ellipsis: true },
            { title: 'Mã hàng', dataIndex: ['vat_tu', 'ma_hang'], width: 120 },
            { title: 'Tên vật tư', dataIndex: ['vat_tu', 'ten_hang'], ellipsis: true },
            { title: 'ĐVT', dataIndex: ['vat_tu', 'dvt_phu'], width: 70, render: v => v || 'Kg' },
            {
              title: 'Tồn (SL)', dataIndex: 'so_luong', width: 90, align: 'right',
              render: v => v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
            },
            {
              title: 'Tồn (Kg)', dataIndex: 'so_luong_kg', width: 110, align: 'right',
              render: v => v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
            },
          ]}
          footer={() => (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Hiển thị 10 dòng đầu — Xem toàn bộ tại Báo cáo → Tổng hợp tồn kho
            </Text>
          )}
        />
      </Card>
    </Spin>
  )
}

// trigger rebuild