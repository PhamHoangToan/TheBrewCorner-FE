import React from 'react'
import { DatePicker, Table, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import styles from './reports.module.css'

const { RangePicker } = DatePicker

interface RevenueRow {
  key: string
  ngay: string
  doanhthu: string
  sodon: number
  trungbinh: string
}

interface SalesRow {
  key: string
  tenmon: string
  soluongban: number
  doanhthu: string
  phantram: string
}

const MOCK_REVENUE: RevenueRow[] = [
  { key: '1', ngay: '01/11/2021', doanhthu: '2.450.000', sodon: 28, trungbinh: '87.500' },
  { key: '2', ngay: '02/11/2021', doanhthu: '1.980.000', sodon: 22, trungbinh: '90.000' },
  { key: '3', ngay: '03/11/2021', doanhthu: '3.120.000', sodon: 35, trungbinh: '89.143' },
  { key: '4', ngay: '04/11/2021', doanhthu: '2.750.000', sodon: 30, trungbinh: '91.667' },
  { key: '5', ngay: '05/11/2021', doanhthu: '1.540.000', sodon: 18, trungbinh: '85.556' },
]

const MOCK_SALES: SalesRow[] = [
  { key: '1', tenmon: 'Cappuccino', soluongban: 48, doanhthu: '3.120.000', phantram: '18.2%' },
  { key: '2', tenmon: 'Cafe Latte', soluongban: 42, doanhthu: '2.730.000', phantram: '15.9%' },
  { key: '3', tenmon: 'Trà Thạch Đào', soluongban: 38, doanhthu: '1.482.000', phantram: '8.6%' },
  { key: '4', tenmon: 'Black Coffee', soluongban: 55, doanhthu: '1.375.000', phantram: '8.0%' },
  { key: '5', tenmon: 'Tiramisu', soluongban: 30, doanhthu: '900.000', phantram: '5.2%' },
  { key: '6', tenmon: 'Espresso', soluongban: 25, doanhthu: '975.000', phantram: '5.7%' },
]

const revenueColumns: ColumnsType<RevenueRow> = [
  { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
  { title: 'Doanh thu (VND)', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right' },
  { title: 'Số đơn', dataIndex: 'sodon', key: 'sodon', align: 'center' },
  { title: 'Trung bình/đơn (VND)', dataIndex: 'trungbinh', key: 'trungbinh', align: 'right' },
]

const salesColumns: ColumnsType<SalesRow> = [
  { title: 'Tên món', dataIndex: 'tenmon', key: 'tenmon' },
  { title: 'Số lượng bán', dataIndex: 'soluongban', key: 'soluongban', align: 'center' },
  { title: 'Doanh thu (VND)', dataIndex: 'doanhthu', key: 'doanhthu', align: 'right' },
  { title: '% Tổng', dataIndex: 'phantram', key: 'phantram', align: 'center' },
]

const Reports: React.FC = () => {
  const { user, handleLogout } = useAuth()

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Báo cáo" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Báo cáo' }]} />

      <Tabs
        className={styles.tabs}
        items={[
          {
            key: 'doanhthu',
            label: 'Báo cáo doanh thu',
            children: (
              <>
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']} />
                </div>
                <div className={styles.tableWrap}>
                  <Table columns={revenueColumns} dataSource={MOCK_REVENUE} pagination={false} />
                </div>
              </>
            ),
          },
          {
            key: 'banhang',
            label: 'Báo cáo bán hàng',
            children: (
              <>
                <div className={styles.filterRow}>
                  <RangePicker format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']} />
                </div>
                <div className={styles.tableWrap}>
                  <Table columns={salesColumns} dataSource={MOCK_SALES} pagination={false} />
                </div>
              </>
            ),
          },
        ]}
      />
    </AppLayout>
  )
}

export default Reports
