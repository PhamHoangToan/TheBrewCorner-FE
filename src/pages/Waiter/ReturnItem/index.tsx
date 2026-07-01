import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Checkbox, Input, message, Spin } from 'antd'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { orderService } from '../../../services/order.service'
import styles from './returnItem.module.css'

interface OrderItem {
  id: string
  name: string
  qty: number
  status: string
  note?: string
}

interface OrderInfo {
  code: string
  tableName: string
  waiter: string
}

const WaiterReturn: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const [items, setItems] = useState<OrderItem[]>([])
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({ code: '', tableName: '', waiter: '' })
  const [checked, setChecked] = useState<string[]>([])
  const [returnReason, setReturnReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchOrder = useCallback(async () => {
    if (!orderId) { setLoading(false); return }
    try {
      const res = await orderService.get(orderId)
      const order: any = res.data
      const area = order.table?.area?.name ?? ''
      const tableName = order.table
        ? `${area ? area + ' / ' : ''}${order.table.name ?? order.table.code ?? 'Bàn ?'}`
        : 'Mang về'
      setOrderInfo({
        code: order.code ?? orderId,
        tableName,
        waiter: order.createdBy?.name ?? '',
      })
      const mappedItems: OrderItem[] = (order.items ?? []).map((i: any) => ({
        id: i.id,
        name: i.productName ?? i.name ?? '',
        qty: i.quantity ?? 1,
        status: i.status ?? 'PENDING',
        note: i.note ?? '',
      }))
      setItems(mappedItems)
    } catch {
      message.error('Không thể tải thông tin order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const toggle = (id: string) => {
    setChecked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleSubmit = async () => {
    if (!checked.length) return
    setSubmitting(true)
    try {
      await Promise.all(
        checked.map((itemId) =>
          orderService.updateItem(orderId!, itemId, {
            status: 'RETURNED',
            note: `RETURN_REQUEST:${returnReason || 'Khách trả món'}`,
          }),
        ),
      )
      message.success('Đã gửi yêu cầu trả món, chờ pha chế xác nhận')
      navigate(-1)
    } catch {
      message.error('Gửi yêu cầu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const activeItems = items.filter(
    (i) => !['RETURNED', 'CANCELLED'].includes(i.status) && !i.note?.startsWith('RETURN_REQUEST'),
  )
  const pendingItems = items.filter((i) => i.note?.startsWith('RETURN_REQUEST') && i.status === 'RETURNED')
  const rejectedItems = items.filter((i) => i.note?.startsWith('REJECTED:') && i.status === 'SERVED')

  if (loading) {
    return (
      <AppLayout role={user?.role ?? 'waiter'} username={user?.name ?? ''} onLogout={handleLogout}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      </AppLayout>
    )
  }

  return (
    <AppLayout role={user?.role ?? 'waiter'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.formCard}>
        <div className={styles.cardTitle}>Xác nhận trả món</div>
        <div className={styles.tableInfo}>
          Order {orderInfo.code} — {orderInfo.tableName}
          {orderInfo.waiter && ` — Phục vụ: ${orderInfo.waiter}`}
        </div>

        {rejectedItems.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: '#cf1322', marginBottom: 8 }}>Trả món bị từ chối:</div>
            {rejectedItems.map((item) => (
              <div key={item.id} className={styles.itemRow} style={{ opacity: 0.8 }}>
                <div className={styles.itemLeft}>
                  <span>{item.name}</span>
                  <span className={styles.rejectedTag}>Từ chối</span>
                </div>
                <div>
                  <span className={styles.itemQty}>x{item.qty}</span>
                  <div className={styles.rejectedNote}>
                    Lý do: {item.note?.replace('REJECTED:', '') ?? ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingItems.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: '#096dd9', marginBottom: 8 }}>Đang chờ pha chế xác nhận:</div>
            {pendingItems.map((item) => (
              <div key={item.id} className={styles.itemRow} style={{ opacity: 0.7 }}>
                <div className={styles.itemLeft}>
                  <span>{item.name}</span>
                  <span className={styles.pendingTag}>Chờ xác nhận</span>
                </div>
                <span className={styles.itemQty}>x{item.qty}</span>
              </div>
            ))}
          </div>
        )}

        {activeItems.length > 0 && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Chọn món muốn trả:</div>
            {activeItems.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemLeft}>
                  <Checkbox
                    checked={checked.includes(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  <span>{item.name}</span>
                </div>
                <span className={styles.itemQty}>x{item.qty}</span>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <Input.TextArea
                placeholder="Lý do trả món (tùy chọn)..."
                rows={2}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>
          </>
        )}

        {activeItems.length === 0 && pendingItems.length === 0 && rejectedItems.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>
            Không có món nào để trả
          </div>
        )}

        <div className={styles.actions}>
          <Button className={styles.btnCancel} onClick={() => navigate(-1)}>Quay lại</Button>
          {activeItems.length > 0 && (
            <Button
              className={styles.btnSubmit}
              disabled={checked.length === 0}
              loading={submitting}
              onClick={handleSubmit}
            >
              Gửi yêu cầu trả món
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default WaiterReturn
