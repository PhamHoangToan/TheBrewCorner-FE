import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalculatorOutlined,
  EditOutlined,
  EllipsisOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, message } from 'antd'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { tableService } from '../../services/table.service'
import { orderService } from '../../services/order.service'
import { useSocketEvent } from '../../hooks/useSocket'
import styles from './cashier.module.css'

type TabKey = 'serving' | 'payment' | 'takeaway'

interface OrderItem {
  id: string
  name: string
  qty: number
  price: number
}

interface TableOrder {
  id: string
  tableId: string
  orderRef: string
  tableName: string
  total: string
  elapsed: string
  people: number
  status: string
  type: string
  invoicePaid: boolean
  pendingTransfer: boolean
  items: OrderItem[]
}

const toNum = (v: any) => parseFloat(String(v ?? 0)) || 0

const readNote = (note?: string | null): Record<string, string> => {
  if (!note) return {}
  try { return JSON.parse(note) } catch { return {} }
}

const mapOrderItems = (items: any[]): OrderItem[] =>
  (items ?? [])
    .filter((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status))
    .map((i: any) => ({
      id: i.id,
      name: i.productName ?? '',
      qty: Number(i.quantity ?? 1),
      price: toNum(i.unitPrice ?? i.price),
    }))

const mapTableToOrder = (table: any, order: any): TableOrder => {
  const area = table.area?.name ?? ''
  const tableName = `${area ? area + ' / ' : ''}${table.name ?? table.code ?? 'Bàn ?'}`
  const elapsed = order.createdAt
    ? `${dayjs().diff(dayjs(order.createdAt), 'minute')}'`
    : '0\''
  const orderItems = mapOrderItems(order.items ?? [])
  const note = readNote(order.note)
  const invoicePaid = order.invoice?.status === 'PAID'
  return {
    id: order.id,
    tableId: table.id,
    orderRef: order.code ?? '',
    tableName,
    total: `${toNum(order.totalAmount).toLocaleString('vi-VN')} VND`,
    elapsed,
    people: order.peopleCount ?? orderItems.reduce((s, i) => s + i.qty, 0),
    status: order.status ?? 'SENT',
    type: order.type ?? 'DINE_IN',
    invoicePaid,
    pendingTransfer: note.paymentMethod === 'transfer' && !invoicePaid,
    items: orderItems,
  }
}

const mapTakeaway = (order: any): TableOrder => {
  const elapsed = order.createdAt
    ? `${dayjs().diff(dayjs(order.createdAt), 'minute')}'`
    : '0\''
  const orderItems = mapOrderItems(order.items ?? [])
  const note = readNote(order.note)
  const invoicePaid = order.invoice?.status === 'PAID'
  return {
    id: order.id,
    tableId: '',
    orderRef: order.code ?? '',
    tableName: 'Mang về',
    total: `${toNum(order.totalAmount).toLocaleString('vi-VN')} VND`,
    elapsed,
    people: orderItems.reduce((s, i) => s + i.qty, 0),
    status: order.status ?? 'SENT',
    type: 'TAKE_AWAY',
    invoicePaid,
    pendingTransfer: note.paymentMethod === 'transfer' && !invoicePaid,
    items: orderItems,
  }
}

const STATUS_LABEL: Record<string, string> = {
  SENT: 'Chờ làm', PREPARING: 'Đang làm', READY: 'Xong - chờ phục vụ',
  SERVED: 'Đã phục vụ', CHECKOUT_REQUESTED: 'Chờ thanh toán',
}

const STATUS_CLASS: Record<string, string> = {
  SENT: styles.statusSent, PREPARING: styles.statusPreparing, READY: styles.statusReady,
  SERVED: styles.statusServed, CHECKOUT_REQUESTED: styles.statusCheckout,
}

const ACTIVE_STATUSES = new Set(['SENT', 'PREPARING', 'READY', 'SERVED', 'CHECKOUT_REQUESTED'])
const SERVING_STATUSES = new Set(['SENT', 'PREPARING', 'READY', 'SERVED'])

