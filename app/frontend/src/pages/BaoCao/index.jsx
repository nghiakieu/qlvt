import React, { useEffect, useState, useCallback } from 'react'
import {
  Tabs, Table, Card, Space, Typography, Button, Select, Tag, Spin, Row, Col, DatePicker, message, Input
} from 'antd'
import { useLocation } from 'react-router-dom'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { baoCaoApi, masterApi } from '../../services/api'

const { Text, Title } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

// Xuất Excel đơn giản bằng cách mở API URL
const exportExcel = (url) => window.open(url, '_blank')

export default function BaoCao() {
  const [tonKhoData, setTonKhoData] = useState([])
  const [ctData, setCtData] = useState([])
  const [nxtData, setNxtData] = useState([])
  const [loading, setLoading] = useState(false)
  const [khoList, setKhoList] = useState([])
  const [nhomList, setNhomList] = useState([])
  
  // Tồn kho tổng hợp
  const [khoFilter, setKhoFilter] = useState([])
  const [nhomFilter, setNhomFilter] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Tồn kho công trình
  const [ctSearch, setCtSearch] = useState('')

  // Nhập xuất tồn
  const [nxtKho, setNxtKho] = useState(null)
  const [nxtDates, setNxtDates] = useState([dayjs().startOf('month'), dayjs().endOf('month')])

  const location = useLocation()

  useEffect(() => {
    masterApi.getKho().then(r => setKhoList(r.data))
    masterApi.getNhomVatTu().then(r => setNhomList(r.data))
    
    // Check if we came from another page with a specific khoId
    const initKhoId = location.state?.khoId
    if (initKhoId) {
      setKhoFilter([initKhoId])
      loadTonKho([initKhoId], null, '')
    } else {
      loadTonKho()
    }
    
    loadCongTrinh()
  }, [])

  const loadTonKho = async (khoIds, nhomId, searchStr) => {
    setLoading(true)
    try {
      const params = {}
      if (khoIds?.length) params.kho_ids = khoIds.join(',')
      if (nhomId) params.nhom_id = nhomId
      if (searchStr) params.search = searchStr
      const res = await baoCaoApi.tongHopTonKho(params)
      setTonKhoData(res.data.data)
    } finally { setLoading(false) }
  }

  const loadCongTrinh = async (search = '') => {
    setLoading(true)
    try {
      const res = await baoCaoApi.tonKhoCongTrinh({ search })
      setCtData(res.data)
    } finally { setLoading(false) }
  }

  const handleFilter = () => loadTonKho(khoFilter, nhomFilter, searchTerm)
  const handleCtFilter = () => loadCongTrinh(ctSearch)

  const loadNxt = async () => {
    if (!nxtDates || !nxtDates[0] || !nxtDates[1]) {
      return message.warning('Vui lòng chọn khoảng thời gian')
    }
    setLoading(true)
    try {
      const res = await baoCaoApi.nhapXuatTon({
        tu_ngay: nxtDates[0].format('YYYY-MM-DD'),
        den_ngay: nxtDates[1].format('YYYY-MM-DD'),
        kho_id: nxtKho || undefined
      })
      setNxtData(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  const handleNxtExport = async () => {
    if (!nxtDates || !nxtDates[0] || !nxtDates[1]) {
      return message.warning('Vui lòng chọn khoảng thời gian')
    }
    setLoading(true)
    try {
      const params = {
        tu_ngay: nxtDates[0].format('YYYY-MM-DD'),
        den_ngay: nxtDates[1].format('YYYY-MM-DD'),
      }
      if (nxtKho) params.kho_id = nxtKho
      
      const res = await baoCaoApi.exportNxt(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Bao_Cao_NXT_${dayjs().format('YYYYMMDD')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      message.error('Lỗi khi xuất file Excel')
    } finally { setLoading(false) }
  }

  // Group dữ liệu theo kho
  const groupedByKho = tonKhoData.reduce((acc, row) => {
    const key = `${row.ma_kho} – ${row.ten_kho}`
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const tonKhoColumns = [
    { title: 'Mã hàng', dataIndex: 'ma_hang', width: 130, render: v => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: 'Tên vật tư', dataIndex: 'ten_hang', ellipsis: true },
    { title: 'ĐVT', dataIndex: 'dvt', width: 70 },
    {
      title: 'Tồn (SL)', dataIndex: 'ton_sl', width: 100, align: 'right',
      render: v => v > 0 ? <Text strong>{v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text>
        : <Text type="secondary">0</Text>,
    },
    {
      title: 'Tồn (Kg)', dataIndex: 'ton_kg', width: 120, align: 'right',
      render: v => v > 0 ? <Text strong style={{ color: '#1565C0' }}>{v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text>
        : <Text type="secondary">0</Text>,
    },
  ]

  const ctColumns = [
    { title: 'Công trình / Kho', dataIndex: 'cong_trinh', width: 200, ellipsis: true },
    { title: 'Mã hàng', dataIndex: 'ma_hang', width: 120 },
    { title: 'Tên vật tư', dataIndex: 'ten_hang', ellipsis: true },
    { title: 'ĐVT', dataIndex: 'dvt', width: 70 },
    {
      title: 'Tồn (SL)', dataIndex: 'ton_sl', width: 100, align: 'right',
      render: v => v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 }),
    },
    {
      title: 'Tồn (Kg)', dataIndex: 'ton_kg', width: 120, align: 'right',
      render: v => <Text style={{ color: '#1565C0' }}>{v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text>,
    },
  ]

  const nxtColumns = [
    { title: 'Mã hàng', dataIndex: 'ma_hang', width: 100, fixed: 'left' },
    { title: 'Tên vật tư', dataIndex: 'ten_hang', width: 200, fixed: 'left', ellipsis: true },
    { title: 'ĐVT', dataIndex: 'dvt', width: 60, fixed: 'left' },
    {
      title: 'Tồn đầu', children: [
        { title: 'SL', dataIndex: 'dau_sl', width: 80, align: 'right', render: v => v ? v.toLocaleString('vi-VN') : '—' },
        { title: 'Kg', dataIndex: 'dau_kg', width: 90, align: 'right', render: v => v ? v.toLocaleString('vi-VN') : '—' },
      ]
    },
    {
      title: 'Nhập trong kỳ', children: [
        { title: 'SL', dataIndex: 'nhap_sl', width: 80, align: 'right', render: v => v ? v.toLocaleString('vi-VN') : '—' },
        { title: 'Kg', dataIndex: 'nhap_kg', width: 90, align: 'right', render: v => v ? v.toLocaleString('vi-VN') : '—' },
      ]
    },
    {
      title: 'Xuất trong kỳ', children: [
        { title: 'SL', dataIndex: 'xuat_sl', width: 80, align: 'right', render: v => v ? v.toLocaleString('vi-VN') : '—' },
        { title: 'Kg', dataIndex: 'xuat_kg', width: 90, align: 'right', render: v => v ? v.toLocaleString('vi-VN') : '—' },
      ]
    },
    {
      title: 'Tồn cuối', children: [
        { title: 'SL', dataIndex: 'cuoi_sl', width: 80, align: 'right', render: v => <Text strong>{v ? v.toLocaleString('vi-VN') : '—'}</Text> },
        { title: 'Kg', dataIndex: 'cuoi_kg', width: 90, align: 'right', render: v => <Text strong style={{ color: '#1565C0' }}>{v ? v.toLocaleString('vi-VN') : '—'}</Text> },
      ]
    }
  ]

  const items = [
    {
      key: 'tong-hop',
      label: '📊 Tổng hợp tồn kho',
      children: (
        <div>
          {/* BỘ LỌC */}
          <Card size="small" style={{ marginBottom: 12 }}>
            <Row gutter={12} align="middle">
              <Col flex="auto">
                <Input
                  placeholder="🔍 Tìm theo mã hàng hoặc tên vật tư..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onPressEnter={handleFilter}
                  allowClear
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col style={{ width: 250 }}>
                <Select
                  mode="multiple" placeholder="Lọc theo kho (tất cả nếu bỏ trống)"
                  style={{ width: '100%' }} value={khoFilter}
                  onChange={setKhoFilter} allowClear
                >
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Col>
              <Col style={{ width: 250 }}>
                <Select placeholder="Lọc theo nhóm VT" style={{ width: '100%' }}
                  value={nhomFilter} onChange={setNhomFilter} allowClear
                >
                  {nhomList.map(n => <Option key={n.id} value={n.id}>{n.ma_nhom} – {n.ten_nhom}</Option>)}
                </Select>
              </Col>
              <Col>
                <Space>
                  <Button type="primary" onClick={handleFilter} loading={loading}>Xem báo cáo</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => {
                    const params = new URLSearchParams()
                    if (khoFilter?.length) params.append('kho_ids', khoFilter.join(','))
                    if (nhomFilter) params.append('nhom_id', nhomFilter)
                    window.open(`/api/v1/bao-cao/export-excel?${params.toString()}`, '_blank')
                  }}>
                    Xuất Excel
                  </Button>
                </Space>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tonKhoData.length.toLocaleString()} dòng |{' '}
                  Tổng KL: <b>{tonKhoData.reduce((s, r) => s + (r.ton_kg || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} Kg</b>
                </Text>
              </Col>
            </Row>
          </Card>

          {/* BẢNG THEO TỪNG KHO */}
          <Spin spinning={loading}>
            {Object.entries(groupedByKho).map(([khoName, rows]) => (
              <Card
                key={khoName} size="small" title={
                  <Space>
                    <Tag color="blue">{rows[0].ma_kho}</Tag>
                    <Text strong>{rows[0].ten_kho}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({rows.length} mặt hàng | {rows.reduce((s, r) => s + (r.ton_kg || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} Kg)
                    </Text>
                  </Space>
                }
                style={{ marginBottom: 12 }}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  dataSource={rows} columns={tonKhoColumns} rowKey="ma_hang"
                  size="small" pagination={{ pageSize: 50, showSizeChanger: true }}
                  summary={rows => (
                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                      <Table.Summary.Cell colSpan={3}><Text strong>Tổng kho</Text></Table.Summary.Cell>
                      <Table.Summary.Cell align="right">
                        <Text strong>{rows.reduce((s, r) => s + (r.ton_sl || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="right">
                        <Text strong style={{ color: '#1565C0' }}>
                          {rows.reduce((s, r) => s + (r.ton_kg || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Kg
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            ))}
          </Spin>
        </div>
      ),
    },
    {
      key: 'cong-trinh',
      label: '🏗️ Tồn kho theo công trình',
      children: (
        <Card styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <Row gutter={12}>
              <Col span={8}>
                <Input
                  placeholder="Tìm theo vật tư, mã vật tư, kho, tên công trình..."
                  value={ctSearch} onChange={e => setCtSearch(e.target.value)}
                  onPressEnter={handleCtFilter}
                  allowClear
                />
              </Col>
              <Col>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleCtFilter} loading={loading}>
                  Tìm kiếm
                </Button>
              </Col>
            </Row>
          </div>
          <Table
            dataSource={ctData} columns={ctColumns} rowKey={(r, i) => i}
            size="small" pagination={{ pageSize: 50, showSizeChanger: true }}
            summary={data => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={5}><Text strong>Tổng (tất cả CT)</Text></Table.Summary.Cell>
                <Table.Summary.Cell align="right">
                  <Text strong style={{ color: '#1565C0' }}>
                    {data.reduce((s, r) => s + (r.ton_kg || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} Kg
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'nxt',
      label: '🗓️ Nhập - Xuất - Tồn',
      children: (
        <div>
          <Card size="small" style={{ marginBottom: 12 }}>
            <Row gutter={12} align="middle">
              <Col style={{ width: 250 }}>
                <RangePicker 
                  style={{ width: '100%' }}
                  value={nxtDates} 
                  onChange={setNxtDates}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              </Col>
              <Col style={{ width: 300 }}>
                <Select
                  placeholder="Lọc theo kho (tất cả nếu bỏ trống)"
                  style={{ width: '100%' }} value={nxtKho}
                  onChange={setNxtKho} allowClear
                >
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Col>
              <Col>
                <Button type="primary" icon={<SearchOutlined />} onClick={loadNxt} loading={loading}>
                  Xem báo cáo
                </Button>
              </Col>
              <Col>
                <Button icon={<DownloadOutlined />} onClick={handleNxtExport} loading={loading}>
                  Xuất Excel
                </Button>
              </Col>
            </Row>
          </Card>
          
          <Card styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={nxtData} columns={nxtColumns} rowKey="ma_hang"
              size="small" scroll={{ x: 1200 }}
              loading={loading}
              pagination={{ pageSize: 50, showSizeChanger: true }}
              bordered
            />
          </Card>
        </div>
      ),
    }
  ]

  return (
    <Card title="📈 Báo cáo" styles={{ body: { padding: '0 0 16px 0' } }}>
      <Tabs items={items} style={{ padding: '0 16px' }} />
    </Card>
  )
}
