import React from 'react'
import { Layout } from 'antd'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Sidebar from '../Sidebar'
import Header from '../Header'
import PageTransition from '../PageTransition'
import { useUiStore } from '../../../store/ui.store'
import styles from './appLayout.module.css'

const { Content } = Layout

type Role = 'admin' | 'cashier' | 'barista' | 'waiter'

interface Props {
  children: React.ReactNode
  role: Role
  username: string
  onLogout: () => void
}

const AppLayout: React.FC<Props> = ({ children, role, username, onLogout }) => {
  const location = useLocation()
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)

  return (
    <Layout className={styles.layout}>
      <Sidebar role={role} />
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropVisible : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <Layout className={styles.innerLayout}>
        <Header username={username} role={role} onLogout={onLogout} />
        <Content className={styles.content}>
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
