import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, message, Tag, Card, Row, Col, Typography, InputNumber, Divider, Tooltip, Badge
} from 'antd'
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, EyeOutlined, EditOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { dieuChuyenApi } from '../../services/api'
import { useMasterStore } from '../../store/masterStore'
import MaterialSelect from '../../components/MaterialSelect'
import { STATUS_COLOR, STATUS_LABEL } from '../../utils/constants'

const { Option } = Select
const { Text } = Typography

export default function LenhDieuChuyen() {
  const [list, setList] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(false)
  const { khoList } = useMasterStore()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [chiTiet, setChiTiet] = useState([{ key: 0, vat_tu_id: null, so_luong_gui: 0, so_luong_gui_kg: 0 }])
  const [form] = Form.useForm()

  const [xuatModalOpen, setXuatModalOpen] = useState(false)
  const [lenhId, setLenhId] = useState(null)
  const [xuatChiTiet, setXuatChiTiet] = useState([])
  const [xuatForm] = Form.useForm()

  const [tinhHinhOpen, setTinhHinhOpen] = useState(false)
  const [tinhHinhData, setTinhHinhData] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dieuChuyenApi.getList({ limit: 50 })
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
    newCt[idx].so_luong_gui = sl || 0
    if (vt?.ty_le_quy_doi) {
      newCt[idx].so_luong_gui_kg = vt.phep_tinh === 'chia' ? sl / vt.ty_le_quy_doi : sl * vt.ty_le_quy_doi
    }
    setChiTiet(newCt)
  }

  const addRow = () => setChiTiet(prev => [...prev, { key: prev.length, vat_tu_id: null, so_luong_gui: 0, so_luong_gui_kg: 0 }])
  const removeRow = (idx) => setChiTiet(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (chiTiet.every(c => !c.vat_tu_id)) { message.error('Vui lòng thêm ít nhất 1 vật tư!'); return }
      if (values.kho_xuat_id === values.kho_nhan_id) { message.error('Nơi xuất và Nơi nhận không được trùng nhau!'); return }
      
      const data = {
        ...values,
        ngay_dc: values.ngay_dc.format('YYYY-MM-DD'),
        chi_tiet: chiTiet.filter(c => c.vat_tu_id).map(c => ({
          vat_tu_id: c.vat_tu_id,
          so_luong_gui: c.so_luong_gui,
          so_luong_gui_kg: Math.round(c.so_luong_gui_kg * 100) / 100,
          ghi_chu: c.ghi_chu,
        })),
      }
      
      if (editingId) {
        await dieuChuyenApi.update(editingId, data)
        message.success('Cập nhật lệnh thành công!')
      } else {
        await dieuChuyenApi.create(data)
        message.success('Tạo lệnh thành công!')
      }
      
      setModalOpen(false)
      fetchList()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const handleEdit = async (id) => {
    try {
      const res = await dieuChuyenApi.getDetail(id)
      const data = res.data
      setEditingId(data.id)
      form.setFieldsValue({
        ...data,
        ngay_dc: dayjs(data.ngay_dc),
      })
      const chiTietFormat = data.chi_tiet.map((ct, i) => ({
        key: i,
        vat_tu_id: ct.vat_tu_id,
        so_luong_gui: ct.so_luong_gui,
        so_luong_gui_kg: ct.so_luong_gui_kg,
        ghi_chu: ct.ghi_chu,
      }))
      setChiTiet(chiTietFormat.length ? chiTietFormat : [{ key: 0, vat_tu_id: null, so_luong_gui: 0, so_luong_gui_kg: 0 }])
      setModalOpen(true)
    } catch { message.error('Lỗi tải lệnh') }
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa lệnh điều chuyển?',
      okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
      onOk: async () => {
        try {
          await dieuChuyenApi.delete(id)
          message.success('Xóa lệnh thành công!')
          fetchList()
        } catch (err) { message.error(err.response?.data?.detail || 'Có lỗi xảy ra') }
      }
    })
  }

  const handleHoanThanh = (id) => {
    Modal.confirm({
      title: 'Xác nhận hoàn thành lệnh?',
      content: 'Bạn xác nhận quá trình điều chuyển đã hoàn tất?',
      okText: 'Xác nhận', cancelText: 'Hủy',
      onOk: async () => {
        try {
          await dieuChuyenApi.hoanThanh(id)
          message.success('Lệnh đã hoàn thành!')
          fetchList()
        } catch (err) { message.error(err.response?.data?.detail || 'Có lỗi xảy ra') }
      }
    })
  }

  const handleExportExcel = async (id) => {
    try {
      const res = await dieuChuyenApi.exportExcel(id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Bien_Ban_Giao_Nhan_${id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      message.error('Lỗi khi xuất file Excel')
    }
  }

  // Mở modal tạo phiếu xuất
  const openXuatKhoModal = async (id) => {
    try {
      const res = await dieuChuyenApi.getDetail(id)
      const lenh = res.data
      setLenhId(lenh.id)
      xuatForm.setFieldsValue({
        ngay_xuat: dayjs(),
        bien_so_xe: lenh.bien_so_xe,
        nguoi_giao: lenh.nguoi_giao,
        nguoi_nhan: lenh.nguoi_nhan,
      })
      
      const ct = lenh.chi_tiet.map((item, idx) => {
        const con_lai = Math.max(0, item.so_luong_gui - (item.da_xuat_sl || 0))
        const con_lai_kg = Math.max(0, item.so_luong_gui_kg - (item.da_xuat_kg || 0))
        return {
          key: idx,
          id_goc: item.id,
          vat_tu_id: item.vat_tu_id,
          _vat_tu: item.vat_tu,
          sl_theo_lenh: item.so_luong_gui,
          sl_da_xuat: item.da_xuat_sl,
          so_luong: con_lai,
          so_luong_kg: con_lai_kg,
          chon: con_lai > 0
        }
      })
      setXuatChiTiet(ct)
      setXuatModalOpen(true)
    } catch { message.error('Lỗi tải lệnh') }
  }

  const handleSubmitXuatKho = async () => {
    try {
      const values = await xuatForm.validateFields()
      const ctSelected = xuatChiTiet.filter(c => c.chon && c.so_luong > 0)
      if (ctSelected.length === 0) {
        message.error('Vui lòng chọn ít nhất 1 vật tư để xuất!')
        return
      }

      const payload = {
        ngay_xuat: values.ngay_xuat.format('YYYY-MM-DD'),
        bien_so_xe: values.bien_so_xe,
        nguoi_giao: values.nguoi_giao,
        nguoi_nhan: values.nguoi_nhan,
        ghi_chu: values.ghi_chu,
        chi_tiet: ctSelected.map(c => ({
          vat_tu_id: c.vat_tu_id,
          so_luong: c.so_luong,
          so_luong_kg: c.so_luong_kg,
          sl_theo_lenh: c.sl_theo_lenh,
          ghi_chu: c.ghi_chu
        }))
      }

      await dieuChuyenApi.taoPhieuXuat(lenhId, payload)
      message.success('Đã tạo Phiếu xuất kho (từng phần) thành công!')
      setXuatModalOpen(false)
      fetchList()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const openTinhHinh = async (id) => {
    try {
      const res = await dieuChuyenApi.tinhHinh(id)
      setTinhHinhData(res.data)
      setTinhHinhOpen(true)
    } catch { message.error('Lỗi tải báo cáo') }
  }

  const columns = [
    { title: 'Số lệnh', dataIndex: 'so_phieu', width: 140, render: v => <Text code>{v}</Text> },
    { title: 'Ngày lệnh', dataIndex: 'ngay_dc', width: 110 },
    { title: 'Nơi xuất', dataIndex: ['kho_xuat', 'ten_kho'], ellipsis: true },
    { title: 'Nơi nhận', dataIndex: ['kho_nhan', 'ten_kho'], ellipsis: true },
    { title: 'Số lệnh ĐĐ', dataIndex: 'so_lenh_dieu_dong', width: 130, render: v => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'trang_thai', width: 140,
      render: v => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Thao tác', width: 270, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="In biên bản (Excel)">
            <Button size="small" type="default" icon={<FileExcelOutlined style={{color: 'green'}}/>} onClick={() => handleExportExcel(r.id)} />
          </Tooltip>
          <Tooltip title="Kiểm tra tình hình">
            <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={() => openTinhHinh(r.id)} />
          </Tooltip>
          {r.trang_thai !== 'hoan_thanh' && r.trang_thai !== 'huy' && (
            <Tooltip title="Tạo phiếu xuất">
              <Button size="small" type="dashed" icon={<UploadOutlined />} onClick={() => openXuatKhoModal(r.id)} />
            </Tooltip>
          )}
          {r.trang_thai === 'cho_xuat' && (
            <>
              <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(r.id)} /></Tooltip>
              <Tooltip title="Xóa"><Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} /></Tooltip>
            </>
          )}
          {r.trang_thai === 'dang_xuat' && (
             <Tooltip title="Hoàn thành"><Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleHoanThanh(r.id)} /></Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card styles={{ body: { padding: 0 } }} title={<Space><Text strong>🚚 Lệnh Điều Chuyển</Text><Tag color="blue">{list.total} lệnh</Tag></Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setChiTiet([{ key: 0, vat_tu_id: null, so_luong_gui: 0, so_luong_gui_kg: 0 }]); setModalOpen(true) }}>Tạo lệnh mới</Button>}
    >
      <Table dataSource={list.items} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: 1100 }} pagination={{ pageSize: 20 }} />

      {/* Modal Tạo/Sửa lệnh ĐC */}
      <Modal
        title={editingId ? "Sửa lệnh điều chuyển" : "Tạo lệnh điều chuyển"}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={900} destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="ngay_dc" label="Ngày điều chuyển" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="kho_xuat_id" label="Nơi xuất" rules={[{ required: true }]}>
                <Select placeholder="Chọn nơi xuất">
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="kho_nhan_id" label="Nơi nhận" rules={[{ required: true }]}>
                <Select placeholder="Chọn nơi nhận">
                  {khoList.map(k => <Option key={k.id} value={k.id}>{k.ma_kho} – {k.ten_kho}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}><Form.Item name="so_lenh_dieu_dong" label="Số lệnh ĐĐ"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="nguoi_giao" label="Người giao"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="nguoi_nhan" label="Người nhận"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="bien_so_xe" label="Biển số xe"><Input /></Form.Item></Col>
          </Row>

          <Divider orientation="left" plain style={{ margin: '8px 0' }}>Danh sách vật tư điều chuyển</Divider>

          {chiTiet.map((ct, idx) => (
            <Row key={ct.key} gutter={8} align="middle" style={{ marginBottom: 6 }}>
              <Col span={9}>
                <MaterialSelect placeholder="Chọn vật tư" style={{ width: '100%' }} value={ct.vat_tu_id} onChange={(v, vt) => handleVatTuChange(idx, v, vt)} />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="SL" style={{ width: '100%' }} min={0} value={ct.so_luong_gui} onChange={v => handleSlChange(idx, v)} addonAfter={ct._vat_tu?.dvt_phu || 'SL'} />
              </Col>
              <Col span={4}>
                <InputNumber placeholder="Kg" style={{ width: '100%' }} min={0} value={ct.so_luong_gui_kg} onChange={v => { const nc = [...chiTiet]; nc[idx].so_luong_gui_kg = v; setChiTiet(nc) }} addonAfter="Kg" />
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
          <Form.Item name="ghi_chu" label="Ghi chú chung" style={{ marginTop: 12 }}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Modal Tạo Phiếu Xuất */}
      <Modal
        title="Tạo Phiếu Xuất Kho (Từng phần)"
        open={xuatModalOpen} onOk={handleSubmitXuatKho} onCancel={() => setXuatModalOpen(false)} width={950} destroyOnClose
      >
        <Form form={xuatForm} layout="vertical">
          <Row gutter={12}>
            <Col span={6}><Form.Item name="ngay_xuat" label="Ngày xuất" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="nguoi_giao" label="Người giao"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="nguoi_nhan" label="Người nhận"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="bien_so_xe" label="Biển số xe"><Input /></Form.Item></Col>
          </Row>
        </Form>
        <Divider orientation="left" plain style={{ margin: '8px 0' }}>Chọn vật tư xuất chuyến này</Divider>
        <Table
          dataSource={xuatChiTiet} rowKey="key" size="small" pagination={false}
          columns={[
            {
              title: 'Chọn', width: 60, align: 'center',
              render: (_, r, idx) => <input type="checkbox" checked={r.chon} onChange={e => { const nd = [...xuatChiTiet]; nd[idx].chon = e.target.checked; setXuatChiTiet(nd) }} />
            },
            { title: 'Vật tư', dataIndex: ['_vat_tu', 'ten_hang'], ellipsis: true },
            { title: 'Theo lệnh', dataIndex: 'sl_theo_lenh', width: 90, align: 'right' },
            { title: 'Đã xuất', dataIndex: 'sl_da_xuat', width: 80, align: 'right' },
            {
              title: 'SL chuyến này', width: 130,
              render: (_, r, idx) => <InputNumber size="small" min={0} value={r.so_luong} onChange={v => { const nd = [...xuatChiTiet]; nd[idx].so_luong = v; nd[idx].chon = v > 0; setXuatChiTiet(nd) }} disabled={!r.chon} />
            },
            {
              title: 'KL Kg', width: 130,
              render: (_, r, idx) => <InputNumber size="small" min={0} value={r.so_luong_kg} onChange={v => { const nd = [...xuatChiTiet]; nd[idx].so_luong_kg = v; setXuatChiTiet(nd) }} disabled={!r.chon} />
            },
            {
              title: 'Ghi chú', width: 150,
              render: (_, r, idx) => <Input size="small" value={r.ghi_chu} onChange={e => { const nd = [...xuatChiTiet]; nd[idx].ghi_chu = e.target.value; setXuatChiTiet(nd) }} disabled={!r.chon} />
            }
          ]}
        />
      </Modal>

      {/* Modal Tình Hình */}
      <Modal
        title={`Tình hình điều chuyển lệnh: ${tinhHinhData?.lenh?.so_phieu || ''}`}
        open={tinhHinhOpen} onCancel={() => setTinhHinhOpen(false)} footer={null} width={1000}
      >
        {tinhHinhData && (
          <>
            <Space style={{ marginBottom: 16 }}>
              <Text strong>Trạng thái lệnh:</Text>
              <Tag color={STATUS_COLOR[tinhHinhData.lenh.trang_thai]}>{STATUS_LABEL[tinhHinhData.lenh.trang_thai]}</Tag>
              <Divider type="vertical" />
              <Text strong>Nơi xuất: <Text type="secondary">{tinhHinhData.lenh.kho_xuat}</Text></Text>
              <Divider type="vertical" />
              <Text strong>Nơi nhận: <Text type="secondary">{tinhHinhData.lenh.kho_nhan}</Text></Text>
            </Space>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" title={`Phiếu xuất kho (${tinhHinhData.so_phieu_xuat})`}>
                  {tinhHinhData.ds_phieu_xuat.map((p, i) => <div key={i}><Text code>{p.so_phieu}</Text> - {p.ngay_xuat} <Tag color={STATUS_COLOR[p.trang_thai]}>{STATUS_LABEL[p.trang_thai]}</Tag></div>)}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={`Phiếu nhập kho (${tinhHinhData.so_phieu_nhap})`}>
                  {tinhHinhData.ds_phieu_nhap.map((p, i) => <div key={i}><Text code>{p.so_phieu}</Text> - {p.ngay_nhap} <Tag color={STATUS_COLOR[p.trang_thai]}>{STATUS_LABEL[p.trang_thai]}</Tag></div>)}
                </Card>
              </Col>
            </Row>
            
            <Table
              dataSource={tinhHinhData.chi_tiet}
              rowKey="vat_tu_id" size="small" pagination={false}
              bordered
              columns={[
                { title: 'Vật tư', dataIndex: 'ten_hang', ellipsis: true },
                { title: 'SL Lệnh', dataIndex: 'sl_theo_lenh', align: 'right', width: 80 },
                { title: 'Đã xuất', dataIndex: 'sl_da_xuat', align: 'right', width: 80, render: v => <Text type="warning" strong>{v}</Text> },
                { title: 'Đã nhận', dataIndex: 'sl_da_nhan', align: 'right', width: 80, render: v => <Text type="success" strong>{v}</Text> },
                { title: 'Còn lại', dataIndex: 'sl_con_lai', align: 'right', width: 80, render: v => <Text type={v > 0 ? 'danger' : 'secondary'} strong>{v}</Text> },
                { title: 'Trạng thái', dataIndex: 'trang_thai', width: 140, render: v => {
                  let color = v === 'Đã nhận đủ' ? 'green' : (v === 'Đã xuất, chờ nhận' ? 'cyan' : (v === 'Đang xuất' ? 'blue' : 'orange'))
                  return <Badge status={color === 'green' ? 'success' : (color === 'blue' ? 'processing' : (color === 'cyan' ? 'default' : 'warning'))} text={v} />
                }}
              ]}
            />
          </>
        )}
      </Modal>
    </Card>
  )
}
