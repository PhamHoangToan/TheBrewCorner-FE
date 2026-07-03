import React, { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, message, Modal, Table, Tag } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { categoryService } from '../../../services/category.service'
import styles from './categoryList.module.css'

interface Category {
  key: string
  id?: string
  ma: string
  ten: string
  moTa: string
  soMon: number
  trangThai: 'Đang dùng' | 'Ẩn'
}

const MOCK_DATA: Category[] = [
  { key: '1', ma: 'DM001', ten: 'Cà phê', moTa: 'Các loại cà phê', soMon: 6, trangThai: 'Đang dùng' },
  { key: '2', ma: 'DM002', ten: 'Trà', moTa: 'Các loại trà', soMon: 4, trangThai: 'Đang dùng' },
  { key: '3', ma: 'DM003', ten: 'Bánh & Tráng miệng', moTa: 'Bánh ngọt và tráng miệng', soMon: 5, trangThai: 'Đang dùng' },
  { key: '4', ma: 'DM004', ten: 'Khác', moTa: 'Đồ uống khác', soMon: 2, trangThai: 'Ẩn' },
]

const mapItem = (item: any, idx: number): Category => ({
  key: item.id ?? String(idx),
  id: item.id,
  ma: item.code ?? item.ma ?? `DM${String(idx + 1).padStart(3, '0')}`,
  ten: item.name ?? item.ten ?? '',
  moTa: item.description ?? item.moTa ?? '',
  soMon: item._count?.products ?? item.productCount ?? item.soMon ?? 0,
  trangThai: (item.isActive !== false && item.status !== 'INACTIVE' && item.trangThai !== 'Ẩn') ? 'Đang dùng' : 'Ẩn',
})

const CategoryList: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await categoryService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      setData(items.map(mapItem))
    } catch {
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (record: Category) => { setEditing(record); form.setFieldsValue({ ten: record.ten, moTa: record.moTa }); setModalOpen(true) }

  const handleDelete = async (record: Category) => {
    if (!record.id) { setData((p) => p.filter((d) => d.key !== record.key)); return }
    try {
      await categoryService.remove(record.id)
      message.success('Đã ẩn danh mục')
      fetchData()
    } catch { message.error('Ẩn thất bại') }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editing?.id) {
          await categoryService.update(editing.id, { name: values.ten, description: values.moTa })
          message.success('Đã cập nhật danh mục')
        } else {
          await categoryService.create({ name: values.ten, description: values.moTa })
          message.success('Đã thêm danh mục mới')
        }
        setModalOpen(false)
        fetchData()
      } catch { message.error('Lưu thất bại') }
    })
  }

  const columns: ColumnsType<Category> = [
    { title: 'Mã danh mục', dataIndex: 'ma', key: 'ma', width: 140 },
    { title: 'Tên danh mục', dataIndex: 'ten', key: 'ten' },
    { title: 'Mô tả', dataIndex: 'moTa', key: 'moTa' },
    { title: 'Số món', dataIndex: 'soMon', key: 'soMon', align: 'center', width: 100 },
    { title: 'Trạng thái', dataIndex: 'trangThai', key: 'trangThai', width: 130,
      render: (v: string) => <Tag color={v === 'Đang dùng' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Thao tác', key: 'action', width: 120,
      render: (_, record) => (
        <div className={styles.actionBtns}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </div>
      )},
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.toolbar}>
        <Button type="primary" icon={<PlusOutlined />} className={styles.addBtn} onClick={openAdd}>Thêm danh mục</Button>
      </div>
      <Table columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 10 }} className={styles.table} />
      <Modal title={editing ? 'Sửa danh mục' : 'Thêm danh mục mới'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="ten" label="Tên danh mục" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="moTa" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default CategoryList
