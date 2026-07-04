import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Table, Tabs } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { reportService } from '../../services/report.service'
import { exportCsv } from '../../utils/exportCsv'
import styles from './reports.module.css'

const { RangePicker } = DatePicker

interface RevenueRow {
  key: string
  ngay: string
  doanhthu: number
}

interface SalesRow {
  key: string
  tenmon: string
  soluongban: number
  doanhthu: number
}

interface HourRow {
  hour: number
  revenue: number
  orderCount: number
}

interface ProfitRow {
  key: string
  tenmon: string
  giaban: number
  giavon: number
  bienloinhuan: number
  bienloinhuanPct: number
  hasRecipe: boolean
  soluongban: number
  doanhthu: number
  loinhuan: number
}

interface ProfitSummary {
  totalRevenue: number
  totalCost: number
  totalProfit: number
}

const fmtVnd = (v: number) => v.toLocaleString('vi-VN')

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', E_WALLET: 'Ví điện tử',
}
const kpiBox: React.CSSProperties = { flex: 1, minWidth: 160, padding: 16, borderRadius: 10, background: '#faf7f5', border: '1px solid #eee' }
const kpiLabel: React.CSSProperties = { fontSize: 13, color: '#888', marginBottom: 6 }
const kpiValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#662c21' }

