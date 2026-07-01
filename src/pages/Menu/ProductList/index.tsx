import React, { useCallback, useEffect, useState } from 'react'
import { Button, Form, Image, Input, InputNumber, message, Modal, Select, Table, Upload } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import AppLayout from '../../../components/common/AppLayout'
import PageHeader from '../../../components/common/PageHeader'
import { useAuth } from '../../../hooks/useAuth'
import { productService } from '../../../services/product.service'
import { categoryService } from '../../../services/category.service'
import { uploadService } from '../../../services/upload.service'
import styles from './productList.module.css'

interface Product {
  key: string
  id?: string
  loaimon: string
  tenmon: string
  nhomthucdon: string
  categoryId?: string
  donvitinh: string
  gia: number
  anhUrl?: string
  ingredients: string[]
}

const MOCK_DATA: Product[] = [
  { key: '1',  loaimon: 'Đồ uống', mamon: 'U01', tenmon: 'Cappuccino',       nhomthucdon: 'Coffe', donvitinh: 'Ly',    gia: 65000 },
  { key: '2',  loaimon: 'Đồ uống', mamon: 'U02', tenmon: 'Cafe Latte',        nhomthucdon: 'Coffe', donvitinh: 'Ly',    gia: 65000 },
  { key: '3',  loaimon: 'Đồ uống', mamon: 'U03', tenmon: 'Espresso',          nhomthucdon: 'Coffe', donvitinh: 'Ly',    gia: 39000 },
  { key: '4',  loaimon: 'Đồ uống', mamon: 'U04', tenmon: 'Trà Thạch Đào',    nhomthucdon: 'Trà',   donvitinh: 'Ly',    gia: 39000 },
  { key: '5',  loaimon: 'Đồ uống', mamon: 'U05', tenmon: 'Trà Thạch Vải',    nhomthucdon: 'Trà',   donvitinh: 'Ly',    gia: 39000 },
  { key: '6',  loaimon: 'Đồ uống', mamon: 'U06', tenmon: 'Black Coffee',      nhomthucdon: 'Coffe', donvitinh: 'Ly',    gia: 25000 },
  { key: '7',  loaimon: 'Đồ uống', mamon: 'U07', tenmon: 'Flat White',        nhomthucdon: 'Coffe', donvitinh: 'Ly',    gia: 45000 },
  { key: '8',  loaimon: 'Đồ uống', mamon: 'U08', tenmon: 'Irish Coffee',      nhomthucdon: 'Coffe', donvitinh: 'Ly',    gia: 50000 },
  { key: '9',  loaimon: 'Đồ ăn',   mamon: 'A01', tenmon: 'Tiramisu',          nhomthucdon: 'Bánh',  donvitinh: 'Phần', gia: 30000 },
  { key: '10', loaimon: 'Đồ ăn',   mamon: 'A02', tenmon: 'Phô Mai Trà Xanh', nhomthucdon: 'Bánh',  donvitinh: 'Phần', gia: 29000 },
  { key: '11', loaimon: 'Đồ ăn',   mamon: 'A03', tenmon: 'Mousse Cacao',      nhomthucdon: 'Bánh',  donvitinh: 'Phần', gia: 29000 },
  { key: '12', loaimon: 'Đồ ăn',   mamon: 'A04', tenmon: 'Phô Mai Caramel',   nhomthucdon: 'Bánh',  donvitinh: 'Phần', gia: 29000 },
]

const mapItem = (item: any, idx: number): Product => ({
  key: item.id ?? String(idx),
  id: item.id,
  tenmon: item.name ?? item.tenmon ?? '',
  loaimon: item.type ?? item.loaimon ?? 'Đồ uống',
  nhomthucdon: item.category?.name ?? item.categoryName ?? item.nhomthucdon ?? '',
  categoryId: item.categoryId ?? item.category?.id,
  donvitinh: item.unit ?? item.donvitinh ?? 'Ly',
  gia: Number(item.price ?? item.gia ?? 0),
  anhUrl: item.imageUrl ?? item.anhUrl,
  ingredients: (item.recipes ?? []).map((r: any) => r.ingredient?.name ?? '').filter(Boolean),
})

