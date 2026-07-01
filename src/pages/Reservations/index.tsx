import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Select, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { reservationService } from '../../services/reservation.service'
import { useSocketEvent } from '../../hooks/useSocket'

interface ReservationRow {
  key: string
  id: string
  customerName: string
  customerPhone: string
  numberOfGuests: number
  reservedTime: string
  tableName?: string
  note?: string
  status: string
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Đang chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã huỷ',
  COMPLETED: 'Hoàn thành',
  NO_SHOW: 'Không đến',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'gold',
  CONFIRMED: 'green',
  CANCELLED: 'red',
  COMPLETED: 'blue',
  NO_SHOW: 'default',
}

const mapReservation = (item: any): ReservationRow => ({
  key: item.id,
  id: item.id,
  customerName: item.customerName,
  customerPhone: item.customerPhone,
  numberOfGuests: item.numberOfGuests,
  reservedTime: item.reservedTime,
  tableName: item.table?.name,
  note: item.note,
  status: item.status,
})

const ReservationsPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reservationService.list({ status: statusFilter, date: dateFilter })
      const items: any[] = (res.data as any)?.items ?? []
      setRows(items.map(mapReservation))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFilter])

  useSocketEvent('notification:new', fetchData)

  useEffect(() => { fetchData() }, [fetchData])

  const handleConfirm = async (id: string) => {
    try {
      await reservationService.confirm(id)
      message.success('Đã xác nhận đặt bàn')
      fetchData()
    } catch { message.error('Xác nhận thất bại') }
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm('Huỷ yêu cầu đặt bàn này?')) return
    try {
      await reservationService.cancel(id)
      message.success('Đã huỷ đặt bàn')
      fetchData()
    } catch { message.error('Huỷ thất bại') }
  }

  const columns: ColumnsType<ReservationRow> = [
    { title: 'Khách hàng', dataIndex: 'customerName' },
    { title: 'SĐT', dataIndex: 'customerPhone' },
    { title: 'Số khách', dataIndex: 'numberOfGuests', align: 'center' },
    {
      title: 'Ngày giờ đến',
      dataIndex: 'reservedTime',
      render: (v: string) => new Date(v).toLocaleString('vi-VN'),
      sorter: (a, b) => new Date(a.reservedTime).getTime() - new Date(b.reservedTime).getTime(),
    },
    { title: 'Bàn', dataIndex: 'tableName', render: (v) => v ?? '—' },
    { title: 'Ghi chú', dataIndex: 'note', render: (v) => v ?? '—' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: 'Thao tác',
      render: (_, row) => (
        row.status === 'PENDING' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" type="primary" onClick={() => handleConfirm(row.id)}>Xác nhận</Button>
            <Button size="small" danger onClick={() => handleCancel(row.id)}>Huỷ</Button>
          </div>
        ) : row.status === 'CONFIRMED' ? (
          <Button size="small" danger onClick={() => handleCancel(row.id)}>Huỷ</Button>
        ) : null
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Đặt bàn trước" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          style={{ width: 220 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <DatePicker
          placeholder="Lọc theo ngày đến"
          onChange={(_, dateString) => setDateFilter((dateString as string) || undefined)}
        />
      </div>

      <Table columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />
    </AppLayout>
  )
}

export default ReservationsPage
