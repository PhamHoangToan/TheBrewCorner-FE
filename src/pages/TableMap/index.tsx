import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeamOutlined } from '@ant-design/icons'
import AppLayout from '../../components/common/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { tableService } from '../../services/table.service'
import { useSocketEvent } from '../../hooks/useSocket'
import styles from './tableMap.module.css'

interface TableCard {
  id: string
  name: string
  area: string
  orderId: string
  orderStatus: string
  orderPaid: boolean
  activeItemStatuses: string[]
  itemCount: number
  totalVnd: number
  elapsedMin: number
}

type TableColor = 'available' | 'waiting' | 'preparing' | 'served' | 'checkout'

function getTableColor(card: Pick<TableCard, 'orderStatus' | 'orderPaid' | 'activeItemStatuses'>): TableColor {
  const { orderStatus, orderPaid, activeItemStatuses } = card
  if (!orderStatus) return 'available'
  // PAID: màu dựa theo trạng thái món chưa phục vụ
  if (orderPaid) {
    if (activeItemStatuses.some((s) => s === 'PREPARING')) return 'preparing'
    if (activeItemStatuses.some((s) => s === 'READY')) return 'preparing'
    if (activeItemStatuses.length > 0) return 'waiting'
    return 'available'
  }
  if (orderStatus === 'SENT') return 'waiting'
  if (orderStatus === 'PREPARING' || orderStatus === 'READY') return 'preparing'
  if (orderStatus === 'SERVED') return 'served'
  if (orderStatus === 'CHECKOUT_REQUESTED') return 'checkout'
  return 'available'
}

function getStatusLabel(card: Pick<TableCard, 'orderStatus' | 'orderPaid' | 'activeItemStatuses'>): string {
  const { orderStatus, orderPaid, activeItemStatuses } = card
  if (!orderStatus) return 'Trống'
  if (orderPaid) {
    if (activeItemStatuses.some((s) => s === 'PREPARING')) return 'Đã TT - Đang làm'
    if (activeItemStatuses.some((s) => s === 'READY')) return 'Đã TT - Sắp xong'
    if (activeItemStatuses.length > 0) return 'Đã TT - Chờ làm'
    return 'Trống'
  }
  if (orderStatus === 'SENT') return 'Chờ làm'
  if (orderStatus === 'PREPARING') return 'Đang làm'
  if (orderStatus === 'READY') return 'Sắp xong'
  if (orderStatus === 'SERVED') return 'Đã phục vụ'
  if (orderStatus === 'CHECKOUT_REQUESTED') return 'Chờ thanh toán'
  return 'Trống'
}

const LEGEND = [
  { color: 'available' as TableColor, label: 'Trống' },
  { color: 'waiting' as TableColor, label: 'Chờ làm' },
  { color: 'preparing' as TableColor, label: 'Đang làm / Sắp xong' },
  { color: 'served' as TableColor, label: 'Đã phục vụ' },
  { color: 'checkout' as TableColor, label: 'Chờ thanh toán' },
]

const DONE_ITEM_STATUSES = new Set(['SERVED', 'RETURNED', 'CANCELLED'])

const mapTable = (item: any, idx: number): TableCard => {
  // Bàn AVAILABLE: bỏ qua mọi order cũ, hiển thị như bàn trống
  const activeOrder = item.status === 'AVAILABLE' ? undefined : (item.orders ?? []).find((o: any) => {
    if (o.status === 'CANCELLED') return false
    if (o.status !== 'PAID') return true
    return (o.items ?? []).some((i: any) => !DONE_ITEM_STATUSES.has(i.status))
  })

  const orderItems = activeOrder?.items ?? []
  const activeItems = orderItems.filter((i: any) => !DONE_ITEM_STATUSES.has(i.status))
  const itemCount = orderItems
    .filter((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status))
    .reduce((s: number, i: any) => s + Number(i.quantity ?? 1), 0)
  const elapsedMin = activeOrder?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000))
    : 0

  return {
    id: item.id ?? String(idx),
    name: item.name ?? item.code ?? `Bàn ${String(idx + 1).padStart(2, '0')}`,
    area: item.area?.name ?? '',
    orderId: activeOrder?.id ?? '',
    orderStatus: activeOrder?.status ?? '',
    orderPaid: activeOrder?.status === 'PAID',
    activeItemStatuses: activeItems.map((i: any) => i.status as string),
    itemCount,
    totalVnd: Number(activeOrder?.totalAmount ?? 0),
    elapsedMin,
  }
}

const TableMap: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [tables, setTables] = useState<TableCard[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await tableService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      setTables(items.map(mapTable))
    } catch {
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [])

  useSocketEvent('notification:new', fetchData)

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 30000)
    return () => clearInterval(timer)
  }, [fetchData])

  const handleRefresh = () => { setLoading(true); fetchData() }

  const handleResetTable = async (e: React.MouseEvent, tableId: string, tableName: string) => {
    e.stopPropagation()
    if (!window.confirm(`Đặt bàn ${tableName} về trạng thái trống?`)) return
    try {
      await tableService.update(tableId, { status: 'AVAILABLE' })
      fetchData()
    } catch {
      // silent — table may already be available
    }
  }

  const handleClick = (table: TableCard) => {
    if (table.orderId) {
      navigate(`/order/${table.orderId}`)
    } else {
      navigate(`/order?tableId=${table.id}`)
    }
  }

  const summaryByColor: Record<TableColor, number> = {
    available: 0, waiting: 0, preparing: 0, served: 0, checkout: 0,
  }
  tables.forEach((t) => { summaryByColor[getTableColor(t)]++ })

  return (
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Sơ đồ bàn</h2>
        <button type="button" className={styles.refreshBtn} onClick={handleRefresh}>
          🔄 Làm mới
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {LEGEND.map((l) => (
          <div key={l.color} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles[`dot_${l.color}`]}`} />
            <span className={styles.legendLabel}>{l.label}</span>
            <span className={styles.legendCount}>({summaryByColor[l.color]})</span>
          </div>
        ))}
      </div>

      {/* Table grid */}
      {loading ? (
        <div className={styles.loadingText}>Đang tải...</div>
      ) : (
        <div className={styles.grid}>
          {tables.map((table, idx) => {
            const color = getTableColor(table)
            const statusLabel = getStatusLabel(table)
            const hasOrder = !!table.orderId
            return (
              <button
                key={table.id}
                type="button"
                className={`${styles.tile} ${styles[`tile_${color}`]}`}
                style={{ '--i': idx } as React.CSSProperties}
                onClick={() => handleClick(table)}
              >
                <div className={styles.tileHeader}>
                  <span className={styles.tileName}>{table.name}</span>
                  <span className={`${styles.tileBadge} ${styles[`badge_${color}`]}`}>
                    {statusLabel}
                  </span>
                </div>

                {table.area && (
                  <div className={styles.tileArea}>{table.area}</div>
                )}

                {hasOrder ? (
                  <div className={styles.tileInfo}>
                    <span className={styles.tileItems}>
                      <TeamOutlined /> {table.itemCount} món
                    </span>
                    <span className={styles.tileTime}>⏱ {table.elapsedMin}'</span>
                  </div>
                ) : (
                  <div className={styles.tileEmpty}>Bấm để nhận order</div>
                )}

                {hasOrder && (
                  <div className={styles.tileTotal}>
                    {table.totalVnd.toLocaleString('vi-VN')}đ
                  </div>
                )}

                {table.orderPaid && (
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={(e) => handleResetTable(e, table.id, table.name)}
                  >
                    Đặt trống
                  </button>
                )}
              </button>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}

export default TableMap
