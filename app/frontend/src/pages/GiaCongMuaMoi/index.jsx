import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, message, Tag, Card, Row, Col, Typography, InputNumber, Divider, Tooltip, Badge
} from 'antd'
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, EyeOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { giaCongApi } from '../../services/api'
import { useMasterStore } from '../../store/masterStore'
import MaterialSelect from '../../components/MaterialSelect'
import { STATUS_COLOR, STATUS_LABEL } from '../../utils/constants'

const { Option } = Select
const { Text } = Typography

export default function GiaCongMuaMoi() {
  const [list, setList] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(false)
  const { khoList } = useMasterStore()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [chiTiet, setChiTiet] = useState([{ key: 0, vat_tu_id: null, so_luong: 0, so_luong_kg: 0 }])
  const [form] = Form.useForm()

  const [nhapModalOpen, setNhapModalOpen] = useState(false)
  const [phieuGcId, setPhieuGcId] = useState(null)
  const [nhapChiTiet, setNhapChiTiet] = useState([])
  const [nhapForm] = Form.useForm()

  const [tinhHinhOpen, setTinhHinhOpen] = useState(false)
  const [tinhHinhData, setTinhHinhData] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await giaCongApi.getList({ limit: 50 })
      setList(res.data)
    } finally { setLoading(false) }
  }, [])

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
        ngay_tao: values.ngay_tao.format('YYYY-MM-DD'),
        chi_tiet: chiTiet.filter(c => c.vat_tu_id).map(c => ({
          vat_tu_id: c.vat_tu_id,
          so_luong: c.so_luong,
          so_luong_kg: Math.round(c.so_luong_kg * 100) / 100,
          ghi_chu: c.ghi_chu,
        })),
      }
      
      if (editingId) {
        await giaCongApi.update(editingId, data)
        message.success('Cập nhật phiếu thành công!')
      } else {
        await giaCongApi.create(data)
        message.success('Tạo phiếu thành công!')
      }
      
      setModalOpen(false)
      fetchList()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const handleEdit = async (id) => {
    try {
      const res = await giaCongApi.getDetail(id)
      const data = res.data
      setEditingId(data.id)
      form.setFieldsValue({
        ...data,
        ngay_tao: dayjs(data.ngay_tao),
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
    } catch { message.error('Lỗi tải phiếu') }
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa phiếu gia công/mua mới?',
      okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
      onOk: async () => {
        try {
          await giaCongApi.delete(id)
          message.success('Xóa phiếu thành công!')
          fetchList()
        } catch (err) { message.error(err.response?.data?.detail || 'Có lỗi xảy ra') }
      }
    })
  }

  const handleHoanThanh = (id) => {
    Modal.confirm({
      title: 'Xác nhận hoàn thành phiếu?',
      content: 'Bạn xác nhận đã nhận đủ hàng và hoàn thành phiếu này?',
      okText: 'Xác nhận', cancelText: 'Hủy',
      onOk: async () => {
        try {
          await giaCongApi.hoanThanh(id)
          message.success('Phiếu đã hoàn thành!')
          fetchList()
        } catch (err) { message.error(err.response?.data?.detail || 'Có lỗi xảy ra') }
      }
    })
  }

  // Mở modal tạo phiếu nhập
  const openNhapKhoModal = async (id) => {
    try {
      const res = await giaCongApi.getDetail(id)
      const phieu = res.data
      setPhieuGcId(phieu.id)
      nhapForm.setFieldsValue({
        ngay_nhap: dayjs(),
        don_vi_giao: phieu.nha_cung_cap
      })
      
      const ct = phieu.chi_tiet.map((item, idx) => {
        const con_lai = Math.max(0, item.so_luong - (item.da_nhan_sl || 0))
        const con_lai_kg = Math.max(0, item.so_luong_kg - (item.da_nhan_kg || 0))
        return {
          key: idx,
          id_goc: item.id,
          vat_tu_id: item.vat_tu_id,
          _vat_tu: item.vat_tu,
          sl_dat: item.so_luong,
          sl_da_nhan: item.da_nhan_sl,
          so_luong: con_lai,
          so_luong_kg: con_lai_kg,
          chon: con_lai > 0
        }
      })
      setNhapChiTiet(ct)
      setNhapModalOpen(true)
    } catch { message.error('Lỗi tải phiếu') }
  }

  const handleSubmitNhapKho = async () => {
    try {
      const values = await nhapForm.validateFields()
      const ctSelected = nhapChiTiet.filter(c => c.chon && c.so_luong > 0)
      if (ctSelected.length === 0) {
        message.error('Vui lòng chọn ít nhất 1 vật tư để nhập!')
        return
      }

      const payload = {
        ngay_nhap: values.ngay_nhap.format('YYYY-MM-DD'),
        bien_so_xe: values.bien_so_xe,
        tai_xe: values.tai_xe,
        don_vi_giao: values.don_vi_giao,
        ghi_chu: values.ghi_chu,
        chi_tiet: ctSelected.map(c => ({
          vat_tu_id: c.vat_tu_id,
          so_luong: c.so_luong,
          so_luong_kg: c.so_luong_kg,
          ghi_chu: c.ghi_chu
        }))
      }

      await giaCongApi.taoPhieuNhap(phieuGcId, payload)
      message.success('Đã tạo Phiếu nhập kho (từng phần) thành công!')
      setNhapModalOpen(false)
      fetchList()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const openTinhHinh = async (id) => {
    try {
      const res = await giaCongApi.tinhHinh(id)
      setTinhHinhData(res.data)
      setTinhHinhOpen(true)
    } catch { message.error('Lỗi tải báo cáo') }
  }

  const columns = [
    { title: 'Số phiếu GC', dataIndex: 'so_phieu', width: 140, render: v => <Text code>{v}</Text> },
    { title: 'Ngày tạo', dataIndex: 'ngay_tao', width: 110 },
    { title: 'ĐV Gia công / NCC', dataIndex: 'nha_cung_cap', ellipsis: true },
    { title: 'Nơi nhận (Kho/CT)', dataIndex: ['kho_nhan', 'ten_kho'], ellipsis: true },
    { title: 'Số hợp đồng', dataIndex: 'so_hop_dong', width: 130, render: v => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'trang_thai', width: 140,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Thao tác', width: 230, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="Kiểm tra tình hình">
            <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={() => openTinhHinh(r.id)} />
          </Tooltip>
          {r.trang_thai !== 'hoan_thanh' && r.trang_thai !== 'huy' && (
            <Tooltip title="Tạo phiếu nhập">
              <Button size="small" type="dashed" icon={<DownloadOutlined />} onClick={() => openNhapKhoModal(r.id)} />
            </Tooltip>
          )}
          {r.trang_thai === 'cho_giao' && (
            <>
              <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(r.id)} /></Tooltip>
              <Tooltip title="Xóa"><Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} /></Tooltip>
            </>
          )}
          {r.trang_thai === 'dang_giao' && (
             <Tooltip title="Hoàn thành"><Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleHoanThanh(r.id)} /></Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card styles={{ body: { padding: 0 } }} title={<Space><Text strong>🏭 Phiếu Gia Công / Mua Mới</Text><Tag color="blue">{list.total} phiếu</Tag></Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setChiTiet([{ key: 0 }]); setModalOpen(true) }}>Tạo phiếu mới</Button>}
    >
      <Table dataSource={list.items} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 20 }} />

      {/* Modal Tạo/Sửa phiếu GC */}
      <Modal
        title={editingId ? "Sửa phiếu gia công/mua mới" : "Tạo phiếu gia công/mua mới"}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={900} destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="ngay_tao" label="Ngày tạo phiếu" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="kho_nhan_id" label="Nơi nhận hàng" rules={[{ required: true }]}>
                <Select placeholder="Chọn kho / công trình">
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="so_hop_dong" label="Số hợp đồng (nếu có)">
                <Input placeholder="HD-12345" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="nha_cung_cap" label="Nhà cung cấp / Đơn vị gia công">
                <Input placeholder="Tên đơn vị..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain style={{ margin: '8px 0' }}>Danh sách vật tư đặt</Divider>

          {chiTiet.map((ct, idx) => (
            <Row key={ct.key} gutter={8} align="middle" style={{ marginBottom: 6 }}>
              <Col span={9}>
                <MaterialSelect placeholder="Chọn vật tư" style={{ width: '100%' }} value={ct.vat_tu_id} onChange={(v, vt) => handleVatTuChange(idx, v, vt)} />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="SL" style={{ width: '100%' }} min={0} value={ct.so_luong} onChange={v => handleSlChange(idx, v)} addonAfter={ct._vat_tu?.dvt_phu || 'SL'} />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="Kg" style={{ width: '100%' }} min={0} value={ct.so_luong_kg} onChange={v => { const nc = [...chiTiet]; nc[idx].so_luong_kg = v; setChiTiet(nc) }} addonAfter="Kg" />
              </Col>
              <Col span={5}>
                <Input placeholder="Ghi chú" value={ct.ghi_chu} onChange={e => { const nc = [...chiTiet]; nc[idx].ghi_chu = e.target.value; setChiTiet(nc) }} />
              </Col>
              <Col span={2}>
                <Button danger icon={<DeleteOutlined />} onClick={() => removeRow(idx)} />
              </Col>
            </Row>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={addRow} style={{ marginTop: 8 }}>Thêm dòng</Button>

          <Form.Item name="ghi_chu" label="Ghi chú chung" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Tạo Phiếu Nhập */}
      <Modal
        title="Tạo Phiếu Nhập Kho (Từng phần)"
        open={nhapModalOpen} onOk={handleSubmitNhapKho} onCancel={() => setNhapModalOpen(false)} width={950} destroyOnClose
      >
        <Form form={nhapForm} layout="vertical">
          <Row gutter={12}>
            <Col span={8}><Form.Item name="ngay_nhap" label="Ngày nhập" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="don_vi_giao" label="Đơn vị giao"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="bien_so_xe" label="Biển số xe"><Input /></Form.Item></Col>
          </Row>
        </Form>
        <Divider orientation="left" plain style={{ margin: '8px 0' }}>Chọn vật tư nhập chuyến này</Divider>
        <Table
          dataSource={nhapChiTiet} rowKey="key" size="small" pagination={false}
          columns={[
            {
              title: 'Chọn', width: 60, align: 'center',
              render: (_, r, idx) => <input type="checkbox" checked={r.chon} onChange={e => { const nd = [...nhapChiTiet]; nd[idx].chon = e.target.checked; setNhapChiTiet(nd) }} />
            },
            { title: 'Vật tư', dataIndex: ['_vat_tu', 'ten_hang'], ellipsis: true },
            { title: 'Tổng SL đặt', dataIndex: 'sl_dat', width: 100, align: 'right' },
            { title: 'Đã nhận', dataIndex: 'sl_da_nhan', width: 90, align: 'right' },
            {
              title: 'SL chuyến này', width: 140,
              render: (_, r, idx) => <InputNumber size="small" min={0} value={r.so_luong} onChange={v => { const nd = [...nhapChiTiet]; nd[idx].so_luong = v; nd[idx].chon = v > 0; setNhapChiTiet(nd) }} disabled={!r.chon} />
            },
            {
              title: 'KL Kg', width: 140,
              render: (_, r, idx) => <InputNumber size="small" min={0} value={r.so_luong_kg} onChange={v => { const nd = [...nhapChiTiet]; nd[idx].so_luong_kg = v; setNhapChiTiet(nd) }} disabled={!r.chon} />
            },
            {
              title: 'Ghi chú', width: 150,
              render: (_, r, idx) => <Input size="small" value={r.ghi_chu} onChange={e => { const nd = [...nhapChiTiet]; nd[idx].ghi_chu = e.target.value; setNhapChiTiet(nd) }} disabled={!r.chon} />
            }
          ]}
        />
      </Modal>

      {/* Modal Tình Hình */}
      <Modal
        title={`Tình hình phiếu GC: ${tinhHinhData?.phieu?.so_phieu || ''}`}
        open={tinhHinhOpen} onCancel={() => setTinhHinhOpen(false)} footer={null} width={900}
      >
        {tinhHinhData && (
          <>
            <Space style={{ marginBottom: 16 }}>
              <Text strong>Trạng thái phiếu GC:</Text>
              <Tag color={STATUS_COLOR[tinhHinhData.phieu.trang_thai]}>{STATUS_LABEL[tinhHinhData.phieu.trang_thai]}</Tag>
              <Divider type="vertical" />
              <Text strong>Đã tạo: {tinhHinhData.so_phieu_nhap} phiếu nhập</Text>
            </Space>
            
            <Table
              dataSource={tinhHinhData.chi_tiet}
              rowKey="vat_tu_id" size="small" pagination={false}
              bordered
              columns={[
                { title: 'Mã', dataIndex: 'ma_hang', width: 100, render: v => <Text code>{v}</Text> },
                { title: 'Vật tư', dataIndex: 'ten_hang', ellipsis: true },
                { title: 'SL Đặt', dataIndex: 'sl_dat', align: 'right', width: 90 },
                { title: 'SL Đã nhận', dataIndex: 'sl_da_nhan', align: 'right', width: 100, render: v => <Text type="success" strong>{v}</Text> },
                { title: 'SL Còn lại', dataIndex: 'sl_con_lai', align: 'right', width: 100, render: v => <Text type={v > 0 ? 'danger' : 'secondary'} strong>{v}</Text> },
                { title: 'Trạng thái', dataIndex: 'trang_thai', width: 130, render: v => {
                  let color = v === 'Đã nhận đủ' ? 'green' : (v === 'Đang giao' ? 'blue' : 'orange')
                  return <Badge status={color === 'green' ? 'success' : (color === 'blue' ? 'processing' : 'warning')} text={v} />
                }}
              ]}
            />
          </>
        )}
      </Modal>
    </Card>
  )
}
