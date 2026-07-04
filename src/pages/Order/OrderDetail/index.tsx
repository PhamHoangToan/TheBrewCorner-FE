import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Spin, Tag, message } from 'antd'
import {
  ArrowLeftOutlined,
  CalculatorOutlined,
  ClearOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { orderService } from '../../../services/order.service'
import { tableService } from '../../../services/table.service'
import styles from './orderDetail.module.css'

interface AggItem {
  id: string
  orderId: string
  name: string
  qty: number
  price: number
  status: string
  paid: boolean
}

interface TableView {
  headOrderId: string
  tableId: string | null
  tableName: string
  floor: string
  waiter: string
  elapsed: string
  items: AggItem[]
  unpaidOrderIds: string[]
  paidTotal: number
  unpaidTotal: number
}

const toNum = (v: any) => parseFloat(String(v ?? 0)) || 0
const isOrderPaid = (o: any) => o.status === 'PAID' || o.invoice?.status === 'PAID'

const ITEM_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ làm', PREPARING: 'Đang làm', READY: 'Xong', SERVED: 'Đã phục vụ',
}
const ITEM_STATUS_COLOR: Record<string, string> = {
  PENDING: 'default', PREPARING: 'orange', READY: 'green', SERVED: 'purple',
}

// Gộp mọi order còn hoạt động của 1 bàn thành 1 danh sách món, mỗi món kèm trạng thái
// thanh toán (từ invoice của order cha) + trạng thái pha chế (item.status)
const buildTableView = (head: any, orders: any[]): TableView => {
  const active = orders.filter((o) => o.status !== 'CANCELLED')
  const area = head.table?.area?.name ?? ''
  const tableName = head.table
    ? `${head.table.name ?? head.table.code ?? 'Bàn ?'}`
    : (head.type === 'TAKE_AWAY' ? 'Mang về' : 'Bàn ?')
  const earliest = active.reduce((min: number, o: any) => {
    const t = o.createdAt ? new Date(o.createdAt).getTime() : Date.now()
    return Math.min(min, t)
  }, Date.now())
  const elapsed = active.length
    ? `${Math.max(0, Math.floor((Date.now() - earliest) / 60000))} phút`
    : '0 phút'

  const items: AggItem[] = active.flatMap((o: any) =>
    (o.items ?? [])
      .filter((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status))
      .map((i: any) => ({
        id: i.id,
        orderId: o.id,
        name: i.productName ?? i.product?.name ?? '',
        qty: Number(i.quantity ?? 1),
        price: toNum(i.unitPrice ?? i.price),
        status: i.status ?? 'PENDING',
        paid: isOrderPaid(o),
      })),
  )

  const unpaidOrderIds = active
    .filter((o: any) => !isOrderPaid(o) && (o.items ?? []).some((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status)))
    .map((o: any) => o.id)

  const paidTotal = items.filter((i) => i.paid).reduce((s, i) => s + i.qty * i.price, 0)
  const unpaidTotal = items.filter((i) => !i.paid).reduce((s, i) => s + i.qty * i.price, 0)

  return {
    headOrderId: head.id,
    tableId: head.table?.id ?? null,
    tableName,
    floor: area,
    waiter: head.createdBy?.name ?? '',
    elapsed,
    items,
    unpaidOrderIds,
    paidTotal,
    unpaidTotal,
  }
}