const CashierHome: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<TableOrder[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('serving')
  const [refreshing, setRefreshing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        tableService.list({ limit: '100' }),
        orderService.list({ limit: '100' }),
      ])

      const tables: any[] = tablesRes.data?.items ?? tablesRes.data ?? []
      const allOrders: any[] = ordersRes.data?.items ?? ordersRes.data ?? []

      // DINE_IN: derive from tables so order matches TableMap
      const dineIn: TableOrder[] = []
      for (const table of tables) {
        const activeOrder = table.status === 'AVAILABLE' ? null : (table.orders ?? []).find(
          (o: any) => ACTIVE_STATUSES.has(o.status),
        )
        if (activeOrder) {
          dineIn.push(mapTableToOrder(table, activeOrder))
        }
      }

      // TAKE_AWAY: from orders API (no table link)
      const takeaway: TableOrder[] = allOrders
        .filter((o: any) => o.type === 'TAKE_AWAY' && ACTIVE_STATUSES.has(o.status))
        .map(mapTakeaway)

      setOrders([...dineIn, ...takeaway])
    } catch {
      // keep previous state on error
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [])

  useSocketEvent('notification:new', () => { fetchOrders(true) })

  useEffect(() => {
    fetchOrders()
    timerRef.current = setInterval(() => fetchOrders(true), 30000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchOrders])

  const handleRequestCheckout = async (orderId: string) => {
    try {
      await orderService.update(orderId, { status: 'CHECKOUT_REQUESTED' })
      message.success('Đã gửi yêu cầu thanh toán')
      fetchOrders(true)
    } catch {
      message.error('Thao tác thất bại')
    }
  }

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
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Danh sách bàn" />

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
        {filtered.map((order) => (
          <div
            key={order.id}
            className={styles.tableCard}
            onClick={() => navigate(`/order/${order.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderRow}>
                <span>{order.orderRef} — {order.tableName}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {order.pendingTransfer && (
                    <span className={styles.transferBadge}>💳 Chờ CK</span>
                  )}
                  {order.status && (
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[order.status] ?? ''}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.cardBody}>
              {order.items.length > 0 ? (
                <div className={styles.itemsList}>
                  {order.items.slice(0, 4).map((it) => (
                    <div key={it.id} className={styles.itemRow}>
                      <span className={styles.itemName}>{it.name} x{it.qty}</span>
                      <span className={styles.itemPrice}>
                        {(it.price * it.qty).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className={styles.moreItems}>+{order.items.length - 4} món khác...</div>
                  )}
                </div>
              ) : (
                <div className={styles.noItems}>Chưa có món</div>
              )}

              <div className={styles.cardFooter}>
                <div>
                  <div className={styles.cardTotal}>{order.total}</div>
                  <div className={styles.cardTime}>⏱ {order.elapsed} — {order.people} người</div>
                </div>
              </div>

              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="Xem / Sửa"
                  onClick={() => navigate(`/order/${order.id}`)}
                >
                  <EditOutlined />
                </button>
                {!order.invoicePaid && (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Thanh toán"
                    onClick={() => navigate(`/cashier/payment?orderId=${order.id}`)}
                  >
                    <CalculatorOutlined />
                  </button>
                )}
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'add',
                        label: 'Thêm món',
                        onClick: () => navigate(`/order?tableId=${order.tableId || order.id}`),
                      },
                      {
                        key: 'checkout',
                        label: 'Yêu cầu thanh toán',
                        onClick: () => handleRequestCheckout(order.id),
                      },
                    ],
                  }}
                  trigger={['click']}
                  placement="topRight"
                >
                  <button type="button" className={styles.iconBtn} title="Tuỳ chọn">
                    <EllipsisOutlined />
                  </button>
                </Dropdown>
              </div>
            </div>
          </div>
        ))}

        <button type="button" className={styles.addBtn} onClick={() => navigate('/order')}>
          <PlusOutlined />
        </button>
      </div>
    </AppLayout>
  )
}

export default CashierHome
