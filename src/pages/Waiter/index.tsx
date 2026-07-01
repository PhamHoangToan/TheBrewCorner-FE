import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReloadOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { tableService } from '../../services/table.service'
import { orderService } from '../../services/order.service'
import { useSocketEvent } from '../../hooks/useSocket'
import styles from './waiter.module.css'

type TabKey = 'serving' | 'payment' | 'takeaway'

interface MenuItem {
  id: string
  name: string
  qty: number
  status: string
}

interface TableCard {
  id: string
  tableId: string
  orderRef: string
  tableName: string
  elapsed: string
  status: string
  type: string
  items: MenuItem[]
}

const ACTIVE_STATUSES = new Set(['SENT', 'PREPARING', 'READY', 'SERVED', 'CHECKOUT_REQUESTED'])
const SERVING_STATUSES = new Set(['SENT', 'PREPARING', 'READY', 'SERVED'])

const mapItems = (rawItems: any[]): MenuItem[] =>
  (rawItems ?? [])
    .filter((i: any) =>
      i.status !== 'RETURNED' &&
      i.status !== 'CANCELLED' &&
      !String(i.note ?? '').startsWith('RETURN_REQUEST'),
    )
    .map((i: any) => ({
      id: i.id,
      name: i.productName ?? i.name ?? '',
      qty: i.quantity ?? 1,
      status: i.status ?? 'PENDING',
    }))

const mapTableToCard = (table: any, order: any): TableCard => {
  const area = table.area?.name ?? ''
  const tableName = `${table.name ?? table.code ?? 'Bàn ?'}${area ? ' - ' + area : ''}`
  const elapsed = order.createdAt
    ? `${dayjs().diff(dayjs(order.createdAt), 'minute')}'`
    : '0\''
  return {
    id: order.id,
    tableId: table.id,
    orderRef: order.code ?? '',
    tableName,
    elapsed,
    status: order.status ?? 'SENT',
    type: order.type ?? 'DINE_IN',
    items: mapItems(order.items ?? []),
  }
}

const mapTakeaway = (order: any): TableCard => {
  const elapsed = order.createdAt
    ? `${dayjs().diff(dayjs(order.createdAt), 'minute')}'`
    : '0\''
  return {
    id: order.id,
    tableId: '',
    orderRef: order.code ?? '',
    tableName: 'Mang về',
    elapsed,
    status: order.status ?? 'SENT',
    type: 'TAKE_AWAY',
    items: mapItems(order.items ?? []),
  }
}

const WaiterHome: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<TableCard[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('serving')
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        tableService.list({ limit: '100' }),
        orderService.list({ limit: '100' }),
      ])

      const tables: any[] = tablesRes.data?.items ?? tablesRes.data ?? []
      const allOrders: any[] = ordersRes.data?.items ?? ordersRes.data ?? []

      const dineIn: TableCard[] = []
      for (const table of tables) {
        const activeOrder = (table.orders ?? []).find(
          (o: any) => ACTIVE_STATUSES.has(o.status),
        )
        if (activeOrder) {
          dineIn.push(mapTableToCard(table, activeOrder))
        }
      }

      const takeaway: TableCard[] = allOrders
        .filter((o: any) => o.type === 'TAKE_AWAY' && ACTIVE_STATUSES.has(o.status))
        .map(mapTakeaway)

      setOrders([...dineIn, ...takeaway])
    } catch {
      setOrders([])
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [])

  useSocketEvent('notification:new', () => { fetchOrders(true) })

  useEffect(() => {
    fetchOrders()
    const timer = setInterval(() => fetchOrders(true), 30000)
    return () => clearInterval(timer)
  }, [fetchOrders])

  const filtered = orders.filter((o) => {
    if (activeTab === 'takeaway') return o.type === 'TAKE_AWAY'
    if (activeTab === 'payment') return o.status === 'CHECKOUT_REQUESTED'
    return SERVING_STATUSES.has(o.status) && o.type !== 'TAKE_AWAY'
  })

  const tabLabels: Record<TabKey, string> = {
    serving: `Đang phục vụ (${orders.filter((o) => SERVING_STATUSES.has(o.status) && o.type !== 'TAKE_AWAY').length})`,
    payment: `Yêu cầu thanh toán (${orders.filter((o) => o.status === 'CHECKOUT_REQUESTED').length})`,
    takeaway: `Mang về (${orders.filter((o) => o.type === 'TAKE_AWAY').length})`,
  }

  return (
    <AppLayout role={user?.role ?? 'waiter'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Gọi món" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className={styles.tabsRow} style={{ marginBottom: 0, flex: 1 }}>
          {(Object.keys(tabLabels) as TabKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`${styles.tab} ${activeTab === k ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(k)}
            >
              {tabLabels[k]}
            </button>
          ))}
        </div>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => fetchOrders()}>
          Làm mới
        </Button>
      </div>

      <div className={styles.cardsGrid}>
        {filtered.map((table) => (
          <div key={table.id} className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <span>{table.tableName} — Order {table.orderRef}</span>
              <span className={styles.clockBadge}>⏱ {table.elapsed}</span>
            </div>
            <div className={styles.cardBody}>
              {table.items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <span>{item.name} ({item.qty})</span>
                </div>
              ))}
              <Button
                className={styles.returnBtn}
                onClick={() => navigate(`/waiter/return/${table.id}`)}
              >
                📦 Trả món
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#888', padding: 24 }}>Không có đơn hàng nào</div>
        )}
      </div>
    </AppLayout>
  )
}

export default WaiterHome
