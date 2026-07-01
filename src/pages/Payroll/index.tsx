import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DatePicker, message, Popconfirm, Table, Tag } from 'antd'
import { CalculatorOutlined, CheckOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { payrollService, type PayrollSummary } from '../../services/payroll.service'
import styles from './payroll.module.css'

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', APPROVED: 'Đã duyệt', PAID: 'Đã trả' }
const STATUS_COLOR: Record<string, string> = { DRAFT: 'orange', APPROVED: 'green', PAID: 'blue' }
const EMP_LABEL: Record<string, string> = { FULL_TIME: 'Toàn thời gian', PART_TIME: 'Bán thời gian' }
const fmt = (n: number) => n.toLocaleString('vi-VN')

const PayrollListPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState(dayjs().subtract(1, 'month'))
  const [data, setData] = useState<PayrollSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await payrollService.list({ year: String(period.year()), month: String(period.month() + 1), limit: 200 })
      setData(res.data?.items ?? [])
    } catch { setData([]) } finally { setLoading(false) }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      await payrollService.calculate({ year: period.year(), month: period.month() + 1 })
      message.success('Đã tính lương xong')
      fetchData()
    } catch { message.error('Tính lương thất bại') } finally { setCalculating(false) }
  }

  const handleApprove = async (id: string) => {
    try {
      await payrollService.approve(id)
      message.success('Đã duyệt')
      fetchData()
    } catch { message.error('Thất bại') }
  }

  const totalNet = data.reduce((s, r) => s + Number(r.totalAmount), 0)
  const detailPath = (userId: string) => `/payroll/${userId}?year=${period.year()}&month=${period.month() + 1}`

  const columns: ColumnsType<PayrollSummary> = [
    { title: 'Mã NV', render: (_, r) => r.user?.code ?? '—', width: 80 },
    { title: 'Tên nhân viên', render: (_, r) => r.user?.name ?? '—' },
    { title: 'Loại', render: (_, r) => EMP_LABEL[r.employmentType] ?? r.employmentType, width: 140 },
    { title: 'Ngày công', render: (_, r) => `${r.workedDays + r.paidLeaveDays}/${r.scheduledDays}`, align: 'center', width: 90 },
    { title: 'Giờ làm', render: (_, r) => `${Number(r.totalHours).toFixed(1)}h`, align: 'center', width: 80 },
    { title: 'OT (h)', render: (_, r) => Number(r.otHours).toFixed(1), align: 'center', width: 70 },
    { title: 'Tiền OT', render: (_, r) => fmt(Number(r.otAmount)) + 'đ', align: 'right', width: 100 },
    { title: 'Phạt', render: (_, r) => <span style={{ color: Number(r.penaltyAmount) > 0 ? '#cf1322' : undefined }}>{fmt(Number(r.penaltyAmount))}đ</span>, align: 'right', width: 90 },
    { title: 'Tổng lương', render: (_, r) => <b>{fmt(Number(r.totalAmount))}đ</b>, align: 'right', width: 120 },
    { title: 'Trạng thái', render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Tag>, width: 100 },
    {
      title: '',
      width: 100,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" onClick={() => navigate(detailPath(r.userId))}>Chi tiết</Button>
          {r.status === 'DRAFT' && (
            <Popconfirm title="Duyệt lương này?" onConfirm={() => handleApprove(r.id)}>
              <Button size="small" icon={<CheckOutlined />} style={{ color: '#389e0d' }} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Bảng lương" />

      <div className={styles.toolbar}>
        <DatePicker.MonthPicker value={period} onChange={(v) => v && setPeriod(v)} format="MM/YYYY" />
        <Button onClick={fetchData}>Xem</Button>
        <Button icon={<CalculatorOutlined />} loading={calculating} onClick={handleCalculate} style={{ background: '#662c21', color: '#fff', border: 'none' }}>
          Tính lương tháng {period.format('MM/YYYY')}
        </Button>
        <div style={{ marginLeft: 'auto', fontWeight: 700 }}>Tổng chi lương: {fmt(totalNet)}đ</div>
      </div>

      <div className={styles.tableWrap}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="small"
          onRow={(r) => ({ style: { cursor: 'pointer' }, onDoubleClick: () => navigate(detailPath(r.userId)) })} />
      </div>
    </AppLayout>
  )
}

export default PayrollListPage
