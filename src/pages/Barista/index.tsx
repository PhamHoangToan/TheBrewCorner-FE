import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Button, message, Select } from 'antd'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { orderService } from '../../services/order.service'
import { useSocketEvent } from '../../hooks/useSocket'
import styles from './barista.module.css'

interface MenuItem {
  id: string
  orderId: string
  name: string
  qty: number
  status: string
}

interface OrderCard {
  id: string
  tableName: string
  orderRef: string
  waiter: string
  elapsedMin: number
  orderStatus: string
  items: MenuItem[]
}

const STATUS_OPTIONS = [
  { value: 'SENT',      label: 'Chờ làm' },
  { value: 'PREPARING', label: 'Đang làm' },
  { value: 'READY',     label: 'Xong' },
  { value: 'SERVED',    label: 'Đã phục vụ' },
]

const ACTIVE_ORDER_STATUSES = new Set(['SENT', 'PREPARING', 'READY'])
const DONE_ITEM_STATUSES = new Set(['SERVED', 'RETURNED', 'CANCELLED'])

const mapOrder = (item: any, idx: number): OrderCard => {
  const elapsedMin = item.createdAt ? dayjs().diff(dayjs(item.createdAt), 'minute') : 0
  const area = item.table?.area?.name ?? ''
  const tableName = item.table
    ? `${item.table.name ?? item.table.code} ${area ? '- ' + area : ''}`
    : (item.type === 'TAKE_AWAY' ? 'Mang về' : `Order ${idx + 1}`)
  return {
    id: item.id ?? String(idx),
    tableName,
    orderRef: `Order: ${item.code ?? idx + 1}`,
    waiter: item.createdBy?.name ?? '',
    elapsedMin,
    orderStatus: item.status ?? 'SENT',
    items: (item.items ?? []).map((i: any) => ({
      id: i.id,
      orderId: item.id,
      name: i.productName ?? i.name ?? '',
      qty: i.quantity ?? 1,
      status: i.status ?? 'PENDING',
    })),
  }
}

const getTimeBadgeClass = (min: number) => {
  if (min > 15) return styles.timeBadgeRed
  if (min > 5) return styles.timeBadgeOrange
  return styles.timeBadgeGreen
}

const BaristaHome: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderCard[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await orderService.list({ limit: '100' })
      const all: any[] = res.data?.items ?? res.data ?? []
      const active = all.filter((o: any) => {
        if (ACTIVE_ORDER_STATUSES.has(o.status)) return true
        // PAID nhưng còn item chưa phục vụ → barista vẫn cần làm
        if (o.status === 'PAID') {
          return (o.items ?? []).some((i: any) => !DONE_ITEM_STATUSES.has(i.status))
        }
        return false
      })
      setOrders(active.map(mapOrder))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useSocketEvent('notification:new', () => { fetchOrders() })

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await orderService.update(orderId, { status })
      message.success('Đã cập nhật trạng thái')
      fetchOrders()
    } catch { message.error('Cập nhật thất bại') }
  }

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.topNav}>
        <button type="button" className={styles.navTab}>
          DS món chế biến
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${styles.navTabInactive}`}
          onClick={() => navigate('/barista/inventory')}
        >
          Quản lý Kho
        </button>
      </div>

      <div className={styles.actionRow}>
        <Button className={styles.btnBaohет} onClick={fetchOrders} loading={loading}>🔄 Làm mới</Button>
        <Button className={styles.btnTrahet} onClick={() => navigate('/barista/returns')}>📋 DS trả món</Button>
      </div>

      {orders.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>Chưa có order nào đang chờ</div>
      )}

      <div className={styles.cardsGrid}>
        {orders.map((order) => (
          <div key={order.id} className={styles.orderCard}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardHeaderTitle}>{order.tableName}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{order.orderRef}</div>
              </div>
              <div className={styles.clockBadge}>
                <ClockCircleOutlined />
                {order.elapsedMin}'
              </div>
            </div>
            <div className={styles.cardBody}>
              {order.waiter && <div className={styles.waiterRow}>Phục vụ: {order.waiter}</div>}
              {order.items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <span>{item.name} ({item.qty})</span>
                </div>
              ))}
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                {order.orderStatus === 'PAID' ? (
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{ background: '#499b6b', border: 'none', flex: 1 }}
                    onClick={() => updateOrderStatus(order.id, 'SERVED')}
                  >
                    Hoàn tất phục vụ
                  </Button>
                ) : (
                  <>
                    <Select
                      value={order.orderStatus}
                      size="small"
                      style={{ flex: 1 }}
                      options={STATUS_OPTIONS}
                      onChange={(val) => updateOrderStatus(order.id, val)}
                    />
                    {order.orderStatus === 'READY' && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        style={{ background: '#499b6b', border: 'none' }}
                        onClick={() => updateOrderStatus(order.id, 'SERVED')}
                      >
                        Phục vụ
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.statusBar}>
        {orders.slice(0, 6).map((order) => (
          <div key={order.id} className={styles.statusCard}>
            <div className={styles.statusCardName}>{order.tableName}</div>
            <div className={`${styles.timeBadge} ${getTimeBadgeClass(order.elapsedMin)}`}>
              <ClockCircleOutlined />
              {order.elapsedMin}'
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}

export default BaristaHome
