import React, { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, message, Modal, Select, Table, Tag, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../components/common/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { ingredientService } from '../../services/ingredient.service'
import styles from './inventory.module.css'

interface Ingredient {
  key: string
  id?: string
  ma: string
  ten: string
  donVi: string
  usagePerUnit: number
  tonKho: number
  canhBao: number
  trangThai: 'Đủ hàng' | 'Sắp hết' | 'Hết hàng'
}

const MOCK_DATA: Ingredient[] = [
  { key: '1', ma: 'NVL001', ten: 'Cà phê Arabica', donVi: 'kg',   tonKho: 12, canhBao: 5, trangThai: 'Đủ hàng' },
  { key: '2', ma: 'NVL002', ten: 'Sữa tươi',        donVi: 'lít', tonKho: 3,  canhBao: 5, trangThai: 'Sắp hết' },
  { key: '3', ma: 'NVL003', ten: 'Đường trắng',      donVi: 'kg',  tonKho: 8,  canhBao: 3, trangThai: 'Đủ hàng' },
  { key: '4', ma: 'NVL004', ten: 'Trà xanh matcha',  donVi: 'kg',  tonKho: 0,  canhBao: 2, trangThai: 'Hết hàng' },
  { key: '5', ma: 'NVL005', ten: 'Kem tươi',         donVi: 'lít', tonKho: 2,  canhBao: 4, trangThai: 'Sắp hết' },
]

const STATUS_COLOR: Record<string, string> = { 'Đủ hàng': 'green', 'Sắp hết': 'orange', 'Hết hàng': 'red' }

const getStatus = (tonKho: number, canhBao: number): Ingredient['trangThai'] => {
  if (tonKho === 0) return 'Hết hàng'
  if (tonKho <= canhBao) return 'Sắp hết'
  return 'Đủ hàng'
}

const mapItem = (item: any, idx: number): Ingredient => {
  const tonKho = Number(item.stockQuantity ?? item.stockQty ?? item.tonKho ?? 0)
  const canhBao = Number(item.minQuantity ?? item.minStock ?? item.canhBao ?? 0)
  return {
    key: item.id ?? String(idx),
    id: item.id,
    ma: item.code ?? item.maNVL ?? `NVL${String(idx + 1).padStart(3, '0')}`,
    ten: item.name ?? item.tenNVL ?? '',
    donVi: item.unit ?? item.donVi ?? '',
    usagePerUnit: Number(item.usagePerUnit ?? 1),
    tonKho,
    canhBao,
    trangThai: getStatus(tonKho, canhBao),
  }
}

const Inventory: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ingredientService.list({ limit: 200 })
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
  const openEdit = (record: Ingredient) => {
    setEditing(record)
    form.setFieldsValue({ ten: record.ten, donVi: record.donVi, usagePerUnit: record.usagePerUnit, tonKho: record.tonKho, canhBao: record.canhBao })
    setModalOpen(true)
  }

  const handleDelete = async (record: Ingredient) => {
    if (!record.id) { setData((p) => p.filter((d) => d.key !== record.key)); return }
    try {
      await ingredientService.remove(record.id)
      message.success('Đã xóa nguyên vật liệu')
      fetchData()
    } catch { message.error('Xóa thất bại') }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const body = { name: values.ten, unit: values.donVi, usagePerUnit: values.usagePerUnit, tonKho: values.tonKho, canhBao: values.canhBao }
        if (editing?.id) {
          await ingredientService.update(editing.id, body)
          message.success('Đã cập nhật')
        } else {
          await ingredientService.create(body)
          message.success('Đã thêm nguyên vật liệu')
        }
        setModalOpen(false)
        fetchData()
      } catch { message.error('Lưu thất bại') }
    })
  }

  const columns: ColumnsType<Ingredient> = [
    { title: 'Mã NVL', dataIndex: 'ma', key: 'ma', width: 110 },
    { title: 'Tên nguyên vật liệu', dataIndex: 'ten', key: 'ten' },
    { title: 'Đơn vị', dataIndex: 'donVi', key: 'donVi', align: 'center', width: 90 },
    { title: 'Tồn kho', dataIndex: 'tonKho', key: 'tonKho', align: 'center', width: 100 },
    { title: 'Cảnh báo tối thiểu', dataIndex: 'canhBao', key: 'canhBao', align: 'center', width: 160 },
    { title: 'Trạng thái', dataIndex: 'trangThai', key: 'trangThai', width: 130,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    { title: 'Thao tác', key: 'action', width: 110,
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
        <Button type="primary" icon={<PlusOutlined />} className={styles.addBtn} onClick={openAdd}>Thêm nguyên vật liệu</Button>
      </div>
      <Table columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 10 }} className={styles.table} />
      <Modal title={editing ? 'Sửa nguyên vật liệu' : 'Thêm nguyên vật liệu'} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="ten" label="Tên nguyên vật liệu" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="donVi" label="Đơn vị tính" rules={[{ required: true }]}>
            <Select options={[
              { value: 'kg', label: 'kg' }, { value: 'lít', label: 'lít' },
              { value: 'chai', label: 'chai' }, { value: 'hộp', label: 'hộp' }, { value: 'gói', label: 'gói' },
              { value: 'lon', label: 'lon' }, { value: 'viên', label: 'viên' }, { value: 'cái', label: 'cái' },
            ]} />
          </Form.Item>
          <Form.Item
            name="usagePerUnit"
            label={
              <span>
                Hệ số quy đổi&nbsp;
                <Tooltip title="Số ml (hoặc g) trong 1 đơn vị mua. Ví dụ: 1 chai = 1000 ml → nhập 1000; 1 kg = 1000 g → nhập 1000; 1 hộp trân châu = 1000 viên → nhập 1000">
                  <QuestionCircleOutlined style={{ color: '#aaa' }} />
                </Tooltip>
              </span>
            }
            rules={[{ required: true }]}
          >
            <InputNumber min={0.0001} step={1} style={{ width: '100%' }} placeholder="VD: 1000" />
          </Form.Item>
          <Form.Item name="tonKho" label="Tồn kho" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="canhBao" label="Cảnh báo tối thiểu" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default Inventory
