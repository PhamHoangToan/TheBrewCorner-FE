import React, { useCallback, useEffect, useState } from 'react'
import { Button, InputNumber, Modal, Select, Table, Tag, message } from 'antd'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { purchaseOrderService, type PurchaseSuggestion, type PurchaseOrder } from '../../services/purchaseOrder.service'
import { supplierService, type Supplier } from '../../services/supplier.service'

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: 'Nháp' },
  SENT: { color: 'blue', label: 'Đã gửi NCC' },
  RECEIVED: { color: 'green', label: 'Đã nhận hàng' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

interface DraftLine extends PurchaseSuggestion { orderQty: number; estPrice: number }

const PurchaseOrders: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sug, list, sup] = await Promise.all([
        purchaseOrderService.suggestions(7),
        purchaseOrderService.list(),
        supplierService.list({ limit: 200 }),
      ])
      setSuggestions(sug.data ?? [])
      setOrders(list.data?.items ?? [])
      setSuppliers(sup.data?.items ?? [])
    } catch {
      message.error('Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => {
    setLines(suggestions.map((s) => ({ ...s, orderQty: s.suggestedQty, estPrice: 0 })))
    setSupplierId(undefined)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    const items = lines.filter((l) => l.orderQty > 0)
    if (!items.length) { message.warning('Chưa có mặt hàng nào'); return }
    const supplier = suppliers.find((s) => s.id === supplierId)
    if (!supplier) { message.warning('Chọn nhà cung cấp'); return }
    setBusy(true)
    try {
      await purchaseOrderService.create({
        supplierId: supplier.id,
        supplierName: supplier.name,
        createdById: user?.id,
        items: items.map((l) => ({
          ingredientId: l.ingredientId,
          ingredientName: l.ingredientName,
          quantity: l.orderQty,
          unit: l.unit,
          estPrice: l.estPrice,
        })),
      })
      message.success('Đã tạo đơn đặt hàng')
      setCreateOpen(false)
      fetchAll()
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Tạo đơn thất bại')
    } finally {
      setBusy(false)
    }
  }

  const doAction = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); fetchAll() }
    catch (err: any) { message.error(err?.response?.data?.message ?? 'Thao tác thất bại') }
  }

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Đặt hàng nhà cung cấp" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Đặt hàng NCC' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px' }}>
        <h3 style={{ margin: 0 }}>Đề xuất nhập hàng (sắp hết trong 7 ngày)</h3>
        <Button type="primary" style={{ background: '#662c21', borderColor: '#662c21' }} disabled={!suggestions.length} onClick={openCreate}>
          Tạo đơn từ đề xuất
        </Button>
      </div>
      <Table
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Không có nguyên liệu nào sắp hết' }}
        dataSource={suggestions.map((s) => ({ key: s.ingredientId, ...s }))}
        columns={[
          { title: 'Nguyên liệu', dataIndex: 'ingredientName', key: 'n' },
          { title: 'Tồn', dataIndex: 'stockQuantity', key: 's', align: 'right' as const, render: (v: number, r: any) => `${v} ${r.unit}` },
          { title: 'Dùng/ngày', dataIndex: 'avgDailyUsage', key: 'a', align: 'right' as const },
          { title: 'Còn (ngày)', dataIndex: 'daysUntilStockout', key: 'd', align: 'right' as const, render: (v: number) => <span style={{ color: v <= 3 ? '#b91c1c' : '#d97706' }}>{v}</span> },
          { title: 'Đề xuất nhập', dataIndex: 'suggestedQty', key: 'q', align: 'right' as const, render: (v: number, r: any) => <b>{v} {r.unit}</b> },
        ]}
      />

      <h3 style={{ margin: '24px 0 12px' }}>Danh sách đơn đặt hàng</h3>
      <Table
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Chưa có đơn đặt hàng' }}
        dataSource={orders.map((o) => ({ key: o.id, ...o }))}
        columns={[
          { title: 'Mã', dataIndex: 'code', key: 'c' },
          { title: 'NCC', dataIndex: 'supplierName', key: 's' },
          { title: 'Số mặt hàng', key: 'i', align: 'center' as const, render: (_: any, r: any) => r.items?.length ?? 0 },
          { title: 'Trạng thái', dataIndex: 'status', key: 't', render: (s: string) => <Tag color={STATUS_TAG[s]?.color}>{STATUS_TAG[s]?.label ?? s}</Tag> },
          {
            title: 'Thao tác', key: 'act', render: (_: any, r: PurchaseOrder) => (
              <div style={{ display: 'flex', gap: 8 }}>
                {r.status === 'DRAFT' && (
                  <Button size="small" onClick={() => doAction(() => purchaseOrderService.setStatus(r.id, 'SENT'), 'Đã đánh dấu gửi NCC')}>Gửi NCC</Button>
                )}
                {(r.status === 'DRAFT' || r.status === 'SENT') && (
                  <Button size="small" type="primary" onClick={() => doAction(() => purchaseOrderService.receive(r.id, { createdById: user?.id }), 'Đã nhận hàng + tạo phiếu nhập')}>Nhận hàng</Button>
                )}
                {r.status !== 'RECEIVED' && r.status !== 'CANCELLED' && (
                  <Button size="small" danger onClick={() => doAction(() => purchaseOrderService.setStatus(r.id, 'CANCELLED'), 'Đã hủy đơn')}>Hủy</Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Tạo đơn đặt hàng"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="Tạo đơn"
        cancelText="Hủy"
        confirmLoading={busy}
        width={720}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Nhà cung cấp</div>
          <Select
            style={{ width: '100%' }}
            placeholder="Chọn nhà cung cấp"
            value={supplierId}
            onChange={setSupplierId}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <Table
          pagination={false}
          size="small"
          dataSource={lines.map((l) => ({ key: l.ingredientId, ...l }))}
          columns={[
            { title: 'Nguyên liệu', dataIndex: 'ingredientName', key: 'n' },
            {
              title: 'SL đặt', key: 'q', width: 120,
              render: (_: any, r: DraftLine) => (
                <InputNumber min={0} value={r.orderQty} onChange={(v) => setLines((ls) => ls.map((x) => x.ingredientId === r.ingredientId ? { ...x, orderQty: Number(v ?? 0) } : x))} />
              ),
            },
            { title: 'ĐV', dataIndex: 'unit', key: 'u', width: 60 },
            {
              title: 'Giá dự kiến', key: 'p', width: 140,
              render: (_: any, r: DraftLine) => (
                <InputNumber min={0} value={r.estPrice} onChange={(v) => setLines((ls) => ls.map((x) => x.ingredientId === r.ingredientId ? { ...x, estPrice: Number(v ?? 0) } : x))} addonAfter="đ" />
              ),
            },
          ]}
        />
      </Modal>
    </AppLayout>
  )
}

export default PurchaseOrders
