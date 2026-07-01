import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, InputNumber, message, Modal, Select, Table } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { productService, type RecipeItemInput } from '../../../services/product.service'
import { ingredientService } from '../../../services/ingredient.service'
import styles from './recipe.module.css'

interface Product {
  id: string
  code: string
  name: string
  categoryName: string
  recipeCount: number
}

interface IngredientOption {
  value: string
  label: string
  unit: string
}

interface RecipeRow {
  key: string
  ingredientId: string
  quantity: number
  wastePercent: number
  unit: string
}

const BaristaRecipe: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([])
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productService.list({ limit: 200 })
      const items: any[] = res.data?.items ?? []
      const mapped: Product[] = items.map((p) => ({
        id: p.id,
        code: p.code ?? '',
        name: p.name ?? '',
        categoryName: p.category?.name ?? '',
        recipeCount: (p.recipes ?? []).length,
      }))
      setProducts(mapped)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await ingredientService.list({ limit: 500 })
      const items: any[] = res.data?.items ?? []
      setIngredientOptions(
        items.map((i) => ({ value: i.id, label: i.name, unit: i.unit ?? '' })),
      )
    } catch {}
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchIngredients()
  }, [fetchProducts, fetchIngredients])

  const openModal = async (product: Product) => {
    setActiveProduct(product)
    try {
      const res = await productService.getRecipes(product.id)
      const rows: RecipeRow[] = (res.data ?? []).map((r) => ({
        key: r.ingredientId,
        ingredientId: r.ingredientId,
        quantity: Number(r.quantity),
        wastePercent: Number(r.wastePercent ?? 0),
        unit: r.unit,
      }))
      setRecipeRows(rows)
    } catch {
      setRecipeRows([])
    }
    setModalOpen(true)
  }

  const addRow = () => {
    setRecipeRows((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, ingredientId: '', quantity: 0, wastePercent: 0, unit: '' },
    ])
  }

  const updateRow = (key: string, field: keyof RecipeRow, value: any) => {
    setRecipeRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        const updated = { ...r, [field]: value }
        if (field === 'ingredientId') {
          const opt = ingredientOptions.find((o) => o.value === value)
          updated.unit = opt?.unit ?? updated.unit
        }
        return updated
      }),
    )
  }

  const removeRow = (key: string) => {
    setRecipeRows((prev) => prev.filter((r) => r.key !== key))
  }

  const handleSave = async () => {
    if (!activeProduct) return
    const invalid = recipeRows.some((r) => !r.ingredientId || r.quantity <= 0)
    if (invalid) {
      message.warning('Vui lòng điền đủ nguyên liệu và liều lượng')
      return
    }
    setSaving(true)
    try {
      const items: RecipeItemInput[] = recipeRows.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
        wastePercent: r.wastePercent ?? 0,
        unit: r.unit,
      }))
      await productService.setRecipes(activeProduct.id, items)
      message.success('Đã lưu công thức')
      setModalOpen(false)
      setProducts((prev) =>
        prev.map((p) => (p.id === activeProduct.id ? { ...p, recipeCount: items.length } : p)),
      )
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: ColumnsType<Product> = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
    { title: 'Tên món', dataIndex: 'name', key: 'name' },
    { title: 'Nhóm', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
    {
      title: 'Công thức',
      key: 'recipe',
      width: 160,
      render: (_, record) => (
        <span
          className={`${styles.recipeTag} ${record.recipeCount > 0 ? styles.recipeTagHas : ''}`}
          onClick={() => openModal(record)}
        >
          {record.recipeCount > 0 ? `${record.recipeCount} NVL` : 'Chưa có'}
          <EditOutlined />
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
          Chỉnh
        </Button>
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.topNav}>
        <button type="button" className={`${styles.navTab} ${styles.navTabInactive}`} onClick={() => navigate('/barista')}>
          DS món chế biến
        </button>
        <button type="button" className={`${styles.navTab} ${styles.navTabInactive}`} onClick={() => navigate('/barista/inventory')}>
          Quản lý Kho
        </button>
        <button type="button" className={styles.navTab}>
          Công thức
        </button>
      </div>

      <div className={styles.toolbar}>
        <Input.Search
          placeholder="Tìm theo tên hoặc mã món..."
          allowClear
          style={{ width: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrap}>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="small"
        />
      </div>

      <Modal
        title={`Công thức — ${activeProduct?.name ?? ''}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        {recipeRows.map((row) => (
          <div key={row.key} className={styles.recipeRow}>
            <Select
              className={styles.recipeIngredientSelect}
              placeholder="Chọn nguyên liệu"
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={ingredientOptions}
              value={row.ingredientId || undefined}
              onChange={(val) => updateRow(row.key, 'ingredientId', val)}
            />
            <InputNumber
              className={styles.recipeQtyInput}
              placeholder="Liều lượng"
              min={0}
              step={0.01}
              value={row.quantity}
              onChange={(val) => updateRow(row.key, 'quantity', val ?? 0)}
            />
            <Input
              className={styles.recipeUnitInput}
              placeholder="Đơn vị"
              value={row.unit}
              onChange={(e) => updateRow(row.key, 'unit', e.target.value)}
            />
            <InputNumber
              className={styles.recipeWasteInput}
              placeholder="Hao hụt %"
              min={0}
              max={100}
              step={0.5}
              value={row.wastePercent}
              addonAfter="%"
              onChange={(val) => updateRow(row.key, 'wastePercent', val ?? 0)}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeRow(row.key)}
            />
          </div>
        ))}

        <Button
          className={styles.addRowBtn}
          icon={<PlusOutlined />}
          onClick={addRow}
          style={{ marginBottom: 16 }}
        >
          Thêm nguyên liệu
        </Button>

        <div className={styles.modalFooter}>
          <Button onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button className={styles.saveBtn} loading={saving} onClick={handleSave}>
            Lưu công thức
          </Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

export default BaristaRecipe
