import React, { useRef, useState } from 'react'
import { Badge } from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../../hooks/useNotifications'
import type { AppNotification } from '../../../services/notification.service'
import styles from './index.module.css'

const TYPE_ICONS: Record<string, string> = {
  ORDER_NEW: '🛎️',
  ORDER_PREPARING: '👨‍🍳',
  ORDER_READY: '🍽️',
  ORDER_CANCELLED: '🚫',
  ITEM_PREPARING: '⏳',
  ITEM_READY: '🍽️',
  ITEM_SERVED: '✅',
  ITEM_CANCELLED: '🚫',
  RETURN_REQUEST: '↩️',
  RETURN_APPROVED: '👍',
  RETURN_REJECTED: '❌',
  CHECKOUT_REQUESTED: '💳',
}

const NAVIGATE_MAP: Record<string, (refId: string | null, role?: string) => string> = {
  ORDER_NEW: (_, role) => role === 'cashier' ? '/cashier' : role === 'waiter' ? '/waiter' : '/barista',
  ORDER_PREPARING: (id) => (id ? `/order/${id}` : '/cashier'),
  ORDER_READY: (id) => (id ? `/order/${id}` : '/cashier'),
  ORDER_CANCELLED: (id) => (id ? `/order/${id}` : '/cashier'),
  ITEM_PREPARING: (id) => (id ? `/order/${id}` : '/cashier'),
  ITEM_READY: (id) => (id ? `/order/${id}` : '/cashier'),
  ITEM_SERVED: (id) => (id ? `/order/${id}` : '/cashier'),
  ITEM_CANCELLED: (id) => (id ? `/order/${id}` : '/cashier'),
  RETURN_REQUEST: () => '/barista/returns',
  RETURN_APPROVED: () => '/waiter',
  RETURN_REJECTED: () => '/waiter',
  CHECKOUT_REQUESTED: () => '/cashier/payment',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markRead, markAllRead, loadMore, hasMore } = useNotifications()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleItem = (n: AppNotification) => {
    if (!n.read) markRead(n.id)
    const getPath = NAVIGATE_MAP[n.type]
    if (getPath) navigate(getPath(n.refId, n.role))
    setOpen(false)
  }

  return (
    <div className={styles.wrap} ref={dropdownRef}>
      <Badge count={unreadCount} size="small" color="#662C21" overflowCount={99}>
        <button type="button" className={styles.bell} onClick={() => setOpen((v) => !v)}>
          <BellOutlined />
        </button>
      </Badge>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <button type="button" className={styles.readAll} onClick={markAllRead}>
                <CheckOutlined /> Đọc tất cả
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 && (
              <div className={styles.empty}>Không có thông báo</div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`${styles.item} ${n.read ? styles.read : styles.unread}`}
                onClick={() => handleItem(n)}
              >
                <span className={styles.icon}>{TYPE_ICONS[n.type] ?? '🔔'}</span>
                <div className={styles.content}>
                  <div className={styles.title}>{n.title}</div>
                  <div className={styles.body}>{n.body}</div>
                  <div className={styles.time}>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && <span className={styles.dot} />}
              </button>
            ))}
            {hasMore && (
              <button type="button" className={styles.loadMore} onClick={loadMore}>
                Xem thêm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
