import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import App from './App'

dayjs.locale('vi')

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1565C0',
          colorSuccess: '#2E7D32',
          colorWarning: '#E65100',
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Layout: { siderBg: '#1A3A5C', triggerBg: '#122844' },
          Menu: {
            darkItemBg: '#1A3A5C',
            darkSubMenuItemBg: '#122844',
            darkItemSelectedBg: '#1565C0',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </BrowserRouter>
)