const revenueColumns: ColumnsType<RevenueRow> = [
  { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
  { title: 'Doanh thu (VND)', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right', render: fmtVnd },
]

const salesColumns: ColumnsType<SalesRow> = [
  { title: 'Tên món', dataIndex: 'tenmon', key: 'tenmon' },
  { title: 'Số lượng bán', dataIndex: 'soluongban', key: 'soluongban', align: 'center' },
  { title: 'Doanh thu (VND)', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right', render: fmtVnd },
]

const profitColumns: ColumnsType<ProfitRow> = [
  { title: 'Tên món', dataIndex: 'tenmon', key: 'tenmon' },
  { title: 'Giá bán', dataIndex: 'giaban', key: 'giaban', align: 'right', render: fmtVnd },
  {
    title: 'Giá vốn',
    dataIndex: 'giavon',
    key: 'giavon',
    align: 'right',
    render: (v: number, r) => (r.hasRecipe ? fmtVnd(v) : <span style={{ color: '#ccc' }}>chưa có công thức</span>),
  },
  {
    title: 'Biên LN',
    dataIndex: 'bienloinhuanPct',
    key: 'bienloinhuanPct',
    align: 'center',
    render: (v: number, r) =>
      r.hasRecipe ? (
        <span style={{ color: v >= 50 ? '#389e0d' : v >= 20 ? '#d48806' : '#cf1322', fontWeight: 600 }}>{v}%</span>
      ) : '—',
  },
  { title: 'Đã bán', dataIndex: 'soluongban', key: 'soluongban', align: 'center' },
  { title: 'Doanh thu', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right', render: fmtVnd },
  {
    title: 'Lợi nhuận',
    dataIndex: 'loinhuan',
    key: 'loinhuan',
    align: 'right',
    render: (v: number, r) =>
      r.hasRecipe ? (
        <strong style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>{fmtVnd(v)}</strong>
      ) : '—',
  },
]

const Reports: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()])
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([])
  const [salesRows, setSalesRows] = useState<SalesRow[]>([])
  const [hourRows, setHourRows] = useState<HourRow[]>([])
  const [profitRows, setProfitRows] = useState<ProfitRow[]>([])
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null)
  const [zReport, setZReport] = useState<any | null>(null)
  const [waste, setWaste] = useState<any | null>(null)
  const [staffRows, setStaffRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const params = { startDate: range[0].format('YYYY-MM-DD'), endDate: range[1].format('YYYY-MM-DD') }
    try {
      const [revenueRes, salesRes, hourRes, profitRes, zRes, wasteRes, staffRes] = await Promise.all([
        reportService.revenue(params),
        reportService.sales(params),
        reportService.revenueByHour(params),
        reportService.profit(params),
        reportService.zReport({ date: range[1].format('YYYY-MM-DD') }),
        reportService.waste(params),
        reportService.staffPerformance(params),
      ]) as any
      setZReport(zRes.data ?? null)
      setWaste(wasteRes.data ?? null)
      setStaffRows((staffRes?.data as any) ?? [])
      const revenueItems: any[] = (revenueRes.data as any) ?? []
      setRevenueRows(revenueItems.map((r, idx) => ({
        key: r.code ?? String(idx),
        ngay: new Date(r.date).toLocaleString('vi-VN'),
        doanhthu: Number(r.totalAmount),
      })))

      const salesItems: any[] = (salesRes.data as any) ?? []
      setSalesRows(salesItems.map((s, idx) => ({
        key: s.productId ?? String(idx),
        tenmon: s.productName,
        soluongban: s.quantity,
        doanhthu: Number(s.revenue),
      })))

      const hourItems: any[] = (hourRes.data as any) ?? []
      setHourRows(hourItems)

      const profitData: any = profitRes.data ?? {}
      setProfitRows(((profitData.items as any[]) ?? []).map((p) => ({
        key: p.productId,
        tenmon: p.name,
        giaban: Number(p.price),
        giavon: Number(p.cost),
        bienloinhuan: Number(p.margin),
        bienloinhuanPct: Number(p.marginPercent),
        hasRecipe: !!p.hasRecipe,
        soluongban: Number(p.soldQty),
        doanhthu: Number(p.revenue),
        loinhuan: Number(p.profit),
      })))
      setProfitSummary(profitData.summary ?? null)
    } catch {
      setRevenueRows([])
      setSalesRows([])
      setHourRows([])
      setProfitRows([])
      setProfitSummary(null)
      setZReport(null)
      setWaste(null)
      setStaffRows([])
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleRangeChange = (values: any) => {
    if (values?.[0] && values?.[1]) setRange([values[0], values[1]])
  }

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Báo cáo" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Báo cáo' }]} />

      <Tabs
        className={styles.tabs}
        items={[
          {
            key: 'doanhthu',
            label: 'Báo cáo doanh thu',
            children: (
              <>
                <div className={styles.filterRow} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
                  <Button icon={<DownloadOutlined />} onClick={() => exportCsv('doanh-thu', [{ key: 'ngay', label: 'Ngày' }, { key: 'doanhthu', label: 'Doanh thu' }], revenueRows)}>
                    Xuất CSV
                  </Button>
                </div>
                <div className={styles.tableWrap}>
                  <Table columns={revenueColumns} dataSource={revenueRows} loading={loading} pagination={{ pageSize: 10 }} />
                </div>
              </>
            ),
          },
          {
            key: 'banhang',
            label: 'Báo cáo bán hàng',
            children: (
              <>
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
                </div>
                <div className={styles.tableWrap}>
                  <Table columns={salesColumns} dataSource={salesRows} loading={loading} pagination={{ pageSize: 10 }} />
                </div>
              </>
            ),
          },
          {
            key: 'loinhuan',
            label: 'Lợi nhuận',
            children: (
              <>
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
                </div>
                {profitSummary && (
                  <div style={{ display: 'flex', gap: 24, margin: '16px 0', flexWrap: 'wrap' }}>
                    <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '12px 20px' }}>
                      <div style={{ fontSize: 12, color: '#888' }}>Doanh thu</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtVnd(profitSummary.totalRevenue)} đ</div>
                    </div>
                    <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '12px 20px' }}>
                      <div style={{ fontSize: 12, color: '#888' }}>Giá vốn (COGS)</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtVnd(profitSummary.totalCost)} đ</div>
                    </div>
                    <div style={{ background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 8, padding: '12px 20px' }}>
                      <div style={{ fontSize: 12, color: '#888' }}>Lợi nhuận gộp</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: profitSummary.totalProfit >= 0 ? '#389e0d' : '#cf1322' }}>
                        {fmtVnd(profitSummary.totalProfit)} đ
                      </div>
                    </div>
                  </div>
                )}
                <div className={styles.tableWrap}>
                  <Table columns={profitColumns} dataSource={profitRows} loading={loading} pagination={{ pageSize: 10 }} />
                </div>
              </>
            ),
          },
          {
            key: 'khunggio',
            label: 'Doanh thu theo khung giờ',
            children: (
              <>
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
                </div>
                <div style={{ width: '100%', height: 360, marginTop: 16 }}>
                  <ResponsiveContainer>
                    <BarChart data={hourRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                      <YAxis />
                      <Tooltip
                        formatter={(v) => fmtVnd(Number(Array.isArray(v) ? v[0] : v))}
                        labelFormatter={(h) => `${h}h - ${Number(h) + 1}h`}
                      />
                      <Bar dataKey="revenue" fill="#662c21" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ),
          },
          {
            key: 'chotca',
            label: 'Chốt ca / Z-report',
            children: (
              <>
                <div className={styles.filterRow}>
                  <DatePicker
                    format="DD/MM/YYYY"
                    value={range[1]}
                    onChange={(d) => d && setRange([d.startOf('day'), d.endOf('day')])}
                  />
                </div>
                {zReport ? (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={kpiBox}>
                        <div style={kpiLabel}>Doanh thu (gross)</div>
                        <div style={kpiValue}>{fmtVnd(zReport.grossRevenue ?? 0)}</div>
                      </div>
                      <div style={kpiBox}>
                        <div style={kpiLabel}>Hoàn tiền ({zReport.refundCount ?? 0})</div>
                        <div style={{ ...kpiValue, color: '#b91c1c' }}>−{fmtVnd(zReport.totalRefund ?? 0)}</div>
                      </div>
                      <div style={kpiBox}>
                        <div style={kpiLabel}>Doanh thu thực (net)</div>
                        <div style={{ ...kpiValue, color: '#166534' }}>{fmtVnd(zReport.netRevenue ?? 0)}</div>
                      </div>
                    </div>

                    <Table
                      title={() => 'Theo phương thức thanh toán'}
                      pagination={false}
                      dataSource={(zReport.byMethod ?? []).map((m: any, i: number) => ({ key: i, ...m }))}
                      columns={[
                        { title: 'Phương thức', dataIndex: 'method', key: 'method', render: (m: string) => PAYMENT_LABEL[m] ?? m },
                        { title: 'Số giao dịch', dataIndex: 'count', key: 'count', align: 'center' as const },
                        { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: fmtVnd },
                      ]}
                    />

                    <Table
                      title={() => 'Ca quỹ trong ngày'}
                      pagination={false}
                      locale={{ emptyText: 'Không có ca quỹ' }}
                      dataSource={(zReport.cashSessions ?? []).map((s: any) => ({ key: s.id, ...s }))}
                      columns={[
                        { title: 'Thu ngân', dataIndex: 'cashier', key: 'cashier' },
                        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s: string) => (s === 'OPEN' ? 'Đang mở' : 'Đã đóng') },
                        { title: 'Đầu ca', dataIndex: 'openingFloat', key: 'openingFloat', align: 'right' as const, render: fmtVnd },
                        { title: 'Dự kiến', dataIndex: 'expectedCash', key: 'expectedCash', align: 'right' as const, render: (v: number | null) => (v == null ? '—' : fmtVnd(v)) },
                        { title: 'Thực đếm', dataIndex: 'countedCash', key: 'countedCash', align: 'right' as const, render: (v: number | null) => (v == null ? '—' : fmtVnd(v)) },
                        {
                          title: 'Chênh lệch', dataIndex: 'difference', key: 'difference', align: 'right' as const,
                          render: (v: number | null) => (v == null ? '—' : <span style={{ color: v === 0 ? '#166534' : '#b91c1c' }}>{fmtVnd(v)}</span>),
                        },
                      ]}
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: 24, color: '#999' }}>Không có dữ liệu</div>
                )}
              </>
            ),
          },
          {
            key: 'haohut',
            label: 'Hao hụt',
            children: (
              <>
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
                </div>
                <div style={{ marginTop: 12, marginBottom: 12, fontSize: 15 }}>
                  Tổng giá trị hao hụt (đổ bỏ / hết hạn):{' '}
                  <b style={{ color: '#b91c1c' }}>{fmtVnd(waste?.totalCost ?? 0)}đ</b>
                </div>
                <Table
                  pagination={false}
                  locale={{ emptyText: 'Không có hao hụt trong kỳ' }}
                  dataSource={(waste?.items ?? []).map((w: any) => ({ key: w.ingredientId, ...w }))}
                  columns={[
                    { title: 'Nguyên liệu', dataIndex: 'ingredientName', key: 'ingredientName' },
                    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
                    { title: 'Giá nhập', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right' as const, render: fmtVnd },
                    { title: 'Giá trị hao hụt', dataIndex: 'cost', key: 'cost', align: 'right' as const, render: (v: number) => <span style={{ color: '#b91c1c' }}>{fmtVnd(v)}</span> },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'hieusuat',
            label: 'Hiệu suất nhân viên',
            children: (
              <>
                <div className={styles.filterRow} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
                  <Button icon={<DownloadOutlined />} onClick={() => exportCsv('hieu-suat-nhan-vien', [{ key: 'name', label: 'Nhân viên' }, { key: 'code', label: 'Mã' }, { key: 'invoiceCount', label: 'Số hóa đơn' }, { key: 'revenue', label: 'Doanh thu' }], staffRows)}>
                    Xuất CSV
                  </Button>
                </div>
                <Table
                  pagination={false}
                  locale={{ emptyText: 'Không có dữ liệu' }}
                  dataSource={staffRows.map((s: any) => ({ key: s.userId, ...s }))}
                  columns={[
                    { title: 'Nhân viên', dataIndex: 'name', key: 'name' },
                    { title: 'Mã', dataIndex: 'code', key: 'code' },
                    { title: 'Số hóa đơn', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'center' as const },
                    { title: 'Doanh thu', dataIndex: 'revenue', key: 'revenue', align: 'right' as const, render: fmtVnd },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
    </AppLayout>
  )
}

export default Reports
