import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DatePicker, Form, Input, InputNumber, Select } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { ingredientService } from '../../../services/ingredient.service'
import styles from './exportStock.module.css'

interface ItemRow {
  id: number
  ingredientId: string
  tennvl: string
  soluong: number | null
  donvi: string
}

let _nextId = 1

const BaristaExportStock: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [items, setItems] = useState<ItemRow[]>([
    { id: _nextId++, ingredientId: '', tennvl: '', soluong: null, donvi: '' },
  ])
  const [ingredientOptions, setIngredientOptions] = useState<{ value: string; label: string; unit: string }[]>([])

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await ingredientService.list({ limit: 200 })
      const list: any[] = res.data?.items ?? res.data ?? []
      setIngredientOptions(list.map((i) => ({ value: i.id, label: i.name ?? i.ten, unit: i.unit ?? '' })))
    } catch { /* giữ trống */ }
  }, [])

  useEffect(() => { fetchIngredients() }, [fetchIngredients])

  const addRow = () => setItems((prev) => [...prev, { id: _nextId++, ingredientId: '', tennvl: '', soluong: null, donvi: '' }])

  const removeRow = (id: number) => setItems((prev) => prev.filter((r) => r.id !== id))

  const selectIngredient = (rowId: number, ingredientId: string) => {
    const opt = ingredientOptions.find((o) => o.value === ingredientId)
    setItems((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, ingredientId, tennvl: opt?.label ?? '', donvi: opt?.unit ?? '' } : r,
    ))
  }

  const updateSoluong = (rowId: number, v: number | null) => {
    setItems((prev) => prev.map((r) => r.id === rowId ? { ...r, soluong: v } : r))
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      console.log('Xuất kho:', values, items)
      navigate('/barista/inventory')
    })
  }

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.pageWrap}>
        <div className={styles.formCard}>
          <div className={styles.cardTitle}>Phiếu Xuất Kho</div>

          <Form form={form} layout="vertical" initialValues={{ maphieuxuat: 'PXK-0001' }}>
            <Form.Item label="Mã phiếu xuất" name="maphieuxuat">
              <Input disabled />
            </Form.Item>
            <Form.Item label="Ngày xuất" name="ngayxuat" rules={[{ required: true, message: 'Chọn ngày xuất' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item label="Lý do xuất" name="lydo" rules={[{ required: true, message: 'Chọn lý do xuất' }]}>
              <Select
                placeholder="Chọn lý do xuất"
                options={[
                  { value: 'SALES',   label: 'Bán hàng' },
                  { value: 'DAMAGED', label: 'Hủy NVL' },
                  { value: 'EXPIRED', label: 'Hết hạn' },
                  { value: 'OTHER',   label: 'Khác' },
                ]}
              />
            </Form.Item>
          </Form>

          <div className={styles.sectionLabel}>Danh sách nguyên vật liệu xuất</div>

          <div className={styles.tableScroll}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Tên NVL</th>
                <th>Số lượng</th>
                <th>Đơn vị</th>
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
                      onChange={(v) => updateSoluong(row.id, v)}
                    />
                  </td>
                  <td>
                    <Input value={row.donvi} readOnly placeholder="—" />
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

          <Form form={form} layout="vertical">
            <Form.Item label="Ghi chú" name="ghichu">
              <Input.TextArea rows={3} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>

          <div className={styles.actions}>
            <Button className={styles.btnCancel} onClick={() => navigate(-1)}>Hủy</Button>
            <Button className={styles.btnSubmit} onClick={handleSubmit}>Lưu phiếu xuất</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default BaristaExportStock
