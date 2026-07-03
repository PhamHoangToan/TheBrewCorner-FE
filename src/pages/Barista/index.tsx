import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckOutlined, ClockCircleOutlined, ExpandOutlined, ShrinkOutlined } from '@ant-design/icons'
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

const playNewOrderBeep = () => {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as any).webkitAudioContext
    const ctx = new AudioContextCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Trình duyệt chặn AudioContext khi chưa có tương tác người dùng — bỏ qua, không ảnh hưởng luồng chính
  }
}

const BaristaHome: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const kdsMode = searchParams.get('mode') === 'kds'
  const [orders, setOrders] = useState<OrderCard[]>([])
  const [loading, setLoading] = useState(true)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const knownOrderIds = useRef<Set<string> | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await orderService.list({ limit: '100' })
      const all: any[] = res.data?.items ?? res.data ?? []
      // Trạng thái thanh toán nằm ở invoice — order.status thuần là tiến độ pha chế,
      // 'PAID' nghĩa là đã phục vụ xong VÀ đã thanh toán → không còn việc cho barista.
      // Đơn trả trước (invoice PAID nhưng chưa làm xong) vẫn ở SENT/PREPARING nên vào board bình thường.
      const active = all.filter((o: any) => ACTIVE_ORDER_STATUSES.has(o.status))
      const mapped = active.map(mapOrder)

      const previous = knownOrderIds.current
      if (previous) {
        const freshIds = mapped.filter((o) => !previous.has(o.id)).map((o) => o.id)
        if (freshIds.length > 0) {
          playNewOrderBeep()
          setNewOrderIds(new Set(freshIds))
          window.setTimeout(() => setNewOrderIds(new Set()), 5000)
        }
      }
      knownOrderIds.current = new Set(mapped.map((o) => o.id))

      setOrders(mapped)
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

  const toggleKdsMode = () => {
    setSearchParams(kdsMode ? {} : { mode: 'kds' })
  }

  const body = (
    <>
      {!kdsMode && (
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
      )}

      <div className={styles.actionRow}>
        <Button className={styles.btnBaohет} onClick={fetchOrders} loading={loading}>🔄 Làm mới</Button>
        {!kdsMode && (
          <Button className={styles.btnTrahet} onClick={() => navigate('/barista/returns')}>📋 DS trả món</Button>
        )}
        <Button
          icon={kdsMode ? <ShrinkOutlined /> : <ExpandOutlined />}
          onClick={toggleKdsMode}
        >
          {kdsMode ? 'Thoát chế độ KDS' : 'Chế độ KDS (màn hình bếp)'}
        </Button>
      </div>

      {orders.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>Chưa có order nào đang chờ</div>
      )}

      <div className={`${styles.cardsGrid} ${kdsMode ? styles.cardsGridKds : ''}`}>
        {orders.map((order) => (
          <div
            key={order.id}
            className={`${styles.orderCard} ${kdsMode ? styles.orderCardKds : ''} ${newOrderIds.has(order.id) ? styles.orderCardNew : ''}`}
          >
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {!kdsMode && (
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
      )}
    </>
  )

  if (kdsMode) {
    return <div className={styles.kdsContainer}>{body}</div>
  }

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      {body}
    </AppLayout>
  )
}

export default BaristaHome
