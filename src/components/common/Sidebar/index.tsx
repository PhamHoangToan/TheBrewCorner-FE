import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion'
import {
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  GiftOutlined,
  HistoryOutlined,
  InboxOutlined,
  LeftOutlined,
  ShoppingCartOutlined,
  TableOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useUiStore } from '../../../store/ui.store'
import { useAuth } from '../../../hooks/useAuth'
import { useIsMobile } from '../../../hooks/useIsMobile'
import styles from './sidebar.module.css'

type Role = 'admin' | 'cashier' | 'barista' | 'waiter'

interface MenuItem {
  key: string
  label: string
  icon: React.ReactNode
}

const MENU_BY_ROLE: Record<Role, MenuItem[]> = {
  admin: [
    { key: '/dashboard',       label: 'Dashboard',       icon: <DashboardOutlined /> },
    { key: '/menu/products',   label: 'Thực đơn',        icon: <CoffeeOutlined /> },
    { key: '/menu/categories', label: 'Danh mục',        icon: <AppstoreOutlined /> },
    { key: '/staff',           label: 'Nhân viên',       icon: <TeamOutlined /> },
    { key: '/staff-requests',  label: 'Yêu cầu nhân viên', icon: <FileTextOutlined /> },
    { key: '/inventory',       label: 'Kho nguyên liệu', icon: <InboxOutlined /> },
    { key: '/reports',         label: 'Báo cáo',         icon: <BarChartOutlined /> },
    { key: '/shift',           label: 'Ca làm việc',     icon: <ClockCircleOutlined /> },
    { key: '/attendance',      label: 'Chấm công',       icon: <CalendarOutlined /> },
    { key: '/payroll',         label: 'Bảng lương',      icon: <DollarOutlined /> },
    { key: '/promotions',      label: 'Khuyến mãi',      icon: <GiftOutlined /> },
    { key: '/activity-logs',   label: 'Nhật ký hoạt động', icon: <HistoryOutlined /> },
  ],
  cashier: [
    { key: '/cashier',          label: 'Trang chủ', icon: <DashboardOutlined /> },
    { key: '/table-map',        label: 'Sơ đồ bàn', icon: <TableOutlined /> },
    { key: '/cashier/order',    label: 'Đặt hàng',  icon: <ShoppingCartOutlined /> },
    { key: '/cashier/payment',  label: 'Thanh toán', icon: <DollarOutlined /> },
    { key: '/cashier/finance',  label: 'Thu chi',    icon: <BarChartOutlined /> },
  ],
  barista: [
    { key: '/barista',       label: 'Trang chủ', icon: <DashboardOutlined /> },
    { key: '/orders',        label: 'Đơn hàng',  icon: <ShoppingCartOutlined /> },
    { key: '/menu/products', label: 'Thực đơn',  icon: <CoffeeOutlined /> },
  ],
  waiter: [
    { key: '/waiter',    label: 'Trang chủ', icon: <DashboardOutlined /> },
    { key: '/table-map', label: 'Sơ đồ bàn', icon: <TableOutlined /> },
    { key: '/orders',    label: 'Gọi món',   icon: <ShoppingCartOutlined /> },
  ],
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên', cashier: 'Thu ngân',
  barista: 'Pha chế', waiter: 'Phục vụ',
}

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map((w) => w[0]).slice(-2).join('').toUpperCase()

interface Props { role: Role }

const Sidebar: React.FC<Props> = ({ role }) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const collapsed = useUiStore((s) => s.collapsed)
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed)
  const isMobile = useIsMobile(992)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)

  const items = MENU_BY_ROLE[role]
  const EXACT_KEYS = new Set(['/cashier', '/barista', '/waiter', '/dashboard'])
  const isActive = (key: string) =>
    EXACT_KEYS.has(key) ? pathname === key : pathname === key || pathname.startsWith(key + '/')

  const effectiveCollapsed = isMobile ? false : collapsed
  const handleNavigate = (key: string) => {
    navigate(key)
    if (isMobile) setMobileOpen(false)
  }

  return (
    <motion.div
      className={`${styles.sider} ${isMobile ? styles.siderMobile : ''} ${isMobile && mobileOpen ? styles.siderMobileOpen : ''}`}
      animate={isMobile ? { width: 240, x: 0 } : { width: collapsed ? 64 : 240, x: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 220 }}
    >
      {/* Brand */}
      <div className={`${styles.brand} ${effectiveCollapsed ? styles.brandCollapsed : ''}`}>
        <span className={styles.brandIcon}>☕</span>
        <AnimatePresence initial={false}>
          {!effectiveCollapsed && (
            <motion.div
              className={styles.brandText}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.05 } }}
              exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
            >
              <div className={styles.brandName}>The Brew Corner</div>
              <div className={styles.brandSub}>Quản lý quán cà phê</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <LayoutGroup>
          {items.map((item) => {
            const active = isActive(item.key)
            const el = (
              <div
                key={item.key}
                className={`${styles.menuItem} ${effectiveCollapsed ? styles.menuItemCollapsed : ''}`}
                onClick={() => handleNavigate(item.key)}
              >
                {active && (
                  <motion.div
                    layoutId="activeBar"
                    className={styles.activePill}
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  />
                )}
                <span className={`${styles.menuIcon} ${active ? styles.menuIconActive : ''}`}>
                  {item.icon}
                </span>
                <AnimatePresence initial={false}>
                  {!effectiveCollapsed && (
                    <motion.span
                      className={`${styles.menuLabel} ${active ? styles.menuLabelActive : ''}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0, transition: { duration: 0.18, delay: 0.04 } }}
                      exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )
            return effectiveCollapsed ? (
              <Tooltip key={item.key} title={item.label} placement="right">
                {el}
              </Tooltip>
            ) : (
              <React.Fragment key={item.key}>{el}</React.Fragment>
            )
          })}
        </LayoutGroup>
      </nav>

      {/* User info (expanded only) */}
      <AnimatePresence initial={false}>
        {!effectiveCollapsed && user && (
          <motion.div
            className={styles.userInfo}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: 0.05 } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
          >
            <div className={styles.userAvatar}>{getInitials(user.name)}</div>
            <div className={styles.userText}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>{ROLE_LABELS[role]}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        className={styles.toggleBtn}
        onClick={() => (isMobile ? setMobileOpen(false) : toggleCollapsed())}
        aria-label={isMobile ? 'Đóng menu' : 'Thu gọn menu'}
      >
        {isMobile ? (
          <span className={styles.toggleIcon}>
            <CloseOutlined />
          </span>
        ) : (
          <motion.span
            className={styles.toggleIcon}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          >
            <LeftOutlined />
          </motion.span>
        )}
      </button>
    </motion.div>
  )
}

export default Sidebar
