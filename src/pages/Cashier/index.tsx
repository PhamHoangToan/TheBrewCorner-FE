import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalculatorOutlined,
  EditOutlined,
  EllipsisOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, InputNumber, Modal, message } from 'antd'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { tableService } from '../../services/table.service'
import { orderService } from '../../services/order.service'
import { cashSessionService, type CashSession } from '../../services/cashSession.service'
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

  // ─── Ca quỹ tiền mặt ───
  const [session, setSession] = useState<CashSession | null>(null)
  const [openModalOpen, setOpenModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [openingFloat, setOpeningFloat] = useState(0)
  const [countedCash, setCountedCash] = useState(0)
  const [sessionBusy, setSessionBusy] = useState(false)

  const fetchSession = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await cashSessionService.current(user.id)
      setSession(res.data ?? null)
    } catch {
      setSession(null)
    }
  }, [user?.id])

  useEffect(() => { fetchSession() }, [fetchSession])

  const handleOpenSession = async () => {
    if (!user?.id) return
    setSessionBusy(true)
    try {
      await cashSessionService.open({ userId: user.id, openingFloat })
      message.success('Đã mở ca')
      setOpenModalOpen(false)
      fetchSession()
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Mở ca thất bại')
    } finally {
      setSessionBusy(false)
    }
  }

  const handleCloseSession = async () => {
    if (!session) return
    setSessionBusy(true)
    try {
      const res = await cashSessionService.close(session.id, { countedCash })
      const diff = res.data?.difference ?? 0
      message.success(
        diff === 0 ? 'Đóng ca — khớp quỹ' : `Đóng ca — ${diff > 0 ? 'thừa' : 'thiếu'} ${Math.abs(diff).toLocaleString('vi-VN')}đ`,
      )
      setCloseModalOpen(false)
      fetchSession()
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Đóng ca thất bại')
    } finally {
      setSessionBusy(false)
    }
  }

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

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: 12, borderRadius: 10,
          background: session ? '#f0fdf4' : '#fff7ed',
          border: `1px solid ${session ? '#bbf7d0' : '#fed7aa'}`,
        }}
      >
        {session ? (
          <>
            <span style={{ fontWeight: 600, color: '#166534' }}>🟢 Ca đang mở</span>
            <span style={{ color: '#555', fontSize: 13 }}>
              Từ {dayjs(session.openedAt).format('HH:mm DD/MM')} · Đầu ca {session.openingFloat.toLocaleString('vi-VN')}đ
            </span>
            <span style={{ color: '#555', fontSize: 13 }}>
              Tiền mặt dự kiến: <b>{(session.expectedCash ?? 0).toLocaleString('vi-VN')}đ</b>
            </span>
            <Button danger size="small" style={{ marginLeft: 'auto' }} onClick={() => { setCountedCash(session.expectedCash ?? 0); setCloseModalOpen(true) }}>
              Đóng ca
            </Button>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: '#9a3412' }}>🟠 Chưa mở ca quỹ</span>
            <span style={{ color: '#7c2d12', fontSize: 13 }}>Nên mở ca trước khi thu tiền mặt để đối soát cuối ca.</span>
            <Button type="primary" size="small" style={{ marginLeft: 'auto', background: '#662c21', borderColor: '#662c21' }} onClick={() => { setOpeningFloat(0); setOpenModalOpen(true) }}>
              Mở ca
            </Button>
          </>
        )}
      </div>

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

      <Modal
        title="Mở ca quỹ"
        open={openModalOpen}
        onOk={handleOpenSession}
        onCancel={() => setOpenModalOpen(false)}
        okText="Mở ca"
        cancelText="Hủy"
        confirmLoading={sessionBusy}
      >
        <div style={{ margin: '12px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tiền mặt đầu ca (tồn quỹ)</div>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={openingFloat}
            onChange={(v) => setOpeningFloat(Number(v ?? 0))}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number((v ?? '').replace(/,/g, ''))}
            addonAfter="đ"
          />
        </div>
      </Modal>

      <Modal
        title="Đóng ca — đối soát quỹ"
        open={closeModalOpen}
        onOk={handleCloseSession}
        onCancel={() => setCloseModalOpen(false)}
        okText="Đóng ca"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={sessionBusy}
      >
        {session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '12px 0' }}>
            <div style={{ fontSize: 13, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tiền đầu ca</span><b>{session.openingFloat.toLocaleString('vi-VN')}đ</b>
            </div>
            <div style={{ fontSize: 13, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
              <span>Thu tiền mặt</span><b style={{ color: '#166534' }}>+{(session.cashPayments ?? 0).toLocaleString('vi-VN')}đ</b>
            </div>
            <div style={{ fontSize: 13, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hoàn / chi tiền mặt</span><b style={{ color: '#b91c1c' }}>−{((session.cashRefunds ?? 0) + (session.otherExpense ?? 0)).toLocaleString('vi-VN')}đ</b>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 8 }}>
              <span>Tiền mặt dự kiến</span><span>{(session.expectedCash ?? 0).toLocaleString('vi-VN')}đ</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tiền mặt đếm thực tế</div>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={countedCash}
                onChange={(v) => setCountedCash(Number(v ?? 0))}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number((v ?? '').replace(/,/g, ''))}
                addonAfter="đ"
              />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>Chênh lệch</span>
              <span style={{ color: countedCash - (session.expectedCash ?? 0) === 0 ? '#166534' : '#b91c1c' }}>
                {(countedCash - (session.expectedCash ?? 0)).toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

export default CashierHome
