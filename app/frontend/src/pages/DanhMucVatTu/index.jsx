import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Input, Select, Button, Tag, Space, Modal, Form,
  Row, Col, message, Tooltip, Typography, Card,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ImportOutlined,
} from '@ant-design/icons'
import { vatTuApi } from '../../services/api'
import { useMasterStore } from '../../store/masterStore'

const { Text } = Typography
const { Option } = Select

const TINH_CHAT_OPTIONS = [
  { value: 'hang_hoa', label: 'Hàng hóa' },
  { value: 'ccdc', label: 'Công cụ dụng cụ' },
]

export default function DanhMucVatTu() {
  const [data, setData] = useState({ total: 0, items: [] })
  const { nhomList, dvtList } = useMasterStore()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [search, setSearch] = useState('')
  const [nhomFilter, setNhomFilter] = useState(null)
  const [tinhChatFilter, setTinhChatFilter] = useState(null)
  const [dvtFilter, setDvtFilter] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search !== searchTerm) {
        setSearch(searchTerm)
        setPagination(p => ({ ...p, current: 1 }))
      }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const skip = (pagination.current - 1) * pagination.pageSize
      const res = await vatTuApi.getList({
        skip,
        limit: pagination.pageSize,
        search: search || undefined,
        nhom_id: nhomFilter || undefined,
        tinh_chat: tinhChatFilter || undefined,
        dvt_id: dvtFilter || undefined,
      })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [pagination, search, nhomFilter, tinhChatFilter, dvtFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTableChange = (pag) => setPagination({ current: pag.current, pageSize: pag.pageSize })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await vatTuApi.update(editingId, values)
        message.success('Cập nhật vật tư thành công!')
      } else {
        await vatTuApi.create(values)
        message.success('Thêm vật tư thành công!')
      }
      setModalOpen(false)
      form.resetFields()
      setEditingId(null)
      fetchData()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const handleEdit = (record) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa vật tư?',
      content: 'Bạn có chắc chắn muốn xóa vật tư này? Vật tư bị xóa sẽ bị ẩn đi.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await vatTuApi.delete(id)
          message.success('Xóa vật tư thành công!')
          fetchData()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
        }
      }
    })
  }

  // Hàm loại bỏ dấu tiếng Việt để highlight khớp cả khi gõ không dấu
  const removeAccents = (str) => {
    if (!str) return ''
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  }

  const highlightText = (text, highlight) => {
    if (!highlight || !text) return text
    const str = String(text)
    const terms = highlight.trim().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return text

    // Tìm index của các từ khóa (so sánh không dấu)
    const strNoAccent = removeAccents(str).toLowerCase()
    const matchRanges = []
    
    terms.forEach(term => {
      const termNoAccent = removeAccents(term).toLowerCase()
      let startIndex = 0
      while ((startIndex = strNoAccent.indexOf(termNoAccent, startIndex)) > -1) {
        matchRanges.push({ start: startIndex, end: startIndex + termNoAccent.length })
        startIndex += termNoAccent.length
      }
    })

    if (matchRanges.length === 0) return text

    // Hợp nhất các ranges bị trùng lặp
    matchRanges.sort((a, b) => a.start - b.start)
    const mergedRanges = [matchRanges[0]]
    for (let i = 1; i < matchRanges.length; i++) {
      const prev = mergedRanges[mergedRanges.length - 1]
      const curr = matchRanges[i]
      if (curr.start <= prev.end) {
        prev.end = Math.max(prev.end, curr.end)
      } else {
        mergedRanges.push(curr)
      }
    }

    const parts = []
    let lastEnd = 0
    mergedRanges.forEach(range => {
      if (range.start > lastEnd) {
        parts.push(str.substring(lastEnd, range.start))
      }
      parts.push(<mark key={range.start} style={{ backgroundColor: '#fffb8f', padding: 0 }}>{str.substring(range.start, range.end)}</mark>)
      lastEnd = range.end
    })
    if (lastEnd < str.length) parts.push(str.substring(lastEnd))

    return parts
  }

  const columns = [
    {
      title: 'Mã hàng', dataIndex: 'ma_hang', width: 130, fixed: 'left',
      render: v => <Text code style={{ fontSize: 12 }}>{highlightText(v, search)}</Text>,
    },
    { title: 'Tên & quy cách vật tư', dataIndex: 'ten_hang', ellipsis: true, minWidth: 250, render: v => highlightText(v, search) },
    {
      title: 'Nhóm VT', dataIndex: ['nhom', 'ma_nhom'], width: 80,
      render: v => v ? <Tag>{v}</Tag> : '—',
    },
    {
      title: 'Tính chất', dataIndex: 'tinh_chat', width: 130,
      render: v => v === 'ccdc'
        ? <Tag color="purple">Công cụ DC</Tag>
        : <Tag color="blue">Hàng hóa</Tag>,
    },
    {
      title: 'ĐVT chính', dataIndex: ['dvt', 'ten'], width: 90,
      render: v => v || '—',
    },
    { title: 'ĐVT phụ', dataIndex: 'dvt_phu', width: 90, render: v => v || '—' },
    {
      title: 'Tỷ lệ quy đổi', width: 130,
      render: (_, r) => r.ty_le_quy_doi
        ? `1 ${r.dvt_phu || 'đơn vị'} = ${r.ty_le_quy_doi} ${r.dvt?.ten || 'Kg'}`
        : '—',
    },
    {
      title: 'Thao tác', width: 100, fixed: 'right',
      render: (_, r) => (
        <Space size="middle">
          <Tooltip title="Sửa">
            <Button size="small" type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(r)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button size="small" type="text" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} onClick={() => handleDelete(r.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      title={
        <Space>
          <Text strong>📦 Danh mục vật tư hàng hóa</Text>
          <Tag color="blue">{data.total?.toLocaleString()} mặt hàng</Tag>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditingId(null); setModalOpen(true); form.resetFields() }}>
            Thêm mới
          </Button>
        </Space>
      }
    >
      {/* ── BỘ LỌC ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={12}>
          <Col flex="auto">
            <Input
              placeholder="🔍 Tìm theo mã hàng hoặc tên vật tư..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col style={{ width: 140 }}>
            <Select
              placeholder="Tính chất"
              allowClear
              style={{ width: '100%' }}
              value={tinhChatFilter}
              onChange={v => { setTinhChatFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            >
              {TINH_CHAT_OPTIONS.map(o => (
                <Option key={o.value} value={o.value}>{o.label}</Option>
              ))}
            </Select>
          </Col>
          <Col style={{ width: 140 }}>
            <Select
              placeholder="Đơn vị tính"
              allowClear
              style={{ width: '100%' }}
              value={dvtFilter}
              onChange={v => { setDvtFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            >
              {dvtList.map(d => (
                <Option key={d.id} value={d.id}>{d.ten}</Option>
              ))}
            </Select>
          </Col>
          <Col style={{ width: 220 }}>
            <Select
              placeholder="Lọc theo nhóm vật tư"
              allowClear
              style={{ width: '100%' }}
              value={nhomFilter}
              onChange={v => { setNhomFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            >
              {nhomList.map(n => (
                <Option key={n.id} value={n.id}>{n.ma_nhom} – {n.ten_nhom}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      {/* ── BẢNG DỮ LIỆU ── */}
      <Table
        dataSource={data.items}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        size="small"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data.total,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100, 200],
          showTotal: (t, r) => `${r[0]}–${r[1]} / ${t.toLocaleString()} mặt hàng`,
        }}
        onChange={handleTableChange}
      />

      {/* ── MODAL THÊM/SỬA ── */}
      <Modal
        title={editingId ? "Sửa vật tư" : "Thêm vật tư mới"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null) }}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ma_hang" label="Mã hàng" rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: 251052015" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tinh_chat" label="Tính chất" initialValue="hang_hoa">
                <Select>
                  {TINH_CHAT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ten_hang" label="Tên & quy cách" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Thép hộp 100x50 t=2.0mm L=4.0m" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="nhom_id" label="Nhóm vật tư">
                <Select placeholder="Chọn nhóm" allowClear showSearch
                  filterOption={(input, opt) => opt.children?.toLowerCase().includes(input.toLowerCase())}
                >
                  {nhomList.map(n => <Option key={n.id} value={n.id}>{n.ma_nhom} – {n.ten_nhom}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dvt_id" label="ĐVT chính (thường là Kg)">
                <Select placeholder="Chọn ĐVT" allowClear>
                  {dvtList.map(d => <Option key={d.id} value={d.id}>{d.ten}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="dvt_phu" label="ĐVT phụ">
                <Input placeholder="Thanh, Tấm, Cái..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ty_le_quy_doi" label="Tỷ lệ (→ ĐVT chính)">
                <Input type="number" placeholder="Ví dụ: 6.84" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phep_tinh" label="Phép tính" initialValue="nhan">
                <Select>
                  <Option value="nhan">× Nhân</Option>
                  <Option value="chia">÷ Chia</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="mo_ta" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
