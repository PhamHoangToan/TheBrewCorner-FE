import React, { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { supplierService, type Supplier } from '../../services/supplier.service'

const SuppliersPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await supplierService.list({ limit: 200 })
      setData(res.data?.items ?? [])
    } catch {
      message.error('Không tải được danh sách nhà cung cấp')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (record: Supplier) => {
    setEditing(record)
    form.setFieldsValue({ name: record.name, phone: record.phone, address: record.address, note: record.note })
    setModalOpen(true)
  }

  const handleDelete = async (record: Supplier) => {
    try {
      await supplierService.remove(record.id)
      message.success('Đã ẩn nhà cung cấp')
      fetchData()
    } catch { message.error('Ẩn thất bại') }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editing) {
          await supplierService.update(editing.id, values)
          message.success('Đã cập nhật nhà cung cấp')
        } else {
          await supplierService.create(values)
          message.success('Đã thêm nhà cung cấp')
        }
        setModalOpen(false)
        fetchData()
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? 'Lưu thất bại')
      }
    })
  }

  const columns: ColumnsType<Supplier> = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 150 },
    { title: 'Tên nhà cung cấp', dataIndex: 'name', key: 'name' },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', width: 130, render: (v) => v ?? '—' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address', ellipsis: true, render: (v) => v ?? '—' },
    {
      title: 'Số phiếu nhập',
      key: 'imports',
      align: 'center',
      width: 120,
      render: (_, r) => r._count?.imports ?? 0,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </div>
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Nhà cung cấp" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Nhà cung cấp' }]} />

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#662c21' }} onClick={openAdd}>
          Thêm nhà cung cấp
        </Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 15 }} />

      <Modal
        title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Công ty TNHH Cà Phê Việt" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0901234567" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Số nhà, đường, quận/huyện..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default SuppliersPage
