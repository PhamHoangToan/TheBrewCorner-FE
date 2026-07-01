import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DatePicker, Form, Input, InputNumber, message, Select } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { ingredientService } from '../../../services/ingredient.service'
import styles from './importStock.module.css'

interface ItemRow {
  id: number
  ingredientId: string
  tennvl: string
  soluong: number | null
  donvi: string
  dongia: number | null
}

interface ImportForm {
  maphieunhap: string
  ngaynhap: unknown
  nhacungcap: string
  ghichu: string
}

let _nextId = 1

const BaristaImportStock: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm<ImportForm>()
  const [items, setItems] = useState<ItemRow[]>([
    { id: _nextId++, ingredientId: '', tennvl: '', soluong: null, donvi: '', dongia: null },
  ])
  const [ingredientOptions, setIngredientOptions] = useState<{ value: string; label: string; unit: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [importCode] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `PNK-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  })

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await ingredientService.list({ limit: 200 })
      const list: any[] = res.data?.items ?? res.data ?? []
      setIngredientOptions(list.map((i) => ({ value: i.id, label: i.name ?? i.ten, unit: i.unit ?? '' })))
    } catch { /* giữ trống */ }
  }, [])

  useEffect(() => { fetchIngredients() }, [fetchIngredients])

  const addRow = () => setItems((prev) => [...prev, { id: _nextId++, ingredientId: '', tennvl: '', soluong: null, donvi: '', dongia: null }])

  const removeRow = (id: number) => setItems((prev) => prev.filter((r) => r.id !== id))

  const updateRow = <K extends keyof ItemRow>(id: number, field: K, value: ItemRow[K]) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const selectIngredient = (rowId: number, ingredientId: string) => {
    const opt = ingredientOptions.find((o) => o.value === ingredientId)
    setItems((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, ingredientId, tennvl: opt?.label ?? '', donvi: opt?.unit ?? '' } : r,
    ))
  }

  const total = items.reduce((sum, r) => sum + (r.soluong ?? 0) * (r.dongia ?? 0), 0)

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const validItems = items.filter((r) => r.ingredientId && (r.soluong ?? 0) > 0)
      if (validItems.length === 0) {
        message.warning('Vui lòng thêm ít nhất 1 nguyên vật liệu hợp lệ')
        return
      }
      setSubmitting(true)
      try {
        await ingredientService.createStockImport({
          maphieunhap: values.maphieunhap,
          ngaynhap: values.ngaynhap,
          nhacungcap: values.nhacungcap,
          ghichu: values.ghichu,
          createdById: user?.id,
          items: validItems.map((r) => ({
            ingredientId: r.ingredientId,
            ingredientName: r.tennvl,
            quantity: r.soluong,
            unit: r.donvi,
            unitPrice: r.dongia ?? 0,
          })),
        })
        message.success('Lưu phiếu nhập thành công')
        navigate('/barista/inventory')
      } catch {
        message.error('Lưu phiếu nhập thất bại')
      } finally {
        setSubmitting(false)
      }
    })
  }

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.pageWrap}>
        <div className={styles.formCard}>
          <div className={styles.cardTitle}>Phiếu Nhập Kho</div>

          <Form form={form} layout="vertical" initialValues={{ maphieunhap: importCode }}>
            <Form.Item label="Mã phiếu nhập" name="maphieunhap">
              <Input disabled />
            </Form.Item>
            <Form.Item label="Ngày nhập" name="ngaynhap" rules={[{ required: true, message: 'Chọn ngày nhập' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item label="Nhà cung cấp" name="nhacungcap" rules={[{ required: true, message: 'Nhập tên nhà cung cấp' }]}>
              <Input placeholder="Tên nhà cung cấp" />
            </Form.Item>
          </Form>

          <div className={styles.sectionLabel}>Danh sách nguyên vật liệu</div>

          <div className={styles.tableScroll}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Tên NVL</th>
                <th>Số lượng</th>
                <th>Đơn vị</th>
                <th>Đơn giá</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Select
                      value={row.ingredientId || undefined}
                      options={ingredientOptions}
                      placeholder="Chọn NVL..."
                      showSearch
                      filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      style={{ width: '100%' }}
                      onChange={(v) => selectIngredient(row.id, v)}
                    />
                  </td>
                  <td>
                    <InputNumber
                      value={row.soluong}
                      min={0}
                      style={{ width: '100%' }}
                      onChange={(v) => updateRow(row.id, 'soluong', v)}
                    />
                  </td>
                  <td>
                    <Input
                      value={row.donvi}
                      placeholder="kg / lít / cái"
                      onChange={(e) => updateRow(row.id, 'donvi', e.target.value)}
                    />
                  </td>
                  <td>
                    <InputNumber
                      value={row.dongia}
                      min={0}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      style={{ width: '100%' }}
                      onChange={(v) => updateRow(row.id, 'dongia', v)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeRow(row.id)}
                      disabled={items.length === 1}
                    >
                      <DeleteOutlined />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <Button icon={<PlusOutlined />} className={styles.addRowBtn} onClick={addRow}>
            Thêm nguyên vật liệu
          </Button>

          <div className={styles.totalRow}>
            <span>Tổng tiền:</span>
            <span>{total.toLocaleString('vi-VN')} đ</span>
          </div>

          <Form form={form} layout="vertical">
            <Form.Item label="Ghi chú" name="ghichu">
              <Input.TextArea rows={3} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>

          <div className={styles.actions}>
            <Button className={styles.btnCancel} onClick={() => navigate(-1)}>Hủy</Button>
            <Button className={styles.btnSubmit} onClick={handleSubmit} loading={submitting}>Lưu phiếu nhập</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default BaristaImportStock
