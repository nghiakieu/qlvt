import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, message, Tag, Card, Typography, InputNumber, Divider, Alert, Row, Col, Tooltip
} from 'antd'
import { PlusOutlined, CheckCircleOutlined, DeleteOutlined, PrinterOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { tonKhoApi, kiemKeApi } from '../../services/api'
import { useMasterStore } from '../../store/masterStore'
import { printKiemKe } from '../../utils/print'

const { Text } = Typography
const { Option } = Select

const STATUS_COLOR = { dang_kiem_ke: 'orange', hoan_thanh: 'green' }
const STATUS_LABEL = { dang_kiem_ke: 'Đang kiểm kê', hoan_thanh: 'Hoàn thành' }

export default function KiemKe() {
  const [list, setList] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(false)
  const { khoList } = useMasterStore()
  const [tonKhoItems, setTonKhoItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [chiTiet, setChiTiet] = useState([])
  const [form] = Form.useForm()
  
  // Filters
  const [filterKho, setFilterKho] = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (filterKho) params.kho_id = filterKho
      const res = await kiemKeApi.getList(params)
      let items = res.data.items || []
      if (filterStatus) items = items.filter(i => i.trang_thai === filterStatus)
      setList({ ...res.data, items })
    } finally { setLoading(false) }
  }, [filterKho, filterStatus])

  useEffect(() => { fetchList() }, [fetchList])

  // Khi chọn kho → load tồn kho của kho đó làm danh sách kiểm kê
  const handleKhoChange = async (khoId) => {
    const res = await tonKhoApi.getList({ kho_id: khoId, limit: 500 })
    const items = res.data.items.map(tk => ({
      key: tk.id,
      vat_tu_id: tk.vat_tu_id,
      _ten: tk.vat_tu?.ten_hang,
      vi_tri_id: tk.vi_tri_id,
      sl_so_sach: tk.so_luong,
      sl_so_sach_kg: tk.so_luong_kg,
      sl_thuc_te: tk.so_luong,  // Mặc định bằng sổ sách
      sl_thuc_te_kg: tk.so_luong_kg,
      ly_do: '',
    }))
    setChiTiet(items)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await kiemKeApi.create({
        ...values,
        ngay_kiem_ke: values.ngay_kiem_ke.format('YYYY-MM-DD'),
        chi_tiet: chiTiet.map(c => ({
          vat_tu_id: c.vat_tu_id,
          vi_tri_id: c.vi_tri_id,
          sl_thuc_te: c.sl_thuc_te,
          sl_thuc_te_kg: c.sl_thuc_te_kg,
          ly_do: c.ly_do,
        })),
      })
      message.success('Tạo phiếu kiểm kê thành công!')
      setModalOpen(false)
      form.resetFields()
      setChiTiet([])
      fetchList()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
    }
  }

  const handleDuyet = (id) => {
    Modal.confirm({
      title: 'Xác nhận duyệt phiếu kiểm kê?',
      content: 'Sau khi duyệt, tồn kho thực tế sẽ được cập nhật đè lên tồn kho sổ sách. Bạn có chắc chắn?',
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await kiemKeApi.duyet(id)
          message.success('Duyệt kiểm kê thành công! Tồn kho đã được cập nhật.')
          fetchList()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi')
        }
      }
    })
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa phiếu kiểm kê?',
      content: 'Bạn có chắc chắn muốn xóa phiếu kiểm kê này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await kiemKeApi.delete(id)
          message.success('Xóa phiếu thành công!')
          fetchList()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
        }
      }
    })
  }

  const columns = [
    { title: 'Số phiếu', dataIndex: 'so_phieu', width: 130, render: v => <Text code>{v}</Text> },
    { title: 'Ngày kiểm kê', dataIndex: 'ngay_kiem_ke', width: 120 },
    { title: 'Kho', dataIndex: ['kho', 'ten_kho'], ellipsis: true },
    { title: 'Mục đích', dataIndex: 'muc_dich', ellipsis: true, render: v => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'trang_thai', width: 130,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Thao tác', width: 180, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="In phiếu">
            <Button size="small" icon={<PrinterOutlined />} onClick={async () => {
              try {
                const res = await kiemKeApi.getDetail(r.id)
                printKiemKe(res.data)
              } catch (e) { message.error('Lỗi tải dữ liệu in') }
            }} />
          </Tooltip>
          {r.trang_thai === 'dang_kiem_ke' && (
            <>
              <Tooltip title="Duyệt"><Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleDuyet(r.id)} /></Tooltip>
              <Tooltip title="Xóa"><Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} /></Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

  const chenh_lech_items = chiTiet.filter(c => c.sl_thuc_te !== c.sl_so_sach)

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      title={<Space><Text strong>🔍 Kiểm Kê Kho</Text><Tag>{list.total} phiếu</Tag></Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Tạo phiếu kiểm kê</Button>}
    >
      {/* ── BỘ LỌC ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={12} align="middle">
          <Col style={{ width: 220 }}>
            <Select placeholder="Lọc theo kho" allowClear showSearch style={{ width: '100%' }}
              value={filterKho} onChange={v => setFilterKho(v)}
              filterOption={(i, o) => o.children?.toLowerCase().includes(i.toLowerCase())}>
              {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
            </Select>
          </Col>
          <Col style={{ width: 180 }}>
            <Select placeholder="Trạng thái" allowClear style={{ width: '100%' }}
              value={filterStatus} onChange={v => setFilterStatus(v)}>
              <Option value="dang_kiem_ke">Đang kiểm kê</Option>
              <Option value="hoan_thanh">Đã hoàn thành</Option>
            </Select>
          </Col>
        </Row>
      </div>

      <Table dataSource={list.items} columns={columns} rowKey="id" loading={loading}
        size="small" pagination={{ pageSize: 20 }} />

      <Modal
        title="Tạo phiếu kiểm kê"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); setChiTiet([]) }}
        okText="Lưu phiếu" cancelText="Hủy" width={1000} destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="kho_id" label="Chọn kho kiểm kê" rules={[{ required: true }]}>
                <Select placeholder="Chọn kho" showSearch onChange={handleKhoChange}
                  filterOption={(i, o) => o.children?.toLowerCase().includes(i.toLowerCase())}
                >
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngay_kiem_ke" label="Ngày kiểm kê" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="muc_dich" label="Mục đích">
                <Select placeholder="Chọn mục đích">
                  <Option value="dinh_ky">Kiểm kê định kỳ</Option>
                  <Option value="ket_thuc_ct">Kết thúc công trình</Option>
                  <Option value="dot_xuat">Kiểm kê đột xuất</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {chiTiet.length > 0 && (
          <>
            {chenh_lech_items.length > 0 && (
              <Text type="warning" style={{ display: 'block', marginBottom: 8 }}>
                ⚠️ {chenh_lech_items.length} vật tư có chênh lệch so với sổ sách
              </Text>
            )}
            <Table
              dataSource={chiTiet}
              rowKey="key"
              size="small"
              pagination={{ pageSize: 20 }}
              scroll={{ y: 350 }}
              rowClassName={r => r.sl_thuc_te !== r.sl_so_sach ? 'ant-table-row-warning' : ''}
              columns={[
                { title: 'Tên vật tư', dataIndex: '_ten', ellipsis: true },
                { title: 'Sổ sách (SL)', dataIndex: 'sl_so_sach', align: 'right', width: 110 },
                { title: 'Sổ sách (Kg)', dataIndex: 'sl_so_sach_kg', align: 'right', width: 110,
                  render: v => v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) },
                {
                  title: 'Thực tế (SL)', width: 130,
                  render: (_, r, idx) => (
                    <InputNumber size="small" style={{ width: '100%' }} min={0} value={r.sl_thuc_te}
                      onChange={v => { const nc = [...chiTiet]; nc[idx].sl_thuc_te = v; setChiTiet(nc) }}
                    />
                  ),
                },
                {
                  title: 'Chênh lệch', width: 100, align: 'right',
                  render: (_, r) => {
                    const cl = r.sl_thuc_te - r.sl_so_sach
                    if (cl === 0) return <Text type="secondary">Đủ</Text>
                    return <Text type={cl < 0 ? 'danger' : 'success'}>{cl > 0 ? '+' : ''}{cl}</Text>
                  },
                },
                {
                  title: 'Lý do', width: 150,
                  render: (_, r, idx) => r.sl_thuc_te !== r.sl_so_sach ? (
                    <input placeholder="Nhập lý do..." style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 8px', width: '100%', fontSize: 12 }}
                      value={r.ly_do}
                      onChange={e => { const nc = [...chiTiet]; nc[idx].ly_do = e.target.value; setChiTiet(nc) }}
                    />
                  ) : null,
                },
              ]}
            />
          </>
        )}
      </Modal>
    </Card>
  )
}
