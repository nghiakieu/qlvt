import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tree, Table, Tag, Button, Modal, Form, Input, Select, Space, message, Card, Typography, Tooltip, Row, Col, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, BuildOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { masterApi } from '../../services/api'
import { useMasterStore } from '../../store/masterStore'

const { Text, Title } = Typography
const { Option } = Select

export default function KhoCongTrinh() {
  const navigate = useNavigate()
  const { khoList, fetchKho } = useMasterStore() // khoList acts as CongTrinh
  const [viTriList, setViTriList] = useState([]) // viTriList acts as ViTriTapKet
  const [loading, setLoading] = useState(false)
  
  // Tree selection state
  // key can be: `congtrinh_${id}` or `vitri_${id}`
  const [selectedKeys, setSelectedKeys] = useState([])
  const [selectedNodeData, setSelectedNodeData] = useState(null) // { type: 'congtrinh'|'vitri', data: object }

  // Modals state
  const [khoModal, setKhoModal] = useState({ open: false, editingId: null })
  const [viTriModal, setViTriModal] = useState({ open: false, editingId: null, defaultKhoId: null })

  const [formKho] = Form.useForm()
  const [formViTri] = Form.useForm()

  const fetchAll = async () => {
    setLoading(true)
    try {
      await fetchKho(true)
      const res = await masterApi.getViTri()
      setViTriList(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Update selected node data when lists change
  useEffect(() => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0]
      if (key.startsWith('congtrinh_')) {
        const id = parseInt(key.split('_')[1])
        const data = khoList.find(k => k.id === id)
        setSelectedNodeData(data ? { type: 'congtrinh', data } : null)
      } else if (key.startsWith('vitri_')) {
        const id = parseInt(key.split('_')[1])
        const data = viTriList.find(v => v.id === id)
        setSelectedNodeData(data ? { type: 'vitri', data } : null)
      }
    } else {
      setSelectedNodeData(null)
    }
  }, [selectedKeys, khoList, viTriList])

  // --- KHO (CÔNG TRÌNH) ---
  const handleKhoSubmit = async () => {
    try {
      const values = await formKho.validateFields()
      if (khoModal.editingId) await masterApi.updateKho(khoModal.editingId, values)
      else await masterApi.createKho(values)
      message.success('Thành công!')
      setKhoModal({ open: false, editingId: null })
      formKho.resetFields()
      fetchAll()
    } catch (err) { if (err?.response?.data?.detail) message.error(err.response.data.detail) }
  }

  const handleDeleteKho = (id) => {
    Modal.confirm({
      title: 'Xóa công trình?', okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
      onOk: async () => {
        await masterApi.deleteKho(id)
        message.success('Đã xóa')
        if (selectedKeys.includes(`congtrinh_${id}`)) setSelectedKeys([])
        fetchAll()
      }
    })
  }

  // --- VI TRI (VỊ TRÍ TẬP KẾT) ---
  const handleViTriSubmit = async () => {
    try {
      const values = await formViTri.validateFields()
      if (viTriModal.editingId) await masterApi.updateViTri(viTriModal.editingId, values)
      else await masterApi.createViTri(values)
      message.success('Thành công!')
      setViTriModal({ open: false, editingId: null, defaultKhoId: null })
      formViTri.resetFields()
      fetchAll()
    } catch (err) { if (err?.response?.data?.detail) message.error(err.response.data.detail) }
  }

  const handleDeleteViTri = (id) => {
    Modal.confirm({
      title: 'Xóa vị trí tập kết?', okText: 'Xóa', okType: 'danger', cancelText: 'Hủy',
      onOk: async () => {
        await masterApi.deleteViTri(id)
        message.success('Đã xóa')
        if (selectedKeys.includes(`vitri_${id}`)) setSelectedKeys([])
        fetchAll()
      }
    })
  }

  // Build Tree Data
  const treeData = khoList.map(kho => {
    const children = viTriList.filter(v => v.kho_id === kho.id).map(v => ({
      title: `${v.ma_vi_tri} - ${v.ten_vi_tri}`,
      key: `vitri_${v.id}`,
      icon: <EnvironmentOutlined style={{ color: '#fa8c16' }} />
    }))

    return {
      title: <span style={{ fontWeight: 500 }}>{kho.ma_kho} - {kho.ten_kho}</span>,
      key: `congtrinh_${kho.id}`,
      icon: <BuildOutlined style={{ color: '#1890ff' }} />,
      children: children
    }
  })

  // Render detail panel
  const renderDetail = () => {
    if (!selectedNodeData) {
      return (
        <Empty description="Chọn một công trình hoặc vị trí tập kết từ cây bên trái để xem chi tiết" style={{ marginTop: 60 }} />
      )
    }

    if (selectedNodeData.type === 'congtrinh') {
      const ct = selectedNodeData.data
      const viTris = viTriList.filter(v => v.kho_id === ct.id)
      
      const cols = [
        { title: 'Mã VT', dataIndex: 'ma_vi_tri', width: 120, render: v => <Tag color="cyan">{v}</Tag> },
        { title: 'Tên VT tập kết', dataIndex: 'ten_vi_tri', ellipsis: true },
        {
          title: 'Thao tác', width: 100, fixed: 'right',
          render: (_, r) => (
            <Space size="middle">
              <Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined style={{color:'#1890ff'}}/>} onClick={()=>{setViTriModal({open:true,editingId:r.id}); formViTri.setFieldsValue(r)}}/></Tooltip>
              <Tooltip title="Xóa"><Button size="small" type="text" icon={<DeleteOutlined style={{color:'#ff4d4f'}}/>} onClick={()=>handleDeleteViTri(r.id)}/></Tooltip>
            </Space>
          )
        }
      ]

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>🏗️ {ct.ten_kho}</Title>
            <Space>
              <Button type="primary" ghost icon={<BuildOutlined />} onClick={() => navigate('/bao-cao', { state: { khoId: ct.id } })}>Báo cáo vật tư</Button>
              <Button icon={<EditOutlined />} onClick={() => { setKhoModal({open:true,editingId:ct.id}); formKho.setFieldsValue(ct) }}>Sửa</Button>
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteKho(ct.id)}>Xóa</Button>
            </Space>
          </div>
          <p><b>Mã công trình:</b> <Tag color="blue">{ct.ma_kho}</Tag></p>
          {ct.dia_chi && <p><b>Địa chỉ:</b> {ct.dia_chi}</p>}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
            <Text strong>Danh sách Vị trí tập kết ({viTris.length})</Text>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { 
              setViTriModal({open:true,editingId:null,defaultKhoId:ct.id}); 
              formViTri.resetFields();
              formViTri.setFieldsValue({ kho_id: ct.id });
            }}>
              Thêm Vị trí
            </Button>
          </div>
          <Table dataSource={viTris} columns={cols} rowKey="id" pagination={false} size="small" bordered />
        </div>
      )
    }

    if (selectedNodeData.type === 'vitri') {
      const vt = selectedNodeData.data
      const ct = khoList.find(k => k.id === vt.kho_id)
      return (
        <div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>📍 {vt.ten_vi_tri}</Title>
            <Space>
              <Button type="primary" ghost icon={<BuildOutlined />} onClick={() => navigate('/bao-cao', { state: { khoId: ct.id } })}>Báo cáo vật tư</Button>
              <Button icon={<EditOutlined />} onClick={() => { setViTriModal({open:true,editingId:vt.id}); formViTri.setFieldsValue(vt) }}>Sửa</Button>
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteViTri(vt.id)}>Xóa</Button>
            </Space>
          </div>
          <p><b>Mã Vị trí:</b> <Tag color="cyan">{vt.ma_vi_tri}</Tag></p>
          <p><b>Thuộc công trình:</b> {ct?.ten_kho || '—'}</p>
        </div>
      )
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card 
            title="Sơ đồ Công trình" 
            extra={<Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { setKhoModal({open:true,editingId:null}); formKho.resetFields() }}>Thêm CT</Button>}
            styles={{ body: { padding: '12px 16px', minHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
          >
            {loading && khoList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>Đang tải...</div>
            ) : (
              <Tree
                showIcon
                defaultExpandAll
                treeData={treeData}
                selectedKeys={selectedKeys}
                onSelect={(keys) => setSelectedKeys(keys)}
              />
            )}
          </Card>
        </Col>
        <Col span={16} style={{ position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
          <Card styles={{ body: { padding: '24px', minHeight: 'calc(100vh - 180px)' } }}>
            {renderDetail()}
          </Card>
        </Col>

        {/* Modal Kho (Công trình) */}
        <Modal title={khoModal.editingId ? 'Sửa Công trình' : 'Thêm Công trình'} open={khoModal.open} onOk={handleKhoSubmit} onCancel={() => setKhoModal({open:false,editingId:null})}>
          <Form form={formKho} layout="vertical">
            <Form.Item name="ma_kho" label="Mã công trình" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="ten_kho" label="Tên công trình" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="dia_chi" label="Địa chỉ"><Input.TextArea /></Form.Item>
          </Form>
        </Modal>

        {/* Modal Vị trí (Vị trí tập kết) */}
        <Modal title={viTriModal.editingId ? 'Sửa Vị trí tập kết' : 'Thêm Vị trí tập kết'} open={viTriModal.open} onOk={handleViTriSubmit} onCancel={() => setViTriModal({open:false,editingId:null})}>
          <Form form={formViTri} layout="vertical">
            <Form.Item name="kho_id" label="Thuộc công trình" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="children" disabled={viTriModal.defaultKhoId != null}>
                {khoList.map(k => <Option key={k.id} value={k.id}>{k.ten_kho}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="ma_vi_tri" label="Mã VT tập kết" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="ten_vi_tri" label="Tên VT tập kết" rules={[{ required: true }]}><Input /></Form.Item>
          </Form>
        </Modal>
      </Row>
    </div>
  )
}
