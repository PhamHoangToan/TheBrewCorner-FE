import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Select, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { reservationService } from '../../services/reservation.service'
import { tableService } from '../../services/table.service'
import { useSocketEvent } from '../../hooks/useSocket'

interface ReservationRow {
  key: string
  id: string
  customerName: string
  customerPhone: string
  numberOfGuests: number
  reservedTime: string
  tableId?: string
  tableName?: string
  note?: string
  status: string
}

interface TableOption {
  id: string
  name: string
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
  tableId: item.tableId ?? undefined,
  tableName: item.table?.name,
  note: item.note,
  status: item.status,
})

const ReservationsPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [tables, setTables] = useState<TableOption[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined)
  const [selectedTable, setSelectedTable] = useState<Record<string, string | undefined>>({})

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

  const fetchTables = useCallback(async () => {
    try {
      const res = await tableService.list({ limit: 200, status: 'AVAILABLE' })
      const items: any[] = (res.data as any)?.items ?? []
      setTables(items.map((t) => ({ id: t.id, name: t.name, status: t.status })))
    } catch {
      setTables([])
    }
  }, [])

  useSocketEvent('notification:new', fetchData)

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchTables() }, [fetchTables])

  const handleConfirm = async (row: ReservationRow) => {
    const tableId = selectedTable[row.id] ?? row.tableId
    try {
      await reservationService.confirm(row.id, tableId)
      message.success('Đã xác nhận đặt bàn')
      fetchData()
      fetchTables()
    } catch (error: any) {
      message.error(error?.response?.data?.message ?? 'Xác nhận thất bại')
    }
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm('Huỷ yêu cầu đặt bàn này?')) return
    try {
      await reservationService.cancel(id)
      message.success('Đã huỷ đặt bàn')
      fetchData()
      fetchTables()
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
    {
      title: 'Bàn',
      key: 'table',
      width: 180,
      render: (_, row) => {
        if (row.status !== 'PENDING') return row.tableName ?? '—'
        // tables đã lọc AVAILABLE ngay từ BE, không cần lọc lại phía client
        const availableOptions = tables.map((t) => ({ value: t.id, label: t.name }))
        return (
          <Select
            allowClear
            size="small"
            style={{ width: 150 }}
            placeholder="Chọn bàn"
            value={selectedTable[row.id] ?? row.tableId}
            onChange={(value) => setSelectedTable((prev) => ({ ...prev, [row.id]: value }))}
            options={availableOptions}
          />
        )
      },
    },
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
            <Button size="small" type="primary" onClick={() => handleConfirm(row)}>Xác nhận</Button>
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
