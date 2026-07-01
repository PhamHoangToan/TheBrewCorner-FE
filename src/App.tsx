import React from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import AppRouter from './router'

const App: React.FC = () => (
  <ConfigProvider
    locale={viVN}
    theme={{
      token: {
        colorPrimary: '#662C21',
        borderRadius: 8,
        fontFamily: 'Montserrat, Lato, sans-serif',
      },
    }}
  >
    <AntApp>
      <AppRouter />
    </AntApp>
  </ConfigProvider>
)

export default App
