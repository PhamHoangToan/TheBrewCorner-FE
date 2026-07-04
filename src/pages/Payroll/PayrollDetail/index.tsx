import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, message, Popconfirm, Table, Tag } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import { payrollService, type PayrollDay, type PayrollDetail, type PayrollHistoryItem } from '../../../services/payroll.service'
import styles from '../payroll.module.css'

const DAY_TYPE_LABEL: Record<string, string> = { WORK: 'Đi làm', PAID_LEAVE: 'Nghỉ phép', ABSENT: 'Vắng', REST: 'Nghỉ' }
const DAY_TYPE_COLOR: Record<string, string> = { WORK: 'green', PAID_LEAVE: 'blue', ABSENT: 'red', REST: 'default' }
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', APPROVED: 'Đã duyệt', PAID: 'Đã trả lương' }
const STATUS_COLOR: Record<string, string> = { DRAFT: 'orange', APPROVED: 'green', PAID: 'blue' }
const EMP_LABEL: Record<string, string> = { FULL_TIME: 'Toàn thời gian', PART_TIME: 'Bán thời gian' }
const fmt = (n: number) => n.toLocaleString('vi-VN')

const PayrollDetailPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const initialYear = Number(searchParams.get('year'))
  const initialMonth = Number(searchParams.get('month'))
  const initialPeriod = initialYear > 0 && initialMonth >= 1 && initialMonth <= 12
    ? dayjs().year(initialYear).month(initialMonth - 1)
    : dayjs().subtract(1, 'month')
  const [period, setPeriod] = useState(initialPeriod)
  const [detail, setDetail] = useState<PayrollDetail | null>(null)
  const [history, setHistory] = useState<PayrollHistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    try {
      const res = await payrollService.historyByUser(userId)
      setHistory(res.data ?? [])
    } catch {}
  }, [userId])

  const fetchDetail = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await payrollService.getByUserMonth(userId, period.year(), period.month() + 1)
      setDetail(res.data ?? null)
    } catch { setDetail(null) } finally { setLoading(false) }
  }, [userId, period])

  useEffect(() => { fetchHistory() }, [fetchHistory])
  useEffect(() => { fetchDetail() }, [fetchDetail])

  const prevPeriod = () => setPeriod((p) => p.subtract(1, 'month'))
  const nextPeriod = () => setPeriod((p) => p.add(1, 'month'))

  const handleApprove = async () => {
    if (!detail) return
    try {
      await payrollService.approve(detail.id)
      message.success('Đã duyệt lương')
      fetchDetail()
    } catch { message.error('Thất bại') }
  }

  const handleMarkPaid = async () => {
    if (!detail) return
    try {
      await payrollService.markPaid(detail.id)
      message.success('Đã đánh dấu đã trả lương')
      fetchDetail()
    } catch { message.error('Thất bại') }
  }

  const dayColumns: ColumnsType<PayrollDay> = [
    { title: 'Ngày', dataIndex: 'workDate', key: 'workDate', render: (v) => dayjs(v).format('DD/MM'), width: 70 },
    { title: 'Ca', key: 'shift', width: 120, render: (_, r) => r.scheduledIn ? `${r.scheduledIn}–${r.scheduledOut}` : '—' },
    { title: 'Check-in', dataIndex: 'actualIn', key: 'actualIn', width: 80, render: (v) => v ? dayjs(v).format('HH:mm') : '—' },
    { title: 'Check-out', dataIndex: 'actualOut', key: 'actualOut', width: 80, render: (v) => v ? dayjs(v).format('HH:mm') : '—' },
    {
      title: 'Loại',
      dataIndex: 'dayType',
      key: 'dayType',
      width: 90,
      render: (v: string) => <Tag color={DAY_TYPE_COLOR[v] ?? 'default'}>{DAY_TYPE_LABEL[v] ?? v}</Tag>,
    },
    { title: 'Đi trễ', dataIndex: 'lateMinutes', key: 'lateMinutes', width: 70, align: 'center', render: (v) => v > 0 ? <span style={{ color: '#d48806' }}>{v}p</span> : '—' },
    { title: 'Về sớm', dataIndex: 'earlyMinutes', key: 'earlyMinutes', width: 70, align: 'center', render: (v) => v > 0 ? <span style={{ color: '#c41d7f' }}>{v}p</span> : '—' },
    { title: 'OT', dataIndex: 'otMinutes', key: 'otMinutes', width: 70, align: 'center', render: (v) => v > 0 ? <span style={{ color: '#389e0d' }}>{(v / 60).toFixed(1)}h</span> : '—' },
    { title: 'Phạt', dataIndex: 'penaltyAmount', key: 'penaltyAmount', width: 80, align: 'right', render: (v) => Number(v) > 0 ? <span style={{ color: '#cf1322' }}>{fmt(Number(v))}đ</span> : '—' },
  ]

  const emp = detail?.user
  const isFullTime = detail?.employmentType === 'FULL_TIME'
  const absentDeduction = isFullTime && detail ? (Number(detail.baseSalary) / 26) * Number(detail.absentDays) : 0
  const salaryLabel = emp?.employmentType === 'FULL_TIME'
    ? `Lương tháng: ${fmt(Number(emp.baseSalary))}đ`
    : `Lương/giờ: ${fmt(Number(emp?.baseSalary))}đ`

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.detailHeader}>
        <Button className={styles.backBtn} type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/payroll')}>
          Danh sách
        </Button>
        <div>
          <div className={styles.empName}>{emp?.name ?? '...'}</div>
          <div className={styles.empMeta}>
            {emp?.code} · {EMP_LABEL[emp?.employmentType ?? ''] ?? emp?.employmentType} · {salaryLabel} · OT: {fmt(Number(emp?.otRatePerHour))}đ/h
          </div>
        </div>

        {/* Navigator tháng */}
        <div className={styles.periodNav}>
          <Button icon={<LeftOutlined />} size="small" onClick={prevPeriod} />
          <span className={styles.periodLabel}>{period.format('MM/YYYY')}</span>
          <Button icon={<RightOutlined />} size="small" onClick={nextPeriod} disabled={period.isSame(dayjs(), 'month')} />
        </div>

        {/* Nút lịch sử nhanh */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 300 }}>
          {history.slice(0, 6).map((h) => (
            <Tag
              key={h.id}
              color={period.year() === h.periodYear && period.month() + 1 === h.periodMonth ? 'volcano' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setPeriod(dayjs().year(h.periodYear).month(h.periodMonth - 1))}
            >
              {String(h.periodMonth).padStart(2, '0')}/{h.periodYear}
            </Tag>
          ))}
        </div>
      </div>

      {history.length > 1 && (
        <div className={styles.tableWrap} style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Xu hướng đi trễ / về sớm / OT theo tháng</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[...history]
                .sort((a, b) => (a.periodYear - b.periodYear) || (a.periodMonth - b.periodMonth))
                .slice(-6)
                .map((h) => ({
                  label: `${String(h.periodMonth).padStart(2, '0')}/${h.periodYear}`,
                  'Đi trễ (phút)': h.totalLateMinutes,
                  'Về sớm (phút)': h.totalEarlyMinutes,
                  'OT (phút)': h.totalOtMinutes,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Đi trễ (phút)" fill="#d48806" />
              <Bar dataKey="Về sớm (phút)" fill="#c41d7f" />
              <Bar dataKey="OT (phút)" fill="#389e0d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {detail ? (
        <>
          {/* Summary cards */}
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Ngày công</div>
              <div className={styles.cardValue}>{detail.workedDays + detail.paidLeaveDays}<span style={{ fontSize: 14, fontWeight: 400 }}>/{detail.scheduledDays}</span></div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Nghỉ phép</div>
              <div className={styles.cardValue}>{detail.paidLeaveDays}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Vắng không phép</div>
              <div className={styles.cardValue} style={{ color: detail.absentDays > 0 ? '#cf1322' : undefined }}>{detail.absentDays}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Giờ làm</div>
              <div className={styles.cardValue}>{Number(detail.totalHours).toFixed(1)}h</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>OT</div>
              <div className={styles.cardValue} style={{ color: '#389e0d' }}>{Number(detail.otHours).toFixed(1)}h</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Tiền OT</div>
              <div className={styles.cardValue} style={{ color: '#389e0d' }}>{fmt(Number(detail.otAmount))}đ</div>
            </div>
            {isFullTime && (
              <div className={styles.card}>
                <div className={styles.cardLabel}>Trừ nghỉ không phép</div>
                <div className={styles.cardValue} style={{ color: absentDeduction > 0 ? '#cf1322' : undefined }}>{fmt(Math.round(absentDeduction))}đ</div>
              </div>
            )}
            <div className={styles.card}>
              <div className={styles.cardLabel}>Tiền phạt</div>
              <div className={styles.cardValue} style={{ color: detail.penaltyAmount > 0 ? '#cf1322' : undefined }}>{fmt(Number(detail.penaltyAmount))}đ</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Tổng lương</div>
              <div className={styles.cardValue}>{fmt(Number(detail.totalAmount))}đ</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <Tag color={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Tag>
            {detail.status === 'DRAFT' && (
              <Popconfirm title="Duyệt bảng lương này?" onConfirm={handleApprove}>
                <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#662c21', border: 'none' }}>Duyệt lương</Button>
              </Popconfirm>
            )}
            {detail.status === 'APPROVED' && (
              <Popconfirm title="Đánh dấu đã trả lương?" onConfirm={handleMarkPaid}>
                <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#389e0d', border: 'none' }}>Đã trả lương</Button>
              </Popconfirm>
            )}
          </div>

          {/* Day breakdown table */}
          <div className={styles.tableWrap}>
            <Table columns={dayColumns} dataSource={detail.days} rowKey="id" loading={loading} pagination={false} size="small"
              rowClassName={(r) => r.dayType === 'ABSENT' ? 'ant-table-row-danger' : ''} />
          </div>
        </>
      ) : (
        !loading && (
          <div style={{ textAlign: 'center', color: '#888', padding: 60 }}>
            Chưa có bảng lương tháng {period.format('MM/YYYY')} cho nhân viên này
          </div>
        )
      )}
    </AppLayout>
  )
}

export default PayrollDetailPage
