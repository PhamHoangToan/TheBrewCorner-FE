import React, { useCallback, useEffect, useState } from 'react'
import { DatePicker, Table, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { reportService } from '../../services/report.service'
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

const fmtVnd = (v: number) => v.toLocaleString('vi-VN')

const revenueColumns: ColumnsType<RevenueRow> = [
  { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
  { title: 'Doanh thu (VND)', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right', render: fmtVnd },
]

const salesColumns: ColumnsType<SalesRow> = [
  { title: 'Tên món', dataIndex: 'tenmon', key: 'tenmon' },
  { title: 'Số lượng bán', dataIndex: 'soluongban', key: 'soluongban', align: 'center' },
  { title: 'Doanh thu (VND)', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right', render: fmtVnd },
]

const Reports: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()])
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([])
  const [salesRows, setSalesRows] = useState<SalesRow[]>([])
  const [hourRows, setHourRows] = useState<HourRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const params = { startDate: range[0].format('YYYY-MM-DD'), endDate: range[1].format('YYYY-MM-DD') }
    try {
      const [revenueRes, salesRes, hourRes] = await Promise.all([
        reportService.revenue(params),
        reportService.sales(params),
        reportService.revenueByHour(params),
      ])
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
    } catch {
      setRevenueRows([])
      setSalesRows([])
      setHourRows([])
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
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" value={range} onChange={handleRangeChange} />
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
        ]}
      />
    </AppLayout>
  )
}

export default Reports
