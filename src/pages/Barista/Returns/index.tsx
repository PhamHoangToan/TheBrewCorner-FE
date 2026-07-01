import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, message, Spin, Tag } from 'antd'
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { orderService } from '../../../services/order.service'
import styles from './baristaReturns.module.css'

interface ReturnItem {
  id: string
  name: string
  qty: number
  note: string
  orderId: string
  orderCode: string
  tableName: string
  waiterName: string
}

const mapReturnItem = (item: any): ReturnItem => {
  const area = item.order?.table?.area?.name ?? ''
  const tableName = item.order?.table
    ? `${area ? area + ' / ' : ''}${item.order.table.name ?? item.order.table.code ?? 'Bàn ?'}`
    : 'Mang về'
  const reason = String(item.note ?? '').replace('RETURN_REQUEST:', '').trim()
  return {
    id: item.id,
    name: item.productName ?? item.product?.name ?? '',
    qty: item.quantity ?? 1,
    note: reason || 'Không có lý do',
    orderId: item.orderId ?? item.order?.id,
    orderCode: item.order?.code ?? '',
    tableName,
    waiterName: item.order?.createdBy?.name ?? '',
  }
}

const BaristaReturns: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectInputs, setRejectInputs] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await orderService.returnRequests()
      const data: any[] = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
      setItems(data.map(mapReturnItem))
    } catch {
      message.error('Không tải được danh sách trả món')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReturns() }, [fetchReturns])

  const handleApprove = async (item: ReturnItem) => {
    setActionLoading((p) => ({ ...p, [item.id]: true }))
    try {
      await orderService.approveReturn(item.id)
      message.success(`Đã đồng ý trả món: ${item.name}`)
      setItems((p) => p.filter((i) => i.id !== item.id))
    } catch {
      message.error('Thao tác thất bại')
    } finally {
      setActionLoading((p) => ({ ...p, [item.id]: false }))
    }
  }

  const handleReject = async (item: ReturnItem) => {
    const reason = rejectInputs[item.id]?.trim()
    if (!reason) { message.warning('Vui lòng nhập lý do từ chối'); return }
    setActionLoading((p) => ({ ...p, [item.id]: true }))
    try {
      await orderService.rejectReturn(item.id, reason)
      message.success(`Đã từ chối trả món: ${item.name}`)
      setItems((p) => p.filter((i) => i.id !== item.id))
      setRejectInputs((p) => { const n = { ...p }; delete n[item.id]; return n })
    } catch {
      message.error('Thao tác thất bại')
    } finally {
      setActionLoading((p) => ({ ...p, [item.id]: false }))
    }
  }

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.topNav}>
        <button
          type="button"
          className={`${styles.navTab} ${styles.navTabInactive}`}
          onClick={() => navigate('/barista')}
        >
          DS món chế biến
        </button>
        <button type="button" className={styles.navTab} style={{ borderRadius: '0 8px 8px 0' }}>
          DS trả món
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchReturns}>
          Làm mới
        </Button>
      </div>

      {loading && (
        <div className={styles.empty}><Spin size="large" /></div>
      )}

      {!loading && items.length === 0 && (
        <div className={styles.empty}>Không có yêu cầu trả món nào</div>
      )}

      <div className={styles.cardsGrid}>
        {items.map((item) => (
          <div key={item.id} className={styles.returnCard}>
            <div className={styles.cardHeader}>
              <span>{item.tableName} — Order {item.orderCode}</span>
              {item.waiterName && <Tag color="blue">{item.waiterName}</Tag>}
            </div>
            <div className={styles.cardBody}>
              <div className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.name} x{item.qty}</div>
                  <div className={styles.itemNote}>Lý do: {item.note}</div>
                </div>
                <div className={styles.itemActions}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    loading={actionLoading[item.id]}
                    onClick={() => handleApprove(item)}
                  >
                    Đồng ý
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    loading={actionLoading[item.id]}
                    onClick={() => {
                      if (!rejectInputs[item.id]) {
                        setRejectInputs((p) => ({ ...p, [item.id]: '' }))
                      } else {
                        handleReject(item)
                      }
                    }}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
              {item.id in rejectInputs && (
                <div className={styles.rejectInputRow}>
                  <Input
                    placeholder="Lý do từ chối..."
                    value={rejectInputs[item.id]}
                    onChange={(e) => setRejectInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                    onPressEnter={() => handleReject(item)}
                  />
                  <Button onClick={() => handleReject(item)} loading={actionLoading[item.id]}>
                    Xác nhận
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}

export default BaristaReturns
