import React, { useEffect, useState } from 'react'
import {
  Tabs, Table, Tag, Card, Typography, Space, Button, Modal, Form, Input,
  Tooltip, message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { masterApi } from '../../services/api'

const { Text } = Typography

export default function DanhMucHeThong() {
  const [nhomList, setNhomList] = useState([])
  const [dvtList, setDvtList] = useState([])
  const [loading, setLoading] = useState(false)

  // Nhóm VT modal
  const [nhomModalOpen, setNhomModalOpen] = useState(false)
  const [editingNhomId, setEditingNhomId] = useState(null)
  const [nhomForm] = Form.useForm()

  // ĐVT modal
  const [dvtModalOpen, setDvtModalOpen] = useState(false)
  const [editingDvtId, setEditingDvtId] = useState(null)
  const [dvtForm] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      masterApi.getNhomVatTu(),
      masterApi.getDonViTinh(),
    ]).then(([nRes, dRes]) => {
      setNhomList(nRes.data)
      setDvtList(dRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // ─── Nhóm VT handlers ───
  const handleNhomSubmit = async () => {
    try {
      const values = await nhomForm.validateFields()
      if (editingNhomId) {
        await masterApi.updateNhomVatTu(editingNhomId, values)
        message.success('Cập nhật nhóm vật tư thành công!')
      } else {
        await masterApi.createNhomVatTu(values)
        message.success('Thêm nhóm vật tư thành công!')
      }
      setNhomModalOpen(false)
      nhomForm.resetFields()
      setEditingNhomId(null)
      fetchData()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const handleNhomEdit = (record) => {
    setEditingNhomId(record.id)
    nhomForm.setFieldsValue(record)
    setNhomModalOpen(true)
  }

  const handleNhomDelete = (id) => {
    Modal.confirm({
      title: 'Xóa nhóm vật tư?',
      content: 'Bạn có chắc chắn muốn xóa nhóm vật tư này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await masterApi.deleteNhomVatTu(id)
          message.success('Xóa nhóm vật tư thành công!')
          fetchData()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
        }
      }
    })
  }

  // ─── ĐVT handlers ───
  const handleDvtSubmit = async () => {
    try {
      const values = await dvtForm.validateFields()
      if (editingDvtId) {
        await masterApi.updateDonViTinh(editingDvtId, values)
        message.success('Cập nhật đơn vị tính thành công!')
      } else {
        await masterApi.createDonViTinh(values)
        message.success('Thêm đơn vị tính thành công!')
      }
      setDvtModalOpen(false)
      dvtForm.resetFields()
      setEditingDvtId(null)
      fetchData()
    } catch (err) {
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const handleDvtEdit = (record) => {
    setEditingDvtId(record.id)
    dvtForm.setFieldsValue(record)
    setDvtModalOpen(true)
  }

  const handleDvtDelete = (id) => {
    Modal.confirm({
      title: 'Xóa đơn vị tính?',
      content: 'Bạn có chắc chắn muốn xóa đơn vị tính này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await masterApi.deleteDonViTinh(id)
          message.success('Xóa đơn vị tính thành công!')
          fetchData()
        } catch (err) {
          message.error(err.response?.data?.detail || 'Có lỗi xảy ra')
        }
      }
    })
  }

  const items = [
    {
      key: 'nhom',
      label: `📂 Nhóm vật tư (${nhomList.length})`,
      children: (
        <>
          <div style={{ padding: '12px 0 8px', textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingNhomId(null); nhomForm.resetFields(); setNhomModalOpen(true)
            }}>
              Thêm nhóm VT
            </Button>
          </div>
          <Table
            dataSource={nhomList} rowKey="id" size="small" loading={loading}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: 'Mã nhóm', dataIndex: 'ma_nhom', width: 120, render: v => <Tag>{v}</Tag> },
              { title: 'Tên nhóm', dataIndex: 'ten_nhom' },
              {
                title: 'Trạng thái', dataIndex: 'an', width: 120,
                render: v => v ? <Tag color="red">Ẩn</Tag> : <Tag color="green">Đang dùng</Tag>,
              },
              {
                title: 'Thao tác', width: 100, fixed: 'right',
                render: (_, r) => (
                  <Space size="middle">
                    <Tooltip title="Sửa">
                      <Button size="small" type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleNhomEdit(r)} />
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <Button size="small" type="text" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} onClick={() => handleNhomDelete(r.id)} />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        </>
      ),
    },
    {
      key: 'dvt',
      label: `📏 Đơn vị tính (${dvtList.length})`,
      children: (
        <>
          <div style={{ padding: '12px 0 8px', textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingDvtId(null); dvtForm.resetFields(); setDvtModalOpen(true)
            }}>
              Thêm ĐVT
            </Button>
          </div>
          <Table
            dataSource={dvtList} rowKey="id" size="small" loading={loading}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: 'Đơn vị tính', dataIndex: 'ten', width: 180, render: v => <Tag color="blue">{v}</Tag> },
              { title: 'Mô tả', dataIndex: 'mo_ta', render: v => v || '—' },
              {
                title: 'Thao tác', width: 100, fixed: 'right',
                render: (_, r) => (
                  <Space size="middle">
                    <Tooltip title="Sửa">
                      <Button size="small" type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleDvtEdit(r)} />
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <Button size="small" type="text" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} onClick={() => handleDvtDelete(r.id)} />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        </>
      ),
    },
  ]

  return (
    <Card title="⚙️ Danh mục hệ thống" styles={{ body: { padding: '0 0 16px 0' } }}>
      <Tabs items={items} style={{ padding: '0 16px' }} />

      {/* ── Modal Nhóm VT ── */}
      <Modal
        title={editingNhomId ? "Sửa nhóm vật tư" : "Thêm nhóm vật tư"}
        open={nhomModalOpen}
        onOk={handleNhomSubmit}
        onCancel={() => { setNhomModalOpen(false); nhomForm.resetFields(); setEditingNhomId(null) }}
        okText="Lưu" cancelText="Hủy" destroyOnClose
      >
        <Form form={nhomForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ma_nhom" label="Mã nhóm" rules={[{ required: true, message: 'Vui lòng nhập mã nhóm' }]}>
            <Input placeholder="Ví dụ: VT01" />
          </Form.Item>
          <Form.Item name="ten_nhom" label="Tên nhóm" rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}>
            <Input placeholder="Ví dụ: Thép hộp" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal ĐVT ── */}
      <Modal
        title={editingDvtId ? "Sửa đơn vị tính" : "Thêm đơn vị tính"}
        open={dvtModalOpen}
        onOk={handleDvtSubmit}
        onCancel={() => { setDvtModalOpen(false); dvtForm.resetFields(); setEditingDvtId(null) }}
        okText="Lưu" cancelText="Hủy" destroyOnClose
      >
        <Form form={dvtForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="ten" label="Tên đơn vị tính" rules={[{ required: true, message: 'Vui lòng nhập tên ĐVT' }]}>
            <Input placeholder="Ví dụ: Kg, Tấm, Thanh..." />
          </Form.Item>
          <Form.Item name="mo_ta" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả thêm (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
