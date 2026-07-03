import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Checkbox, InputNumber, message, Modal, Radio, Select, Spin } from 'antd'
import { CopyOutlined, MergeCellsOutlined, PrinterOutlined, SplitCellsOutlined, StarFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { orderService } from '../../../services/order.service'
import { invoiceService } from '../../../services/invoice.service'
import { promotionService } from '../../../services/promotion.service'
import { userService } from '../../../services/user.service'
import { buildVietQRUrl, VIETQR_BANK } from '../../../config/vietqr'
import styles from './payment.module.css'

interface OrderItem {
  id: string
  name: string
  qty: number
  unitPrice: number
  total: number
}

interface OrderData {
  id: string
  code: string
  tableName: string
  floor: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  isAdditional: boolean
  status: string
  invoicePaid: boolean
  customerId: string | null
}

const POINT_VALUE_VND = 500 // 1 điểm = 500đ — khớp BE (loyalty.util.ts)

// Giảm tự động theo hạng thành viên — khớp TIER_DISCOUNT_PERCENT phía BE
const TIER_DISCOUNT_PERCENT: Record<string, number> = { BASIC: 0, SILVER: 2, GOLD: 5 }
const TIER_LABEL: Record<string, string> = { SILVER: 'Bạc', GOLD: 'Vàng' }

interface Promo {
  id: string
  code: string
  name: string
  conditionText: string
  discountPercent: number
  minOrderAmount: number
}

interface ServedOrder {
  id: string
  code: string
  tableName: string
  floor: string
  total: number
}

const toNum = (v: any) => parseFloat(String(v ?? 0)) || 0

const mapOrder = (data: any): OrderData => {
  const area = data.table?.area?.name ?? ''
  const tableName = data.table
    ? (data.table.name ?? data.table.code ?? 'Bàn ?')
    : (data.type === 'TAKE_AWAY' ? 'Mang về' : 'Bàn ?')
  const items: OrderItem[] = (data.items ?? [])
    .filter((i: any) => !['RETURNED', 'CANCELLED'].includes(i.status))
    .map((i: any) => {
      const qty = Number(i.quantity ?? 1)
      const price = toNum(i.unitPrice ?? i.price)
      return { id: i.id, name: i.productName ?? '', qty, unitPrice: price, total: qty * price }
    })
  const subtotal = items.reduce((s, i) => s + i.total, 0) || toNum(data.totalAmount)
  // Bàn đã có order PAID trước đó → đây là order bổ sung sau thanh toán
  const isAdditional = (data.table?.orders?.length ?? 0) > 0
  return {
    id: data.id,
    code: data.code ?? '',
    tableName,
    floor: area,
    createdAt: data.createdAt ?? '',
    items,
    subtotal,
    isAdditional,
    status: data.status ?? '',
    invoicePaid: data.invoice?.status === 'PAID',
    customerId: data.customerId ?? null,
  }
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'CARD', label: 'Thẻ' },
]

