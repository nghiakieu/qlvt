import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, message, Tag, Card, Row, Col, Typography, InputNumber, Divider, Alert,
  Drawer, Descriptions, Tooltip
} from 'antd'
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, WarningOutlined, PrinterOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { printPhieu } from '../../utils/print'
import { xuatKhoApi } from '../../services/api'
import { useMasterStore } from '../../store/masterStore'
import MaterialSelect from '../../components/MaterialSelect'
import { LOAI_XUAT, STATUS_COLOR, STATUS_LABEL } from '../../utils/constants'

const { Option } = Select
const { Text } = Typography

export default function XuatKho() {
  const [list, setList] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(false)
  const { khoList } = useMasterStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loaiXuat, setLoaiXuat] = useState('dieu_chuyen')
  const [chiTiet, setChiTiet] = useState([{ key: 0, vat_tu_id: null, so_luong: 0, so_luong_kg: 0 }])
  const [form] = Form.useForm()
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState(null)
  // Filters
  const [filterLoai, setFilterLoai] = useState(null)
  const [filterKho, setFilterKho] = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)
  
  const khoXuatId = Form.useWatch('kho_xuat_id', form)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (filterLoai) params.loai_xuat = filterLoai
      if (filterKho) params.kho_xuat_id = filterKho
      const res = await xuatKhoApi.getList(params)
      let items = res.data.items || []
      if (filterStatus) items = items.filter(i => i.trang_thai === filterStatus)
      setList({ ...res.data, items })
    } finally { setLoading(false) }
  }, [filterLoai, filterKho, filterStatus])

  useEffect(() => { fetchList() }, [fetchList])

  const handleVatTuChange = (idx, vtId, vtObj) => {
    const newCt = [...chiTiet]
    newCt[idx] = { ...newCt[idx], vat_tu_id: vtId, _vat_tu: vtObj }
    setChiTiet(newCt)
  }

  const handleSlChange = (idx, sl) => {
    const newCt = [...chiTiet]
    const vt = newCt[idx]._vat_tu
    newCt[idx].so_luong = sl || 0
    if (vt?.ty_le_quy_doi) {
      newCt[idx].so_luong_kg = vt.phep_tinh === 'chia' ? sl / vt.ty_le_quy_doi : sl * vt.ty_le_quy_doi
    }
    setChiTiet(newCt)
  }

  const addRow = () => setChiTiet(prev => [...prev, { key: prev.length, vat_tu_id: null, so_luong: 0, so_luong_kg: 0 }])
  const removeRow = (idx) => setChiTiet(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (chiTiet.every(c => !c.vat_tu_id)) { message.error('Vui lòng thêm ít nhất 1 vật tư!'); return }

      const data = {
        ...values,
        ngay_xuat: values.ngay_xuat.format('YYYY-MM-DD'),
        chi_tiet: chiTiet.filter(c => c.vat_tu_id).map(c => ({
          vat_tu_id: c.vat_tu_id,
          so_luong: c.so_luong,
          so_luong_kg: Math.round(c.so_luong_kg * 100) / 100,
          ghi_chu: c.ghi_chu,
        })),
      }
      
      if (editingId) {
        await xuatKhoApi.update(editingId, data)
        message.success('Cập nhật phiếu xuất thành công!')
      } else {
        await xuatKhoApi.create(data)
        message.success('Tạo phiếu xuất thành công!')
      }
      
      setModalOpen(false)
      form.resetFields()
      setEditingId(null)
      setChiTiet([{ key: 0, vat_tu_id: null, so_luong: 0, so_luong_kg: 0 }])
      fetchList()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
      else message.error('Có lỗi xảy ra')
    }
  }

  const handleEdit = async (id) => {
    try {
      const res = await xuatKhoApi.getDetail(id)
      const data = res.data
      setEditingId(data.id)
      setLoaiXuat(data.loai_xuat)
      form.setFieldsValue({
        ...data,
        ngay_xuat: dayjs(data.ngay_xuat),
      })
      const chiTietFormat = data.chi_tiet.map((ct, i) => ({
        key: i,
        vat_tu_id: ct.vat_tu_id,
        so_luong: ct.so_luong,
        so_luong_kg: ct.so_luong_kg,
        ghi_chu: ct.ghi_chu,
      }))
      setChiTiet(chiTietFormat.length ? chiTietFormat : [{ key: 0, vat_tu_id: null, so_luong: 0, so_luong_kg: 0 }])
      setModalOpen(true)
    } catch {
      message.error('Lỗi khi tải thông tin phiếu')
    }
  }

  const handleXacNhan = (id) => {
    Modal.confirm({
      title: 'Xác nhận phiếu xuất?',
      content: 'Sau khi xác nhận, tồn kho sẽ bị trừ và không thể sửa phiếu. Bạn có chắc chắn?',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await xuatKhoApi.xacNhan(id)
          message.success('Xác nhận xuất kho thành công!')
          fetchList()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
        }
      }
    })
  }

  const totalKg = chiTiet.reduce((s, c) => s + (c.so_luong_kg || 0), 0)

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa phiếu xuất?',
      content: 'Bạn có chắc chắn muốn xóa phiếu xuất nháp này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await xuatKhoApi.delete(id)
          message.success('Xóa phiếu thành công!')
          fetchList()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
        }
      }
    })
  }

  const columns = [
    { title: 'Số phiếu', dataIndex: 'so_phieu', width: 140, render: (v, r) => <a onClick={() => openDetail(r.id)}><Text code>{v}</Text></a> },
    {
      title: 'Loại xuất', dataIndex: 'loai_xuat', width: 180,
      render: v => { const o = LOAI_XUAT.find(x => x.value === v); return <Tag color={o?.color}>{o?.label || v}</Tag> },
    },
    { title: 'Ngày xuất', dataIndex: 'ngay_xuat', width: 110 },
    { title: 'Nơi xuất', dataIndex: ['kho_xuat', 'ten_kho'], ellipsis: true },
    { title: 'Nơi nhận / CT', dataIndex: ['kho_nhan', 'ten_kho'], ellipsis: true, render: v => v || '—' },
    { title: 'Số lệnh ĐĐ', dataIndex: 'so_lenh_dieu_dong', width: 130, render: v => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'trang_thai', width: 130,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Thao tác', width: 200, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={async () => {
            try {
              const res = await xuatKhoApi.getDetail(r.id)
              printPhieu(res.data, 'xuat')
            } catch (e) { message.error('Lỗi khi tải dữ liệu in') }
          }}>In</Button>
          {r.trang_thai === 'nhap' && (
            <>
              <Tooltip title="Xác nhận"><Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleXacNhan(r.id)} /></Tooltip>
              <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(r.id)} /></Tooltip>
              <Tooltip title="Xóa"><Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} /></Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

  const openDetail = async (id) => {
    try {
      const res = await xuatKhoApi.getDetail(id)
      setDetailData(res.data)
      setDetailOpen(true)
    } catch { message.error('Lỗi khi tải chi tiết phiếu') }
  }

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      title={<Space><Text strong>📤 Phiếu Xuất</Text><Tag color="orange">{list.total} phiếu</Tag></Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setModalOpen(true); form.resetFields(); setLoaiXuat('dieu_chuyen'); setChiTiet([{ key: 0 }]) }}>Tạo phiếu xuất</Button>}
    >
      {/* ── BỘ LỌC ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={12} align="middle">
          <Col style={{ width: 200 }}>
            <Select placeholder="Loại xuất" allowClear style={{ width: '100%' }}
              value={filterLoai} onChange={v => setFilterLoai(v)}>
              {LOAI_XUAT.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
          </Col>
          <Col style={{ width: 220 }}>
            <Select placeholder="Nơi xuất" allowClear showSearch style={{ width: '100%' }}
              value={filterKho} onChange={v => setFilterKho(v)}
              filterOption={(i, o) => o.children?.toLowerCase().includes(i.toLowerCase())}>
              {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
            </Select>
          </Col>
          <Col style={{ width: 150 }}>
            <Select placeholder="Trạng thái" allowClear style={{ width: '100%' }}
              value={filterStatus} onChange={v => setFilterStatus(v)}>
              <Option value="nhap">Nháp</Option>
              <Option value="xac_nhan">Đã xác nhận</Option>
            </Select>
          </Col>
        </Row>
      </div>

      <Table dataSource={list.items} columns={columns} rowKey="id" loading={loading}
        size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 20 }} />

      <Modal
        title={editingId ? "Sửa phiếu xuất" : "Tạo phiếu xuất"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null); setChiTiet([{ key: 0 }]) }}
        okText="Lưu phiếu" cancelText="Hủy" width={900} destroyOnClose
      >
        {loaiXuat === 'dieu_chuyen' && (
          <Alert
            message="Xuất điều chuyển sẽ tự động tạo Phiếu Điều Chuyển sau khi xác nhận."
            type="info" showIcon style={{ marginBottom: 12 }}
          />
        )}
        <Form form={form} layout="vertical" onValuesChange={(changed) => {
          if (changed.loai_xuat) setLoaiXuat(changed.loai_xuat)
        }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="loai_xuat" label="Loại xuất" rules={[{ required: true }]} initialValue="dieu_chuyen">
                <Select>{LOAI_XUAT.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngay_xuat" label="Ngày xuất" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="kho_xuat_id" label="Nơi xuất" rules={[{ required: true }]}>
                <Select placeholder="Chọn nơi xuất" showSearch
                  filterOption={(i, o) => o.children?.toLowerCase().includes(i.toLowerCase())}
                >
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            {loaiXuat === 'dieu_chuyen' && (
              <>
                <Col span={8}>
                  <Form.Item name="kho_nhan_id" label="Nơi nhận / Công trình" rules={[{ required: true }]}>
                    <Select placeholder="Chọn nơi nhận" showSearch
                      filterOption={(i, o) => o.children?.toLowerCase().includes(i.toLowerCase())}
                    >
                      {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="so_lenh_dieu_dong" label="Số lệnh điều động">
                    <Input placeholder="5872/CV-PT" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="bien_so_xe" label="Biển số xe">
                    <Input placeholder="51A-12345" />
                  </Form.Item>
                </Col>
              </>
            )}
            {loaiXuat === 'ban_thanh_ly' && (
              <Col span={12}>
                <Form.Item name="doi_tac_mua" label="Đơn vị nhận thanh lý / trả hàng">
                  <Input placeholder="Tên đơn vị nhận thanh lý / trả hàng" />
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="nguoi_giao" label="Người giao">
                <Input placeholder="Họ tên người giao" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nguoi_nhan" label="Người nhận">
                <Input placeholder="Họ tên người nhận" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain style={{ margin: '8px 0' }}>Chi tiết vật tư xuất</Divider>

          {chiTiet.map((ct, idx) => (
            <Row key={ct.key} gutter={8} align="middle" style={{ marginBottom: 6 }}>
              <Col span={9}>
                <MaterialSelect
                  placeholder="Chọn vật tư"
                  style={{ width: '100%' }}
                  value={ct.vat_tu_id}
                  onChange={(v, vt) => handleVatTuChange(idx, v, vt)}
                  khoId={khoXuatId}
                />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="Số lượng" style={{ width: '100%' }} min={0}
                  value={ct.so_luong} onChange={v => handleSlChange(idx, v)}
                  addonAfter={ct._vat_tu?.dvt_phu || 'SL'} />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="Kg" style={{ width: '100%' }} min={0}
                  value={Math.round((ct.so_luong_kg || 0) * 100) / 100}
                  onChange={v => { const nc = [...chiTiet]; nc[idx].so_luong_kg = v; setChiTiet(nc) }}
                  addonAfter="Kg" />
              </Col>
              <Col span={5}>
                <Input placeholder="Ghi chú" value={ct.ghi_chu}
                  onChange={e => { const nc = [...chiTiet]; nc[idx].ghi_chu = e.target.value; setChiTiet(nc) }} />
              </Col>
              <Col span={2}>
                <Button danger icon={<DeleteOutlined />} onClick={() => removeRow(idx)} />
              </Col>
            </Row>
          ))}

          <Space style={{ marginTop: 8 }}>
            <Button icon={<PlusOutlined />} onClick={addRow}>Thêm dòng</Button>
            <Text type="secondary">Tổng KL: <b>{totalKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Kg</b></Text>
          </Space>

          <Form.Item name="ghi_chu" label="Ghi chú phiếu" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── DRAWER XEM CHI TIẾT ── */}
      <Drawer
        title={`Chi tiết phiếu xuất: ${detailData?.so_phieu || ''}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={800}
        extra={
          <Button icon={<PrinterOutlined />} onClick={() => detailData && printPhieu(detailData, 'xuat')}>In phiếu</Button>
        }
      >
        {detailData && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Số phiếu"><Text strong>{detailData.so_phieu}</Text></Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_COLOR[detailData.trang_thai]}>{STATUS_LABEL[detailData.trang_thai]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Loại xuất">
                {LOAI_XUAT.find(x => x.value === detailData.loai_xuat)?.label || detailData.loai_xuat}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày xuất">{detailData.ngay_xuat}</Descriptions.Item>
              <Descriptions.Item label="Nơi xuất">{detailData.kho_xuat?.ten_kho || '—'}</Descriptions.Item>
              <Descriptions.Item label="Nơi nhận / CT">{detailData.kho_nhan?.ten_kho || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số lệnh ĐĐ">{detailData.so_lenh_dieu_dong || '—'}</Descriptions.Item>
              <Descriptions.Item label="Biển số xe">{detailData.bien_so_xe || '—'}</Descriptions.Item>
              <Descriptions.Item label="Người giao">{detailData.nguoi_giao || '—'}</Descriptions.Item>
              <Descriptions.Item label="Người nhận">{detailData.nguoi_nhan || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>{detailData.ghi_chu || '—'}</Descriptions.Item>
            </Descriptions>
            <Table
              dataSource={detailData.chi_tiet}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'STT', width: 50, render: (_, __, i) => i + 1 },
                { title: 'Mã hàng', dataIndex: ['vat_tu', 'ma_hang'], width: 120, render: v => <Text code>{v}</Text> },
                { title: 'Tên vật tư', dataIndex: ['vat_tu', 'ten_hang'], ellipsis: true },
                { title: 'ĐVT', dataIndex: ['vat_tu', 'dvt_phu'], width: 70, render: v => v || 'Kg' },
                {
                  title: 'Số lượng', dataIndex: 'so_luong', width: 100, align: 'right',
                  render: v => v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 }),
                },
                {
                  title: 'Khối lượng (Kg)', dataIndex: 'so_luong_kg', width: 130, align: 'right',
                  render: v => <Text strong style={{ color: '#1565C0' }}>{v?.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text>,
                },
                { title: 'Ghi chú', dataIndex: 'ghi_chu', width: 150, render: v => v || '—' },
              ]}
              summary={data => (
                <Table.Summary.Row style={{ background: '#fafafa' }}>
                  <Table.Summary.Cell colSpan={4}><Text strong>Tổng cộng</Text></Table.Summary.Cell>
                  <Table.Summary.Cell align="right">
                    <Text strong>{data.reduce((s, r) => s + (r.so_luong || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell align="right">
                    <Text strong style={{ color: '#1565C0' }}>
                      {data.reduce((s, r) => s + (r.so_luong_kg || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Kg
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell />
                </Table.Summary.Row>
              )}
            />
          </>
        )}
      </Drawer>
    </Card>
  )
}
