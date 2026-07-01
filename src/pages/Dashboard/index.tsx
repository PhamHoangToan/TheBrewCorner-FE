import React, { useEffect, useState } from 'react'
import { Spin } from 'antd'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import {
  DollarOutlined,
  ShoppingOutlined,
  TeamOutlined,
  WarningOutlined,
  CoffeeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { useCountUp } from '../../hooks/useCountUp'
import { dashboardService, type DashboardSummary } from '../../services/dashboard.service'
import styles from './dashboard.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}K`
    : String(n)

const fmtVND = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  SENT:               { label: 'Đã gửi',       cls: styles.badgeSent },
  PREPARING:          { label: 'Đang pha',      cls: styles.badgePreparing },
  READY:              { label: 'Sẵn sàng',      cls: styles.badgeReady },
  SERVED:             { label: 'Đã phục vụ',    cls: styles.badgeServed },
  CHECKOUT_REQUESTED: { label: 'Yêu cầu TT',   cls: styles.badgeCheckout },
  PAID:               { label: 'Đã thanh toán', cls: styles.badgePaid },
}

const PIE_COLORS = ['#52c41a', '#662c21', '#fa8c16']
const PIE_LABELS = ['Bàn trống', 'Đang phục vụ', 'Yêu cầu TT']

// ── Custom Tooltip ────────────────────────────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltipBox}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>{fmtVND(payload[0].value)}</div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiProps {
  icon: React.ReactNode
  iconCls: string
  rawValue: number
  suffix?: string
  label: string
  sub?: string
  subCls?: string
}

const KpiCard: React.FC<KpiProps> = ({ icon, iconCls, rawValue, suffix = '', label, sub, subCls }) => {
  const counted = useCountUp(rawValue)
  const display = rawValue >= 1_000_000
    ? `${(counted / 1_000_000).toFixed(1)}M`
    : rawValue >= 1_000
    ? `${(counted / 1_000).toFixed(0)}K`
    : String(counted)
  return (
    <div className={styles.kpiCard}>
      <div className={`${styles.kpiIcon} ${iconCls}`}>{icon}</div>
      <div className={styles.kpiInfo}>
        <div className={styles.kpiValue}>{display}{suffix}</div>
        <div className={styles.kpiLabel}>{label}</div>
        {sub && <div className={`${styles.kpiSub} ${subCls ?? ''}`}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardService.getSummary()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const greetHour = dayjs().hour()
  const greet =
    greetHour < 12 ? 'Chào buổi sáng' : greetHour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  if (loading) {
    return (
      <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
        <div className={styles.loadingWrap}><Spin size="large" /></div>
      </AppLayout>
    )
  }

  // Pie data
  const pieData = data
    ? [
        { name: PIE_LABELS[0], value: data.tableStatus.available },
        { name: PIE_LABELS[1], value: data.tableStatus.serving },
        { name: PIE_LABELS[2], value: data.tableStatus.checkoutRequested },
      ].filter((d) => d.value > 0)
    : []

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.page}>

        {/* Greeting */}
        <div>
          <p className={styles.greetingTitle}>{greet}, {user?.name?.split(' ').pop()} 👋</p>
          <p className={styles.greetingDate}>{dayjs().format('dddd, DD/MM/YYYY')}</p>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiRow}>
          <KpiCard
            icon={<DollarOutlined />}
            iconCls={styles.kpiIconRed}
            rawValue={data?.revenueToday ?? 0}
            suffix="đ"
            label="Doanh thu hôm nay"
            sub="Đơn đã thanh toán"
          />
          <KpiCard
            icon={<ShoppingOutlined />}
            iconCls={styles.kpiIconBlue}
            rawValue={data?.ordersToday ?? 0}
            label="Đơn hàng hôm nay"
            sub={`${data?.tablesServing ?? 0}/${data?.tablesTotal ?? 0} bàn đang phục vụ`}
          />
          <KpiCard
            icon={<TeamOutlined />}
            iconCls={styles.kpiIconGreen}
            rawValue={data?.staffCount ?? 0}
            label="Nhân viên đang hoạt động"
            sub="Tất cả vai trò"
          />
          <KpiCard
            icon={<WarningOutlined />}
            iconCls={styles.kpiIconOrange}
            rawValue={data?.lowStockCount ?? 0}
            label="Nguyên liệu sắp hết"
            sub={(data?.lowStockCount ?? 0) > 0 ? 'Cần nhập thêm' : 'Kho ổn định'}
            subCls={(data?.lowStockCount ?? 0) > 0 ? styles.kpiSubDanger : undefined}
          />
        </div>

        {/* Charts row: Area chart + Pie chart */}
        <div className={styles.chartsRow}>
          {/* Revenue area chart */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Doanh thu 7 ngày qua</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.revenueWeek ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#662c21" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#662c21" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmt(v)}
                  width={52}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#662c21"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={{ r: 4, fill: '#662c21', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#662c21', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart trạng thái bàn */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Trạng thái bàn</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData.length ? pieData : [{ name: 'Trống', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {(pieData.length ? pieData : [{ name: 'Trống', value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} bàn`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.pieLegend}>
              {[
                { label: 'Bàn trống', color: PIE_COLORS[0], value: data?.tableStatus.available ?? 0 },
                { label: 'Đang phục vụ', color: PIE_COLORS[1], value: data?.tableStatus.serving ?? 0 },
                { label: 'Yêu cầu TT', color: PIE_COLORS[2], value: data?.tableStatus.checkoutRequested ?? 0 },
              ].map((item) => (
                <div key={item.label} className={styles.pieLegendItem}>
                  <div className={styles.pieDot} style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <span className={styles.pieLegendValue}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Top products + Recent orders */}
        <div className={styles.bottomRow}>
          {/* Top products bar chart */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>
              <CoffeeOutlined style={{ marginRight: 8, color: '#662c21' }} />
              Top 5 sản phẩm bán chạy (7 ngày)
            </p>
            {(data?.topProducts?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={data!.topProducts}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 12, fill: '#444' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v) => [`${v} ly/phần`, 'Đã bán']} />
                  <Bar dataKey="qty" fill="#662c21" radius={[0, 6, 6, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '40px 0', fontSize: 13 }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>
              <ShoppingOutlined style={{ marginRight: 8, color: '#662c21' }} />
              Đơn hàng gần đây
            </p>
            <div className={styles.tableScroll}>
            <table className={styles.orderTable}>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Bàn</th>
                  <th>Trạng thái</th>
                  <th className={styles.amountCell}>Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentOrders ?? []).map((o, i) => {
                  const meta = STATUS_META[o.status] ?? { label: o.status, cls: '' }
                  return (
                    <tr key={o.id} style={{ '--i': i } as React.CSSProperties}>
                      <td className={styles.orderCode}>{o.code}</td>
                      <td>{o.tableName}</td>
                      <td>
                        <span className={`${styles.badge} ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className={styles.amountCell}>{fmt(o.totalAmount)}đ</td>
                    </tr>
                  )
                })}
                {!data?.recentOrders?.length && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#bbb', padding: '30px 0' }}>Không có đơn hàng</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

export default Dashboard