const CashierPayment: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlOrderId = searchParams.get('orderId')

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [servedOrders, setServedOrders] = useState<ServedOrder[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [promotions, setPromotions] = useState<Promo[]>([])
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [paidRef, setPaidRef] = useState<{ code: string; table: string } | null>(null)
  const [customerPoints, setCustomerPoints] = useState(0)
  const [customerTier, setCustomerTier] = useState('BASIC')
  const [redeemPoints, setRedeemPoints] = useState(0)
  const [splitModalOpen, setSplitModalOpen] = useState(false)
  const [splitSelected, setSplitSelected] = useState<string[]>([])
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [mergeOptions, setMergeOptions] = useState<{ value: string; label: string }[]>([])
  const [actionBusy, setActionBusy] = useState(false)

  const fetchOrder = useCallback(async (id: string) => {
    setLoadingOrder(true)
    try {
      const res = await orderService.get(id)
      setOrder(mapOrder(res.data))
    } catch {
      message.error('Không tải được thông tin order')
    } finally {
      setLoadingOrder(false)
    }
  }, [])

  const fetchServedOrders = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await orderService.list({ limit: '100' })
      const items: any[] = res.data?.items ?? res.data ?? []
      const active = items
        .filter((o: any) => o.status !== 'CANCELLED' && o.invoice?.status !== 'PAID')
        .map((o: any): ServedOrder => {
          const area = o.table?.area?.name ?? ''
          const tableName = o.table ? (o.table.name ?? o.table.code ?? 'Bàn ?') : 'Mang về'
          return {
            id: o.id,
            code: o.code ?? '',
            tableName,
            floor: area,
            total: toNum(o.totalAmount),
          }
        })
      setServedOrders(active)
    } catch {
      message.error('Không tải được danh sách bàn')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const fetchPromotions = useCallback(async (totalAmount?: number) => {
    try {
      const res = totalAmount !== undefined ? await promotionService.valid(totalAmount) : await promotionService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      setPromotions(items.map((p: any): Promo => ({
        id: p.id,
        code: p.code,
        name: p.name,
        conditionText: p.conditionText ?? '',
        discountPercent: Number(p.discountPercent ?? 0),
        minOrderAmount: toNum(p.minOrderAmount),
      })))
    } catch {
      // promotions optional
    }
  }, [])

  useEffect(() => {
    if (urlOrderId) {
      fetchOrder(urlOrderId)
    } else {
      fetchServedOrders()
    }
  }, [urlOrderId, fetchOrder, fetchServedOrders])

  useEffect(() => {
    fetchPromotions(order?.subtotal)
    setSelectedPromo(null)
  }, [fetchPromotions, order?.id, order?.subtotal])

  // Điểm tích lũy của khách (nếu order gắn với khách hàng thành viên)
  useEffect(() => {
    setCustomerPoints(0)
    setCustomerTier('BASIC')
    setRedeemPoints(0)
    if (!order?.customerId) return
    let mounted = true
    userService.loyalty(order.customerId)
      .then((res) => {
        if (!mounted) return
        setCustomerPoints(Number(res.data?.loyaltyPoints ?? 0))
        setCustomerTier(String(res.data?.membershipTier ?? 'BASIC'))
      })
      .catch(() => { if (mounted) setCustomerPoints(0) })
    return () => { mounted = false }
  }, [order?.id, order?.customerId])

  const discount = selectedPromo && order
    ? (order.subtotal >= selectedPromo.minOrderAmount
      ? Math.round(order.subtotal * selectedPromo.discountPercent / 100)
      : 0)
    : 0
  const tierPercent = TIER_DISCOUNT_PERCENT[customerTier] ?? 0
  const tierDiscount = order ? Math.round((order.subtotal * tierPercent) / 100) : 0
  const maxRedeemPoints = order
    ? Math.min(customerPoints, Math.floor(Math.max(order.subtotal - discount - tierDiscount, 0) / POINT_VALUE_VND))
    : 0
  const appliedRedeemPoints = Math.min(redeemPoints, maxRedeemPoints)
  const redeemValue = appliedRedeemPoints * POINT_VALUE_VND
  const grandTotal = order ? Math.max(order.subtotal - discount - tierDiscount - redeemValue, 0) : 0

  const openMergeModal = async () => {
    if (!order) return
    setMergeSourceId(null)
    setMergeModalOpen(true)
    try {
      const res = await orderService.list({ limit: '100' })
      const items: any[] = res.data?.items ?? []
      setMergeOptions(items
        .filter((o: any) => o.id !== order.id && o.status !== 'CANCELLED' && o.status !== 'PAID' && o.invoice?.status !== 'PAID')
        .map((o: any) => ({
          value: o.id,
          label: `${o.table?.name ?? 'Mang về'} — ${o.code} (${toNum(o.totalAmount).toLocaleString('vi-VN')}đ)`,
        })))
    } catch {
      setMergeOptions([])
    }
  }

  const handleSplit = async () => {
    if (!order || splitSelected.length === 0) {
      message.warning('Chọn ít nhất 1 món để tách')
      return
    }
    if (splitSelected.length === order.items.length) {
      message.warning('Không thể tách toàn bộ món — phải để lại ít nhất 1 món')
      return
    }
    setActionBusy(true)
    try {
      await orderService.split(order.id, splitSelected)
      message.success('Đã tách bill — order mới xuất hiện trong danh sách thanh toán')
      setSplitModalOpen(false)
      setSplitSelected([])
      fetchOrder(order.id)
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Tách bill thất bại')
    } finally {
      setActionBusy(false)
    }
  }

  const handleMerge = async () => {
    if (!order || !mergeSourceId) {
      message.warning('Chọn order muốn gộp vào')
      return
    }
    setActionBusy(true)
    try {
      await orderService.merge(order.id, mergeSourceId)
      message.success('Đã gộp order')
      setMergeModalOpen(false)
      fetchOrder(order.id)
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Gộp order thất bại')
    } finally {
      setActionBusy(false)
    }
  }

  const handlePay = async () => {
    if (!order) return
    if (order.status === 'PAID' || order.invoicePaid) {
      message.warning('Order này đã được thanh toán rồi')
      return
    }
    setPaying(true)
    try {
      const invRes = await invoiceService.create({
        orderId: order.id,
        cashierId: user?.id,
        promotionId: selectedPromo?.id ?? null,
        subtotal: order.subtotal,
        discountAmount: discount + tierDiscount + redeemValue,
        totalAmount: grandTotal,
        redeemPoints: appliedRedeemPoints > 0 ? appliedRedeemPoints : undefined,
      })
      const invoiceId = (invRes.data as { id?: string } | undefined)?.id
      if (invoiceId) {
        await invoiceService.pay(invoiceId, { method: paymentMethod, amount: grandTotal })
      }
      setPaidRef({ code: order.code, table: order.tableName })
      setPaid(true)
    } catch {
      message.error('Thanh toán thất bại')
    } finally {
      setPaying(false)
    }
  }

  return (
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.layout}>
        {/* LEFT PANEL */}
        <div className={styles.leftPanel}>
          {!urlOrderId ? (
            <>
              <div className={styles.promoHeader}>Danh sách bàn đang phục vụ</div>
              <div className={styles.promoList}>
                {loadingList ? (
                  <div style={{ textAlign: 'center', paddingTop: 40 }}><Spin /></div>
                ) : servedOrders.length === 0 ? (
                  <div style={{ color: '#aaa', textAlign: 'center', paddingTop: 40 }}>Không có bàn nào</div>
                ) : (
                  servedOrders.map((o) => (
                    <div
                      key={o.id}
                      className={`${styles.promoCard} ${order?.id === o.id ? styles.promoCardSelected : ''}`}
                      onClick={() => fetchOrder(o.id)}
                    >
                      <div className={styles.promoPercent}>
                        {o.floor ? `${o.floor} / ` : ''}{o.tableName}
                      </div>
                      <div className={styles.promoDesc}>
                        Order {o.code} — {o.total.toLocaleString('vi-VN')} VND
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className={styles.promoHeader}>Khuyến mãi</div>
              <div className={styles.promoList}>
                <div
                  className={`${styles.promoCard} ${selectedPromo === null ? styles.promoCardSelected : ''}`}
                  onClick={() => setSelectedPromo(null)}
                >
                  <div className={styles.promoPercent}>Không áp dụng</div>
                  <div className={styles.promoDesc}>Thanh toán giá gốc</div>
                </div>
                {promotions.map((p) => (
                  <div
                    key={p.id}
                    className={`${styles.promoCard} ${styles.promoCardAlt} ${selectedPromo?.id === p.id ? styles.promoCardSelected : ''}`}
                    onClick={() => setSelectedPromo(selectedPromo?.id === p.id ? null : p)}
                  >
                    <div className={styles.promoPercent}>Giảm {p.discountPercent}%</div>
                    <div className={styles.promoDesc}>{p.conditionText || p.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Phương thức thanh toán</div>
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <Radio.Button key={m.value} value={m.value} style={{ fontSize: 13 }}>
                      {m.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
              {order?.customerId && customerPoints > 0 && (
                <div style={{ padding: '8px 12px' }}>
                  <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
                    <StarFilled style={{ color: '#faad14', marginRight: 4 }} />
                    Điểm tích lũy của khách: {customerPoints.toLocaleString('vi-VN')} điểm
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <InputNumber
                      min={0}
                      max={maxRedeemPoints}
                      value={redeemPoints}
                      onChange={(v) => setRedeemPoints(Math.min(Math.max(Math.floor(Number(v ?? 0)), 0), maxRedeemPoints))}
                      style={{ flex: 1 }}
                      placeholder="Số điểm dùng"
                    />
                    <Button size="small" style={{ height: 32 }} onClick={() => setRedeemPoints(maxRedeemPoints)}>
                      Tối đa
                    </Button>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    1 điểm = {POINT_VALUE_VND.toLocaleString('vi-VN')}đ — tối đa {maxRedeemPoints.toLocaleString('vi-VN')} điểm cho đơn này
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className={styles.rightPanel}>
          {paid ? (
            <div className={styles.successScreen}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successTitle}>Thanh toán thành công!</div>
              <div className={styles.successSub}>Order {paidRef?.code} — {paidRef?.table}</div>
              <div className={styles.successActions}>
                <Button icon={<PrinterOutlined />} size="large" onClick={() => window.print()}>
                  In hóa đơn
                </Button>
                <Button
                  type="primary"
                  size="large"
                  style={{ background: '#662c21', borderColor: '#662c21' }}
                  onClick={() => navigate('/cashier')}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          ) : loadingOrder ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin size="large" />
            </div>
          ) : !order ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 15 }}>
              Chọn bàn bên trái để thanh toán
            </div>
          ) : (order.status === 'PAID' || order.invoicePaid) ? (
            <div className={styles.successScreen}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successTitle}>Order này đã thanh toán rồi!</div>
              <div className={styles.successSub}>Order {order.code} — {order.tableName}</div>
              <div className={styles.successActions}>
                <Button
                  type="primary"
                  size="large"
                  style={{ background: '#662c21', borderColor: '#662c21' }}
                  onClick={() => navigate('/cashier')}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.invoiceHeader}>
                <div className={styles.invoiceRef}>
                  HĐ {order.code} — {order.floor ? `${order.floor} / ` : ''}{order.tableName}
                </div>
                <div className={styles.invoiceMeta}>
                  {order.createdAt ? dayjs(order.createdAt).format('DD/MM/YYYY HH:mm') : ''}
                </div>
              </div>

              {order.isAdditional && (
                <div className={styles.additionalBanner}>
                  ⚠️ Bàn này đã thanh toán trước đó — đây là món thêm chưa thanh toán
                </div>
              )}

              <div className={styles.colHeaders}>
                <span>Tên món</span>
                <span style={{ textAlign: 'center' }}>SL</span>
                <span style={{ textAlign: 'right' }}>Thành tiền</span>
              </div>

              <div className={styles.orderRows}>
                {order.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`${styles.orderRow} ${idx % 2 === 1 ? styles.orderRowAlt : ''} ${order.isAdditional ? styles.orderRowAdditional : ''}`}
                  >
                    <span>{item.name}</span>
                    <span><div className={styles.qtyBox}>{item.qty}</div></span>
                    <span style={{ textAlign: 'right' }}>{item.total.toLocaleString('vi-VN')} VND</span>
                  </div>
                ))}
              </div>

              <div className={styles.totalsRow}>
                <div className={styles.totalLine}>
                  <span>Tổng tiền</span>
                  <span>{order.subtotal.toLocaleString('vi-VN')} VND</span>
                </div>
                <div className={styles.totalLine}>
                  <span>Giảm giá {selectedPromo ? `(${selectedPromo.discountPercent}%)` : ''}</span>
                  <span>{discount > 0 ? `- ${discount.toLocaleString('vi-VN')} VND` : '0 VND'}</span>
                </div>
                {tierDiscount > 0 && (
                  <div className={styles.totalLine}>
                    <span>Thành viên hạng {TIER_LABEL[customerTier] ?? customerTier} (-{tierPercent}%)</span>
                    <span>- {tierDiscount.toLocaleString('vi-VN')} VND</span>
                  </div>
                )}
                {redeemValue > 0 && (
                  <div className={styles.totalLine}>
                    <span>Điểm tích lũy ({appliedRedeemPoints.toLocaleString('vi-VN')} điểm)</span>
                    <span>- {redeemValue.toLocaleString('vi-VN')} VND</span>
                  </div>
                )}
                <div className={`${styles.totalLine} ${styles.grandTotal}`}>
                  <span>Tổng thanh toán</span>
                  <span>{grandTotal.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div className={styles.qrPanel}>
                  <div className={styles.qrPanelHeader}>
                    <span className={styles.qrPanelBadge}>📱 Chuyển khoản VietQR</span>
                    <span className={styles.qrPanelWaiting}>
                      <span className={styles.qrPanelDot} />
                      Chờ xác nhận
                    </span>
                  </div>
                  <div className={styles.qrPanelBody}>
                    <img
                      src={buildVietQRUrl(grandTotal, order.code)}
                      alt="VietQR"
                      className={styles.qrPanelImage}
                    />
                    <div className={styles.qrPanelInfo}>
                      <div className={styles.qrPanelBank}>ACB</div>
                      <div className={styles.qrPanelField}>
                        <span className={styles.qrPanelLabel}>Số tài khoản</span>
                        <span className={styles.qrPanelValue}>
                          {VIETQR_BANK.accountNo}
                          <button
                            type="button"
                            className={styles.qrPanelCopyBtn}
                            onClick={() => {
                              navigator.clipboard.writeText(VIETQR_BANK.accountNo)
                              message.success('Đã sao chép STK')
                            }}
                          >
                            <CopyOutlined />
                          </button>
                        </span>
                      </div>
                      <div className={styles.qrPanelField}>
                        <span className={styles.qrPanelLabel}>Chủ tài khoản</span>
                        <span className={styles.qrPanelValue}>{VIETQR_BANK.accountName}</span>
                      </div>
                      <div className={styles.qrPanelField}>
                        <span className={styles.qrPanelLabel}>Số tiền</span>
                        <span className={`${styles.qrPanelValue} ${styles.qrPanelAmount}`}>
                          {grandTotal.toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                      <div className={styles.qrPanelField}>
                        <span className={styles.qrPanelLabel}>Nội dung CK</span>
                        <span className={styles.qrPanelValue}>
                          TheBrewCorner {order.code}
                          <button
                            type="button"
                            className={styles.qrPanelCopyBtn}
                            onClick={() => {
                              navigator.clipboard.writeText(`TheBrewCorner ${order.code}`)
                              message.success('Đã sao chép nội dung')
                            }}
                          >
                            <CopyOutlined />
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.actionsRow}>
                <Button className={styles.btnBack} onClick={() => navigate(-1)}>Quay lại</Button>
                <Button
                  icon={<SplitCellsOutlined />}
                  disabled={order.items.length < 2}
                  onClick={() => { setSplitSelected([]); setSplitModalOpen(true) }}
                >
                  Tách bill
                </Button>
                <Button icon={<MergeCellsOutlined />} onClick={openMergeModal}>
                  Gộp bàn
                </Button>
                <Button className={styles.btnPay} loading={paying} onClick={handlePay}>
                  {paymentMethod === 'BANK_TRANSFER' ? 'Đã nhận tiền ✓' : 'Thanh toán'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        title="Tách bill — chọn món chuyển sang bill mới"
        open={splitModalOpen}
        onOk={handleSplit}
        onCancel={() => setSplitModalOpen(false)}
        okText="Tách bill"
        cancelText="Hủy"
        confirmLoading={actionBusy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
          {order?.items.map((item) => (
            <Checkbox
              key={item.id}
              checked={splitSelected.includes(item.id)}
              onChange={(e) => {
                setSplitSelected((prev) =>
                  e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))
              }}
            >
              {item.name} × {item.qty} — {item.total.toLocaleString('vi-VN')}đ
            </Checkbox>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          Món được chọn sẽ chuyển sang một order mới cùng bàn để thanh toán riêng. Phải để lại ít nhất 1 món.
        </div>
      </Modal>

      <Modal
        title="Gộp order khác vào order này"
        open={mergeModalOpen}
        onOk={handleMerge}
        onCancel={() => setMergeModalOpen(false)}
        okText="Gộp"
        cancelText="Hủy"
        confirmLoading={actionBusy}
      >
        <div style={{ margin: '16px 0' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn order muốn gộp vào order hiện tại"
            value={mergeSourceId}
            onChange={setMergeSourceId}
            options={mergeOptions}
            notFoundContent="Không có order nào khác đang hoạt động"
          />
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          Toàn bộ món của order được chọn sẽ chuyển vào order hiện tại; order kia bị hủy và bàn của nó (nếu trống) sẽ trở về trạng thái trống.
        </div>
      </Modal>
    </AppLayout>
  )
}

export default CashierPayment