const OrderDetail: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [view, setView] = useState<TableView | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const fetchOrder = useCallback(async () => {
    if (!id) { setLoading(false); return }
    try {
      const res = await orderService.get(id)
      const head = res.data as any
      // Bàn còn gắn → gộp mọi order của bàn; nếu không (mang về / đã tách khỏi bàn) chỉ xem order này
      if (head.table?.id) {
        const listRes = await orderService.list({ tableId: head.table.id, limit: '100' })
        const orders: any[] = (listRes.data as any)?.items ?? []
        // Đảm bảo có order head trong danh sách (phòng trường hợp phân trang)
        if (!orders.some((o) => o.id === head.id)) orders.push(head)
        setView(buildTableView(head, orders))
      } else {
        setView(buildTableView(head, [head]))
      }
    } catch {
      message.error('Không tải được chi tiết order')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleResetTable = async () => {
    if (!view?.tableId) return
    setResetting(true)
    try {
      await tableService.update(view.tableId, { status: 'AVAILABLE' } as any)
      message.success('Đã đặt bàn về trống')
      navigate('/tables')
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Không thể reset bàn')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      </AppLayout>
    )
  }

  if (!view) {
    return (
      <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
        <div style={{ textAlign: 'center', color: '#888', paddingTop: 80 }}>Không tìm thấy order</div>
      </AppLayout>
    )
  }

  const hasUnpaid = view.unpaidOrderIds.length > 0
  // Đặt bàn về trống chỉ khi CẢ HAI: đã thanh toán hết VÀ mọi món đã phục vụ xong
  const allServed = view.items.length > 0 && view.items.every((i) => i.status === 'SERVED')
  const canResetTable = !hasUnpaid && allServed
  const grandTotal = view.paidTotal + view.unpaidTotal

  return (
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#662c21' }}>
          Chi tiết bàn — {view.floor ? `${view.floor} / ` : ''}{view.tableName}
        </span>
      </div>

      <div className={styles.tableCard} style={{ maxWidth: 560 }}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardHeaderTitle}>{view.tableName}</div>
            <div className={styles.cardHeaderSub}>
              {view.floor ? `${view.floor}` : ''}{view.waiter ? ` — ${view.waiter}` : ''}
            </div>
          </div>
          <div className={styles.cardHeaderSub}>⏱ {view.elapsed}</div>
        </div>

        <div className={styles.cardBody}>
          {view.items.length === 0 ? (
            <div style={{ color: '#aaa', textAlign: 'center', padding: '20px 0' }}>Chưa có món</div>
          ) : (
            view.items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {item.name} x{item.qty}
                  <Tag color={item.paid ? 'green' : 'red'} style={{ margin: 0 }}>
                    {item.paid ? 'Đã TT' : 'Chưa TT'}
                  </Tag>
                  <Tag color={ITEM_STATUS_COLOR[item.status] ?? 'default'} style={{ margin: 0 }}>
                    {ITEM_STATUS_LABEL[item.status] ?? item.status}
                  </Tag>
                </span>
                <span>{(item.price * item.qty).toLocaleString('vi-VN')}đ</span>
              </div>
            ))
          )}

          {view.paidTotal > 0 && (
            <div className={styles.itemRow} style={{ color: '#389e0d' }}>
              <span>Đã thanh toán</span>
              <span>{view.paidTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          {view.unpaidTotal > 0 && (
            <div className={styles.itemRow} style={{ color: '#cf1322', fontWeight: 600 }}>
              <span>Chưa thanh toán</span>
              <span>{view.unpaidTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          <div className={styles.totalRow}>
            <span>Tổng cộng</span>
            <span>{grandTotal.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {user?.role === 'cashier' && hasUnpaid && (
          <div className={styles.cardActions}>
            <Button
              icon={<CalculatorOutlined />}
              style={{ background: '#662c21', borderColor: '#662c21', color: '#fff' }}
              onClick={() => navigate(`/cashier/payment?orderId=${view.unpaidOrderIds[0]}`)}
            >
              Thanh toán{view.unpaidOrderIds.length > 1 ? ` (${view.unpaidOrderIds.length} bill chưa trả)` : ''}
            </Button>
          </div>
        )}

        {user?.role === 'cashier' && canResetTable && view.tableId && (
          <div className={styles.cardActions}>
            <Button icon={<ClearOutlined />} loading={resetting} onClick={handleResetTable}>
              Đặt bàn về trống
            </Button>
          </div>
        )}

        <div style={{ padding: '0 16px 16px' }}>
          <Button
            icon={<PlusOutlined />}
            className={styles.addBtn}
            onClick={() => navigate(view.tableId ? `/cashier/order?tableId=${view.tableId}` : '/cashier/order')}
          >
            Thêm món
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

export default OrderDetail
