import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Select, Table, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { activityLogService, type ActivityLog, type ActivityLogStats } from '../../services/activityLog.service'
import { userService } from '../../services/user.service'
import styles from './activityLog.module.css'

const MODULE_LABEL: Record<string, string> = {
  tables: 'Bàn',
  orders: 'Đơn hàng',
  invoices: 'Hóa đơn',
  products: 'Sản phẩm',
  categories: 'Danh mục',
  users: 'Nhân viên',
  shifts: 'Ca làm việc',
  attendance: 'Chấm công',
  payroll: 'Bảng lương',
  'leave-requests': 'Nghỉ phép',
  ingredients: 'Nguyên liệu',
  promotions: 'Khuyến mãi',
  finance: 'Thu chi',
  areas: 'Khu vực',
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Chủ cửa hàng',
  CASHIER: 'Thu ngân',
  BARISTA: 'Pha chế',
  WAITER: 'Phục vụ',
}

const ActivityLogPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([])
  const [userId, setUserId] = useState<string | undefined>()
  const [moduleFilter, setModuleFilter] = useState<string | undefined>()
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [stats, setStats] = useState<ActivityLogStats | null>(null)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await userService.staffList({ limit: 200 })
      const items: any[] = res.data?.items ?? []
      setStaffOptions(items.map((u) => ({ value: u.id, label: u.name })))
    } catch { /* ignore */ }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await activityLogService.list({
        page,
        limit: 20,
        ...(userId ? { userId } : {}),
        ...(moduleFilter ? { module: moduleFilter } : {}),
        ...(range ? { from: range[0].startOf('day').toISOString(), to: range[1].endOf('day').toISOString() } : {}),
      })
      setData(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
    } catch {
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, userId, moduleFilter, range])

  const fetchStats = useCallback(async () => {
    try {
      const res = await activityLogService.stats(
        range ? { from: range[0].startOf('day').toISOString(), to: range[1].endOf('day').toISOString() } : undefined,
      )
      setStats(res.data ?? null)
    } catch { setStats(null) }
  }, [range])

  useEffect(() => { fetchStaff() }, [fetchStaff])
  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchStats() }, [fetchStats])

  const columns: ColumnsType<ActivityLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Nhân viên',
      width: 200,
      render: (_, r) => r.userName ? (
        <div>
          <div style={{ fontWeight: 600 }}>{r.userName}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{ROLE_LABEL[r.userRole ?? ''] ?? r.userRole}</div>
        </div>
      ) : <span style={{ color: '#aaa' }}>Không xác định</span>,
    },
    {
      title: 'Hành động',
      dataIndex: 'description',
    },
    {
      title: 'Loại',
      dataIndex: 'action',
      width: 100,
      render: (v: string) => <Tag color={ACTION_COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Khu vực',
      dataIndex: 'module',
      width: 110,
      render: (v: string) => MODULE_LABEL[v] ?? v,
    },
    {
      title: 'Kết quả',
      dataIndex: 'statusCode',
      width: 90,
      render: (v: number) => v < 400
        ? <Tag color="green">Thành công</Tag>
        : <Tag color="red">Lỗi ({v})</Tag>,
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Nhật ký hoạt động" />

      <div className={styles.toolbar}>
        <Select
          allowClear
          placeholder="Lọc theo nhân viên"
          style={{ width: 200 }}
          options={staffOptions}
          value={userId}
          onChange={(v) => { setUserId(v); setPage(1) }}
          showSearch
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
        <Select
          allowClear
          placeholder="Lọc theo khu vực"
          style={{ width: 160 }}
          value={moduleFilter}
          onChange={(v) => { setModuleFilter(v); setPage(1) }}
          options={Object.entries(MODULE_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <DatePicker.RangePicker
          value={range as any}
          onChange={(v) => { setRange(v as [Dayjs, Dayjs] | null); setPage(1) }}
          format="DD/MM/YYYY"
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
      </div>

      {stats && (stats.byUser.length > 0 || stats.byHour.some((h) => h.count > 0)) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className={styles.tableWrap} style={{ flex: '1 1 360px', padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Top 10 người thao tác nhiều nhất</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byUser.map((u) => ({ name: u.userName ?? 'Không xác định', count: u.count }))} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#662c21" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.tableWrap} style={{ flex: '1 1 360px', padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Khung giờ hoạt động cao điểm</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byHour.map((h) => ({ hour: `${h.hour}h`, count: h.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" fontSize={11} interval={1} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#d48806" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showTotal: (t) => `Tổng ${t} hoạt động`,
          }}
        />
      </div>
    </AppLayout>
  )
}

export default ActivityLogPage
