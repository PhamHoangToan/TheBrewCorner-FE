import React, { useEffect, useState } from 'react'
import { Layout } from 'antd'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  MenuOutlined,
  PoweroffOutlined,
} from '@ant-design/icons'
import NotificationBell from '../NotificationBell'
import { useUiStore } from '../../../store/ui.store'
import styles from './header.module.css'

const { Header: AntHeader } = Layout

type Role = 'admin' | 'cashier' | 'barista' | 'waiter'

interface Props {
  username: string
  role: Role
  onLogout: () => void
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Chủ cửa hàng',
  cashier: 'Thu ngân',
  barista: 'Pha chế',
  waiter: 'Phục vụ',
}

const GREET = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const Header: React.FC<Props> = ({ username, role, onLogout }) => {
  const [now, setNow] = useState(new Date())
  const toggleMobileOpen = useUiStore((s) => s.toggleMobileOpen)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const initials = username
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <AntHeader className={styles.header}>
      <button
        type="button"
        className={styles.hamburgerBtn}
        onClick={toggleMobileOpen}
        aria-label="Mở menu"
      >
        <MenuOutlined />
      </button>

      {/* LEFT — greeting + datetime */}
      <div className={styles.left}>
        <div className={styles.greeting}>
          {GREET()}, <strong>{username.split(' ').pop()}</strong> 👋
        </div>
        <div className={styles.datetime}>
          <span className={styles.datetimeItem}>
            <CalendarOutlined /> {dateStr}
          </span>
          <span className={styles.datetimeDot}>·</span>
          <span className={styles.datetimeItem}>
            <ClockCircleOutlined /> {timeStr}
          </span>
        </div>
      </div>

      {/* RIGHT — notifications + user + logout */}
      <div className={styles.right}>
        <NotificationBell />

        <div className={styles.divider} />

        {/* User */}
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userText}>
            <span className={styles.username}>{username}</span>
            <span className={styles.roleLabel}>{ROLE_LABELS[role]}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Logout */}
        <button type="button" className={styles.logoutBtn} onClick={onLogout}>
          <PoweroffOutlined className={styles.logoutIcon} />
          <span className={styles.logoutText}>Đăng xuất</span>
        </button>
      </div>
    </AntHeader>
  )
}

export default Header
