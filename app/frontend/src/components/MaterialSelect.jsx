import React, { useState, useEffect, useMemo } from 'react'
import { Select, Spin, Typography, Space } from 'antd'
import { vatTuApi, baoCaoApi } from '../services/api'

const { Option } = Select
const { Text } = Typography

export default function MaterialSelect({ value, onChange, khoId, style, ...props }) {
  const [data, setData] = useState([])
  const [fetching, setFetching] = useState(false)
  const [inventoryMap, setInventoryMap] = useState({})

  // Fetch tồn kho nếu có khoId
  useEffect(() => {
    if (khoId) {
      baoCaoApi.tongHopTonKho({ kho_ids: khoId }).then(res => {
        const map = {}
        res.data.data.forEach(item => {
          map[item.ma_hang] = item
        })
        setInventoryMap(map)
      }).catch(e => console.error(e))
    } else {
      setInventoryMap({})
    }
  }, [khoId])

  const fetchMaterials = useMemo(() => {
    const loadData = async (search) => {
      setFetching(true)
      try {
        const res = await vatTuApi.getList({ limit: 100, search: search || undefined })
        setData(res.data.items)
      } finally {
        setFetching(false)
      }
    }
    // Debounce
    let timeoutId
    return (search) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => loadData(search), 500)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchMaterials('')
  }, [fetchMaterials])

  return (
    <Select
      showSearch
      labelInValue={false}
      filterOption={false}
      onSearch={fetchMaterials}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      value={value}
      onChange={(val, option) => {
        // Truyền thêm cả object vật tư qua onChange để form tính toán
        onChange?.(val, option?.['data-vt'])
      }}
      style={{ width: '100%', ...style }}
      dropdownMatchSelectWidth={500}
      listHeight={300}
      {...props}
    >
      {data.map(vt => {
        const ton = inventoryMap[vt.ma_hang]
        return (
          <Option key={vt.id} value={vt.id} data-vt={vt} title={vt.ten_hang}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text code style={{ fontSize: 11, minWidth: 90 }}>{vt.ma_hang}</Text>
                <Text strong>{vt.ten_hang}</Text>
              </Space>
              <Space style={{ marginLeft: 16 }}>
                <Text type="secondary">{vt.dvt?.ten || 'Kg'}</Text>
                {khoId && (
                  <Text type={ton?.ton_sl > 0 ? 'success' : 'danger'} style={{ minWidth: 60, textAlign: 'right' }}>
                    Tồn: {ton?.ton_sl ? ton.ton_sl.toLocaleString('vi-VN') : 0}
                  </Text>
                )}
              </Space>
            </div>
          </Option>
        )
      })}
    </Select>
  )
}