const ProductList: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
  const [selected, setSelected] = useState<React.Key[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [form] = Form.useForm()

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      const seenId = new Set<string>()
      const opts = items
        .map((c) => ({ value: c.id ?? '', label: c.name ?? c.ten ?? '' }))
        .filter((o) => o.value && !seenId.has(o.value) && seenId.add(o.value))
      if (opts.length) setCategoryOptions(opts)
    } catch { /* giữ options cũ */ }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productService.list({ limit: 200 })
      const items: any[] = res.data?.items ?? res.data ?? []
      setData(items.map(mapItem))
    } catch {
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); fetchCategories() }, [fetchData, fetchCategories])

  const openAdd = () => {
    setEditing(null)
    setFileList([])
    setPreviewUrl('')
    setPendingFile(null)
    form.resetFields()
    fetchCategories()
    setModalOpen(true)
  }

  const openEdit = () => {
    const record = data.find((d) => d.key === selected[0])
    if (!record) return
    setEditing(record)
    setPreviewUrl(record.anhUrl ?? '')
    setFileList(record.anhUrl ? [{ uid: '-1', name: 'anh.png', status: 'done', url: record.anhUrl }] : [])
    form.setFieldsValue({ ...record, nhomthucdon: record.categoryId ?? record.nhomthucdon })
    fetchCategories()
    setModalOpen(true)
  }

  const handleDelete = async () => {
    const toDelete = data.filter((d) => selected.includes(d.key))
    try {
      await Promise.all(toDelete.filter((d) => d.id).map((d) => productService.remove(d.id!)))
      message.success('Đã xóa món')
      setSelected([])
      fetchData()
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        let anhUrl = editing?.anhUrl
        if (pendingFile) {
          try { anhUrl = await uploadService.uploadImage(pendingFile) } catch { /* keep local preview */ }
        } else if (previewUrl && !previewUrl.startsWith('blob:')) {
          anhUrl = previewUrl
        }
        const body = {
          name: values.tenmon,
          type: values.loaimon,
          unit: values.donvitinh,
          price: values.gia,
          categoryId: values.nhomthucdon,
          ...(anhUrl ? { imageUrl: anhUrl } : {}),
        }
        if (editing?.id) {
          await productService.update(editing.id, body)
          message.success('Đã cập nhật món')
        } else {
          await productService.create(body)
          message.success('Đã thêm món mới')
        }
        setModalOpen(false)
        setSelected([])
        fetchData()
      } catch { message.error('Lưu thất bại') }
    })
  }

  const columns: ColumnsType<Product> = [
    {
      title: 'Ảnh',
      dataIndex: 'anhUrl',
      key: 'anhUrl',
      width: 72,
      render: (url: string) =>
        url ? (
          <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          <div className={styles.imgPlaceholder}>☕</div>
        ),
    },
    { title: 'Tên món',        dataIndex: 'tenmon',      key: 'tenmon',      width: 220 },
    { title: 'Nhóm thực đơn', dataIndex: 'nhomthucdon', key: 'nhomthucdon', width: 160 },
    {
      title: 'Thành phần',
      dataIndex: 'ingredients',
      key: 'ingredients',
      render: (ings: string[]) =>
        ings.length ? (
          <span style={{ fontSize: 12, color: '#666' }}>{ings.join(' · ')}</span>
        ) : (
          <span style={{ color: '#ccc' }}>—</span>
        ),
    },
    { title: 'Đơn vị',        dataIndex: 'donvitinh',   key: 'donvitinh',   align: 'center', width: 90 },
    {
      title: 'Giá',
      dataIndex: 'gia',
      key: 'gia',
      align: 'right',
      width: 130,
      render: (v: number) => `${v.toLocaleString('vi-VN')} đ`,
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Thực đơn" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Thực đơn' }]} />

      <div className={styles.toolbar}>
        <Button className={styles.btnAdd} icon={<PlusOutlined />} onClick={openAdd}>Thêm</Button>
        <Button className={styles.btnEdit} icon={<EditOutlined />} disabled={selected.length !== 1} onClick={openEdit}>Sửa</Button>
        <Button danger icon={<DeleteOutlined />} disabled={selected.length === 0} onClick={handleDelete}>Xóa</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} món` }}
        className={styles.table}
      />

      <Modal
        title={editing ? 'Sửa món' : 'Thêm món mới'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Ảnh món">
            <div className={styles.uploadArea}>
              {previewUrl ? (
                <div className={styles.previewWrap}>
                  <img src={previewUrl} alt="preview" className={styles.previewImg} />
                  <Button
                    size="small"
                    danger
                    className={styles.removeImg}
                    onClick={() => { setPreviewUrl(''); setPendingFile(null); setFileList([]) }}
                  >
                    Xóa ảnh
                  </Button>
                </div>
              ) : (
                <Upload
                  listType="picture"
                  fileList={fileList}
                  beforeUpload={(file) => {
                    const url = URL.createObjectURL(file)
                    setPreviewUrl(url)
                    setPendingFile(file)
                    setFileList([{ uid: '-1', name: file.name, status: 'done', url }])
                    return false
                  }}
                  onRemove={() => { setPreviewUrl(''); setPendingFile(null); setFileList([]) }}
                  maxCount={1}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
                </Upload>
              )}
            </div>
          </Form.Item>

          <Form.Item name="tenmon" label="Tên món" rules={[{ required: true, message: 'Vui lòng nhập tên món' }]}>
            <Input placeholder="VD: Cappuccino" />
          </Form.Item>
          <Form.Item name="loaimon" label="Loại món" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Đồ uống', label: 'Đồ uống' },
              { value: 'Đồ ăn',   label: 'Đồ ăn' },
            ]} />
          </Form.Item>
          <Form.Item name="nhomthucdon" label="Nhóm thực đơn" rules={[{ required: true }]}>
            <Select options={categoryOptions} placeholder="Chọn nhóm thực đơn" />
          </Form.Item>
          <Form.Item name="donvitinh" label="Đơn vị tính" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Ly',    label: 'Ly' },
              { value: 'Phần', label: 'Phần' },
              { value: 'Cái',  label: 'Cái' },
            ]} />
          </Form.Item>
          <Form.Item name="gia" label="Giá (VND)" rules={[{ required: true, message: 'Vui lòng nhập giá' }]}>
            <InputNumber<number>
              min={0}
              step={1000}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number(v?.replace(/\./g, '') ?? 0)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default ProductList
