import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrcodeOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Modal } from 'antd'
import AppLayout from '../../components/common/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { tableService } from '../../services/table.service'
import { useSocketEvent } from '../../hooks/useSocket'
import { printHtml } from '../../utils/print'
import styles from './tableMap.module.css'

// URL app khách hàng để dựng link QR gọi món tại bàn (set VITE_CUSTOMER_URL trên môi trường thật)
const CUSTOMER_APP_URL = (import.meta.env.VITE_CUSTOMER_URL as string | undefined) ?? window.location.origin
const tableQrUrl = (tableId: string) => `${CUSTOMER_APP_URL.replace(/\/$/, '')}/table/${tableId}`
const qrImageUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(data)}`

interface TableCard {
  id: string
  name: string
  area: string
  tableStatus: string
  orderId: string
  orderStatus: string
  orderPaid: boolean
  activeItemStatuses: string[]
  itemCount: number
  totalVnd: number
  elapsedMin: number
}

type TableColor = 'available' | 'waiting' | 'preparing' | 'served' | 'checkout' | 'reserved'

function getTableColor(card: Pick<TableCard, 'tableStatus' | 'orderStatus' | 'orderPaid' | 'activeItemStatuses'>): TableColor {
  const { tableStatus, orderStatus, orderPaid, activeItemStatuses } = card
  if (!orderStatus && tableStatus === 'RESERVED') return 'reserved'
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

function getStatusLabel(card: Pick<TableCard, 'tableStatus' | 'orderStatus' | 'orderPaid' | 'activeItemStatuses'>): string {
  const { tableStatus, orderStatus, orderPaid, activeItemStatuses } = card
  if (!orderStatus && tableStatus === 'RESERVED') return 'Đã đặt trước'
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
  { color: 'reserved' as TableColor, label: 'Đã đặt trước' },
]

const DONE_ITEM_STATUSES = new Set(['SERVED', 'RETURNED', 'CANCELLED'])
const isOrderPaid = (o: any) => o.status === 'PAID' || o.invoice?.status === 'PAID'

const mapTable = (item: any, idx: number): TableCard => {
  // Bàn AVAILABLE: bỏ qua order cũ, coi như bàn trống. Ngược lại gộp TẤT CẢ order còn
  // gắn bàn (trừ đã hủy) — order phiên trước đã được gỡ tableId khi đặt bàn về trống.
  const orders: any[] = item.status === 'AVAILABLE'
    ? []
    : (item.orders ?? []).filter((o: any) => o.status !== 'CANCELLED')

  const allItems = orders.flatMap((o: any) => (o.items ?? []).map((i: any) => ({ ...i, paid: isOrderPaid(o) })))
  const billableItems = allItems.filter((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status))
  // Món chưa phục vụ xong (barista còn việc), bất kể đã trả tiền hay chưa
  const activeItems = allItems.filter((i: any) => !DONE_ITEM_STATUSES.has(i.status))
  const itemCount = billableItems.reduce((s: number, i: any) => s + Number(i.quantity ?? 1), 0)

  // Order chưa thanh toán còn món billable → bàn còn nợ tiền
  const unpaidOrder = orders.find((o: any) => !isOrderPaid(o) && (o.items ?? []).some((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status)))
  const allPaid = billableItems.length > 0 && !unpaidOrder
  // Ưu tiên điều hướng: order chưa trả tiền (để thanh toán) > order bất kỳ còn hoạt động
  const navOrder = unpaidOrder ?? orders[0]

  const earliest = orders.reduce((min: number, o: any) => {
    const t = o.createdAt ? new Date(o.createdAt).getTime() : Date.now()
    return Math.min(min, t)
  }, Date.now())
  const elapsedMin = orders.length ? Math.max(0, Math.floor((Date.now() - earliest) / 60000)) : 0

  return {
    id: item.id ?? String(idx),
    name: item.name ?? item.code ?? `Bàn ${String(idx + 1).padStart(2, '0')}`,
    area: item.area?.name ?? '',
    tableStatus: item.status ?? '',
    orderId: navOrder?.id ?? '',
    orderStatus: unpaidOrder?.status ?? (orders.length ? 'PAID' : ''),
    orderPaid: allPaid,
    activeItemStatuses: activeItems.map((i: any) => i.status as string),
    itemCount,
    totalVnd: billableItems.reduce((s: number, i: any) => s + Number(i.totalPrice ?? 0), 0),
    elapsedMin,
  }
}

const TableMap: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [tables, setTables] = useState<TableCard[]>([])
  const [loading, setLoading] = useState(true)
  const [qrTable, setQrTable] = useState<{ id: string; name: string } | null>(null)

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
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (msg) window.alert(msg)
    }
  }

  const handleClick = (table: TableCard) => {
    if (table.orderId) {
      navigate(`/order/${table.orderId}`)
    } else {
      navigate(`/order?tableId=${table.id}`)
    }
  }

  const handleShowQr = (e: React.MouseEvent, table: TableCard) => {
    e.stopPropagation()
    setQrTable({ id: table.id, name: table.name })
  }

  const handlePrintQr = () => {
    if (!qrTable) return
    printHtml(`
      <div class="center">
        <div class="shop">The Brew Corner</div>
        <div class="big">${qrTable.name}</div>
        <div class="sub">Quét mã để gọi món tại bàn</div>
        <img src="${qrImageUrl(tableQrUrl(qrTable.id))}" style="width:48mm;height:48mm;margin:4mm auto;display:block" />
        <div class="foot">Sau khi gọi món, thanh toán tại quầy</div>
      </div>
    `)
  }

  const summaryByColor: Record<TableColor, number> = {
    available: 0, waiting: 0, preparing: 0, served: 0, checkout: 0, reserved: 0,
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

                {table.orderPaid && table.activeItemStatuses.length === 0 && (
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={(e) => handleResetTable(e, table.id, table.name)}
                  >
                    Đặt trống
                  </button>
                )}

                <span
                  role="button"
                  title="Mã QR gọi món tại bàn"
                  className={styles.qrBtn}
                  onClick={(e) => handleShowQr(e, table)}
                  style={{ position: 'absolute', top: 6, right: 6, cursor: 'pointer', opacity: 0.7, fontSize: 16 }}
                >
                  <QrcodeOutlined />
                </span>
              </button>
            )
          })}
        </div>
      )}

      <Modal
        title={qrTable ? `Mã QR — ${qrTable.name}` : 'Mã QR'}
        open={!!qrTable}
        onCancel={() => setQrTable(null)}
        footer={[
          <Button key="print" type="primary" onClick={handlePrintQr} style={{ background: '#662c21', borderColor: '#662c21' }}>
            In mã QR
          </Button>,
          <Button key="close" onClick={() => setQrTable(null)}>Đóng</Button>,
        ]}
      >
        {qrTable && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={qrImageUrl(tableQrUrl(qrTable.id))}
              alt="QR"
              style={{ width: 240, height: 240 }}
              referrerPolicy="no-referrer"
            />
            <div style={{ fontSize: 12, color: '#888', wordBreak: 'break-all', marginTop: 8 }}>
              {tableQrUrl(qrTable.id)}
            </div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
              Khách quét mã này để tự gọi món tại bàn. Dán lên bàn hoặc in ra.
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

export default TableMap
