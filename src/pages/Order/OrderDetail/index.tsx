import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Spin, message } from 'antd'
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

interface OrderItem {
  id: string
  name: string
  qty: number
  price: number
  status: string
}

interface OrderData {
  id: string
  code: string
  tableId: string | null
  tableName: string
  floor: string
  waiter: string
  elapsed: string
  status: string
  invoicePaid: boolean
  items: OrderItem[]
  total: number
}

const mapOrder = (data: any): OrderData => {
  const area = data.table?.area?.name ?? ''
  const tableName = data.table
    ? `${data.table.name ?? data.table.code ?? 'Bàn ?'}`
    : (data.type === 'TAKE_AWAY' ? 'Mang về' : 'Bàn ?')
  const elapsed = data.createdAt
    ? `${Math.max(0, Math.floor((Date.now() - new Date(data.createdAt).getTime()) / 60000))} phút`
    : '0 phút'
  const toNum = (v: any) => parseFloat(String(v ?? 0)) || 0
  const items: OrderItem[] = (data.items ?? [])
    .filter((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status))
    .map((i: any) => ({
      id: i.id,
      name: i.productName ?? i.product?.name ?? '',
      qty: Number(i.quantity ?? 1),
      price: toNum(i.unitPrice ?? i.price),
      status: i.status ?? 'PENDING',
    }))
  const computedTotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const total = computedTotal || toNum(data.totalAmount)
  return {
    id: data.id,
    code: data.code ?? '',
    tableId: data.table?.id ?? null,
    tableName,
    floor: area,
    waiter: data.createdBy?.name ?? '',
    elapsed,
    status: data.status ?? 'SENT',
    invoicePaid: data.invoice?.status === 'PAID',
    items,
    total,
  }
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ', PREPARING: 'Đang làm', READY: 'Xong', SERVED: 'Đã phục vụ',
}

const OrderDetail: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const fetchOrder = useCallback(async () => {
    if (!id) { setLoading(false); return }
    try {
      const res = await orderService.get(id)
      setOrder(mapOrder(res.data))
    } catch {
      message.error('Không tải được chi tiết order')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleResetTable = async () => {
    if (!order?.tableId) return
    setResetting(true)
    try {
      await tableService.update(order.tableId, { status: 'AVAILABLE' } as any)
      message.success('Đã đặt bàn về trống')
      navigate('/tables')
    } catch {
      message.error('Không thể reset bàn')
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

  if (!order) {
    return (
      <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
        <div style={{ textAlign: 'center', color: '#888', paddingTop: 80 }}>Không tìm thấy order</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#662c21' }}>
          Chi tiết order — {order.floor ? `${order.floor} / ` : ''}{order.tableName}
        </span>
      </div>

      <div className={styles.tableCard} style={{ maxWidth: 520 }}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardHeaderTitle}>{order.tableName}</div>
            <div className={styles.cardHeaderSub}>
              Order {order.code}{order.floor ? ` — ${order.floor}` : ''}
              {order.waiter ? ` — ${order.waiter}` : ''}
            </div>
          </div>
          <div className={styles.cardHeaderSub}>⏱ {order.elapsed}</div>
        </div>

        <div className={styles.cardBody}>
          {order.items.length === 0 ? (
            <div style={{ color: '#aaa', textAlign: 'center', padding: '20px 0' }}>Chưa có món</div>
          ) : (
            order.items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <span>
                  {item.name} x{item.qty}
                  {ITEM_STATUS_LABEL[item.status] && (
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                      [{ITEM_STATUS_LABEL[item.status]}]
                    </span>
                  )}
                </span>
                <span>{(item.price * item.qty).toLocaleString('vi-VN')}đ</span>
              </div>
            ))
          )}

          <div className={styles.totalRow}>
            <span>Tổng cộng</span>
            <span>{order.total.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {user?.role === 'cashier' && !order.invoicePaid && (
          <div className={styles.cardActions}>
            <Button
              icon={<CalculatorOutlined />}
              style={{ background: '#662c21', borderColor: '#662c21', color: '#fff' }}
              onClick={() => navigate(`/cashier/payment?orderId=${order.id}`)}
            >
              Thanh toán
            </Button>
          </div>
        )}

        {user?.role === 'cashier' && order.status === 'SERVED' && order.invoicePaid && order.tableId && (
          <div className={styles.cardActions}>
            <Button
              icon={<ClearOutlined />}
              loading={resetting}
              onClick={handleResetTable}
            >
              Đặt bàn về trống
            </Button>
          </div>
        )}

        <div style={{ padding: '0 16px 16px' }}>
          <Button
            icon={<PlusOutlined />}
            className={styles.addBtn}
            onClick={() => navigate(order.tableId ? `/cashier/order?tableId=${order.tableId}` : '/cashier/order')}
          >
            Thêm món
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

export default OrderDetail
