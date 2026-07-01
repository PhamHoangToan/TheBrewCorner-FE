import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { ingredientService } from '../../../services/ingredient.service'
import styles from './stockStats.module.css'

const { RangePicker } = DatePicker

interface StockStatRow {
  key: string
  code: string
  tennvl: string
  imported: number
  exported: number
  stock: number
  minQuantity: number
  donvitinh: string
}

const columns: ColumnsType<StockStatRow> = [
  { title: 'Mã NVL', dataIndex: 'code', key: 'code', width: 100 },
  { title: 'Tên NVL', dataIndex: 'tennvl', key: 'tennvl' },
  { title: 'Nhập kỳ', dataIndex: 'imported', key: 'imported', align: 'center' },
  { title: 'Xuất kỳ', dataIndex: 'exported', key: 'exported', align: 'center' },
  { title: 'Tồn kho', dataIndex: 'stock', key: 'stock', align: 'center' },
  { title: 'Tối thiểu', dataIndex: 'minQuantity', key: 'minQuantity', align: 'center' },
  { title: 'Đơn vị', dataIndex: 'donvitinh', key: 'donvitinh', align: 'center' },
]

const BaristaStockStats: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<StockStatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [, setDateRange] = useState<unknown>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ingredientService.stockStats()
      const items: any[] = res.data ?? []
      setData(
        items.map((item) => ({
          key: item.ingredientId ?? item.id ?? item.code,
          code: item.code ?? '',
          tennvl: item.name ?? '',
          imported: Number(item.imported ?? 0),
          exported: Number(item.exported ?? 0),
          stock: Number(item.stock ?? item.stockQuantity ?? 0),
          minQuantity: Number(item.minQuantity ?? 0),
          donvitinh: item.unit ?? '',
        })),
      )
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const totalNhap = data.reduce((s, r) => s + r.imported, 0)
  const totalXuat = data.reduce((s, r) => s + r.exported, 0)
  const totalTon = data.reduce((s, r) => s + r.stock, 0)

  return (
    <AppLayout role={user?.role ?? 'barista'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Kỳ báo cáo:</span>
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} />
        <Button className={styles.btnFilter} onClick={fetchStats} loading={loading}>Xem báo cáo</Button>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tổng nhập kỳ</div>
          <div className={styles.statValue}>{totalNhap.toFixed(2)} đơn vị</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tổng xuất kỳ</div>
          <div className={styles.statValue}>{totalXuat.toFixed(2)} đơn vị</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tồn cuối kỳ</div>
          <div className={styles.statValue}>{totalTon.toFixed(2)} đơn vị</div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <Table columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 20 }} size="small" />
      </div>
    </AppLayout>
  )
}

export default BaristaStockStats
