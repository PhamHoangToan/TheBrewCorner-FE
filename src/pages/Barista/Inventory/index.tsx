import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { ingredientService } from '../../../services/ingredient.service'
import styles from './inventory.module.css'

type StockStatus = 'Đủ hàng' | 'Sắp hết' | 'Hết hàng'

interface IngredientRow {
  key: string
  manvl: string
  tennvl: string
  donvitinh: string
  tonkho: number
  canhbao: number
  trangthai: StockStatus
}

const MOCK_DATA: IngredientRow[] = [
  { key: '1', manvl: 'NVL001', tennvl: 'Cà phê Arabica', donvitinh: 'kg', tonkho: 15, canhbao: 5, trangthai: 'Đủ hàng' },
  { key: '2', manvl: 'NVL002', tennvl: 'Sữa tươi', donvitinh: 'lít', tonkho: 8, canhbao: 10, trangthai: 'Sắp hết' },
  { key: '3', manvl: 'NVL003', tennvl: 'Đường cát trắng', donvitinh: 'kg', tonkho: 20, canhbao: 5, trangthai: 'Đủ hàng' },
  { key: '4', manvl: 'NVL004', tennvl: 'Trà xanh bột', donvitinh: 'kg', tonkho: 0, canhbao: 2, trangthai: 'Hết hàng' },
  { key: '5', manvl: 'NVL005', tennvl: 'Kem tươi', donvitinh: 'lít', tonkho: 3, canhbao: 5, trangthai: 'Sắp hết' },
  { key: '6', manvl: 'NVL006', tennvl: 'Ly giấy M', donvitinh: 'cái', tonkho: 200, canhbao: 50, trangthai: 'Đủ hàng' },
]

const STATUS_COLOR: Record<StockStatus, string> = {
  'Đủ hàng': 'green',
  'Sắp hết': 'orange',
  'Hết hàng': 'red',
}

const getStatus = (tonkho: number, canhbao: number): StockStatus => {
  if (tonkho === 0) return 'Hết hàng'
  if (tonkho <= canhbao) return 'Sắp hết'
  return 'Đủ hàng'
}

const mapItem = (item: any, idx: number): IngredientRow => {
  const tonkho = Number(item.stockQuantity ?? item.stockQty ?? item.tonkho ?? 0)
  const canhbao = Number(item.minQuantity ?? item.minStock ?? item.canhbao ?? 0)
  return {
    key: item.id ?? String(idx),
    manvl: item.code ?? item.manvl ?? `NVL${String(idx + 1).padStart(3, '0')}`,
    tennvl: item.name ?? item.tennvl ?? '',
    donvitinh: item.unit ?? item.donvitinh ?? '',
    tonkho,
    canhbao,
    trangthai: getStatus(tonkho, canhbao),
  }
}

const columns: ColumnsType<IngredientRow> = [
  { title: 'Mã NVL', dataIndex: 'manvl', key: 'manvl' },
  { title: 'Tên nguyên vật liệu', dataIndex: 'tennvl', key: 'tennvl' },
  { title: 'Đơn vị tính', dataIndex: 'donvitinh', key: 'donvitinh', align: 'center' },
  { title: 'Tồn kho', dataIndex: 'tonkho', key: 'tonkho', align: 'center' },
  { title: 'Cảnh báo tối thiểu', dataIndex: 'canhbao', key: 'canhbao', align: 'center' },
  {
    title: 'Trạng thái',
    dataIndex: 'trangthai',
    key: 'trangthai',
    render: (v: StockStatus) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
  },
]

const BaristaInventory: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<IngredientRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ingredientService.list({ limit: 200 })
      const items: any[] = res.data?.items ?? res.data ?? []
      setData(items.length ? items.map(mapItem) : MOCK_DATA)
    } catch {
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.topNav}>
        <button
          type="button"
          className={`${styles.navTab} ${styles.navTabInactive}`}
          onClick={() => navigate('/barista')}
        >
          DS món chế biến
        </button>
        <button type="button" className={styles.navTab}>
          Quản lý Kho
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${styles.navTabInactive}`}
          onClick={() => navigate('/barista/recipes')}
        >
          Công thức
        </button>
      </div>

      <div className={styles.toolbar}>
        <Button className={styles.btnPrimary} onClick={() => navigate('/barista/import')}>Nhập kho</Button>
        <Button className={styles.btnPrimary} onClick={() => navigate('/barista/export')}>Xuất kho</Button>
        <Button className={styles.btnPrimary} onClick={() => navigate('/barista/stats')}>Thống kê</Button>
      </div>

      <div className={styles.tableWrap}>
        <Table columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 10 }} />
      </div>
    </AppLayout>
  )
}

export default BaristaInventory
