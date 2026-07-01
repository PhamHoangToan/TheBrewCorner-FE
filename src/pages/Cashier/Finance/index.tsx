import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import AppLayout from '../../../components/common/AppLayout'
import PageHeader from '../../../components/common/PageHeader'
import { useAuth } from '../../../hooks/useAuth'
import { financeService } from '../../../services/finance.service'
import styles from './finance.module.css'

type FinanceType = 'Thu' | 'Chi'

interface FinanceRow {
  key: string
  maphieu: string
  loai: FinanceType
  noidung: string
  sotien: string
  nguoilap: string
  ngaylap: string
}

const MOCK_DATA: FinanceRow[] = [
  { key: '1', maphieu: 'PT001', loai: 'Thu', noidung: 'Thu tiền bán hàng ca sáng', sotien: '2.450.000', nguoilap: 'Nguyễn Thị Tú Trinh', ngaylap: '01/11/2021' },
  { key: '2', maphieu: 'PC001', loai: 'Chi', noidung: 'Chi mua nguyên liệu cà phê', sotien: '500.000', nguoilap: 'Lê Văn Tú', ngaylap: '01/11/2021' },
  { key: '3', maphieu: 'PT002', loai: 'Thu', noidung: 'Thu tiền bán hàng ca chiều', sotien: '1.980.000', nguoilap: 'Nguyễn Thị Tú Trinh', ngaylap: '02/11/2021' },
  { key: '4', maphieu: 'PC002', loai: 'Chi', noidung: 'Chi lương nhân viên', sotien: '8.000.000', nguoilap: 'Võ Thị Thùy Hoa', ngaylap: '05/11/2021' },
  { key: '5', maphieu: 'PT003', loai: 'Thu', noidung: 'Thu tiền bán hàng ca sáng', sotien: '3.120.000', nguoilap: 'Nguyễn Thị Tú Trinh', ngaylap: '03/11/2021' },
]

const mapItem = (item: any, idx: number): FinanceRow => ({
  key: item.id ?? String(idx),
  maphieu: item.code ?? `PT${String(idx + 1).padStart(3, '0')}`,
  loai: (item.type === 'RECEIPT' || item.loai === 'Thu') ? 'Thu' : 'Chi',
  noidung: item.content ?? item.noidung ?? '',
  sotien: Number(item.amount ?? 0).toLocaleString('vi-VN'),
  nguoilap: item.createdBy?.name ?? item.nguoilap ?? '',
  ngaylap: item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY') : (item.ngaylap ?? ''),
})

const columns: ColumnsType<FinanceRow> = [
  { title: 'Mã phiếu', dataIndex: 'maphieu', key: 'maphieu' },
  {
    title: 'Loại',
    dataIndex: 'loai',
    key: 'loai',
    render: (v: FinanceType) => <Tag color={v === 'Thu' ? 'green' : 'red'}>{v}</Tag>,
  },
  { title: 'Nội dung', dataIndex: 'noidung', key: 'noidung' },
  { title: 'Số tiền (VND)', dataIndex: 'sotien', key: 'sotien', align: 'right' },
  { title: 'Người lập', dataIndex: 'nguoilap', key: 'nguoilap' },
  { title: 'Ngày lập', dataIndex: 'ngaylap', key: 'ngaylap', align: 'center' },
]

const CashierFinance: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<FinanceRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await financeService.list()
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
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Thu chi" breadcrumbs={[{ label: 'Thu ngân' }, { label: 'Thu chi' }]} />

      <div className={styles.toolbar}>
        <Button className={styles.btnReceipt} onClick={() => navigate('/cashier/finance/add-receipt')}>
          Thêm phiếu thu
        </Button>
        <Button className={styles.btnExpense} onClick={() => navigate('/cashier/finance/add-expense')}>
          Thêm phiếu chi
        </Button>
      </div>

      <div className={styles.tableWrap}>
        <Table columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 10 }} />
      </div>
    </AppLayout>
  )
}

export default CashierFinance
