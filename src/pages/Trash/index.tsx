import React, { useCallback, useEffect, useState } from 'react'
import { Button, Select, Table, message } from 'antd'
import { UndoOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { trashService, type TrashItem } from '../../services/trash.service'

const TYPE_OPTIONS = [
  { value: 'products', label: 'Sản phẩm' },
  { value: 'categories', label: 'Danh mục' },
  { value: 'users', label: 'Nhân viên / Khách hàng' },
  { value: 'ingredients', label: 'Nguyên liệu' },
  { value: 'promotions', label: 'Khuyến mãi' },
  { value: 'areas', label: 'Khu vực' },
  { value: 'tables', label: 'Bàn' },
  { value: 'shifts', label: 'Ca làm việc' },
  { value: 'shift-assignments', label: 'Phân ca' },
  { value: 'orders', label: 'Đơn hàng' },
  { value: 'invoices', label: 'Hóa đơn' },
  { value: 'finance', label: 'Thu chi' },
  { value: 'attendance', label: 'Chấm công' },
  { value: 'suppliers', label: 'Nhà cung cấp' },
]

// Bản ghi mỗi loại có field khác nhau — lấy field mô tả đầu tiên có giá trị
const displayName = (item: TrashItem) =>
  String(item.name ?? item.productName ?? item.content ?? item.code ?? item.id)

const TrashPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [type, setType] = useState('products')
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await trashService.list(type)
      setItems(res.data.items ?? [])
    } catch {
      message.error('Không tải được danh sách đã ẩn')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRestore = async (item: TrashItem) => {
    try {
      await trashService.restore(type, item.id)
      message.success(`Đã khôi phục "${displayName(item)}"`)
      fetchData()
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Khôi phục thất bại')
    }
  }

  const columns: ColumnsType<TrashItem> = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 160, render: (v) => v ?? '—' },
    { title: 'Tên / Nội dung', key: 'name', render: (_, r) => displayName(r) },
    {
      title: 'Ẩn lúc',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : ''),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (_, r) => (
        <Button size="small" icon={<UndoOutlined />} onClick={() => handleRestore(r)}>
          Khôi phục
        </Button>
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Bản ghi đã ẩn" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Đã ẩn' }]} />

      <div style={{ marginBottom: 16 }}>
        <Select
          value={type}
          onChange={setType}
          options={TYPE_OPTIONS}
          style={{ width: 260 }}
          size="large"
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'Không có bản ghi nào bị ẩn trong mục này' }}
      />
    </AppLayout>
  )
}

export default TrashPage
