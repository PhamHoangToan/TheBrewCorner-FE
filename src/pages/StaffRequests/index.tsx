import React, { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Select, Table, Tabs, Tag, Input, message } from 'antd'
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { leaveRequestService, type LeaveRequest } from '../../services/leaveRequest.service'
import { attendanceService, type AttendanceCorrectionRequest } from '../../services/attendance.service'
import styles from './staffRequests.module.css'

const STATUS_LABEL: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' }
const STATUS_COLOR: Record<string, string> = { PENDING: 'orange', APPROVED: 'green', REJECTED: 'red' }
const LEAVE_TYPE_LABEL: Record<string, string> = { ANNUAL: 'Phép năm', SICK: 'Ốm', UNPAID: 'Không lương' }
const fmtDate = (d: string) => dayjs(d).format('DD/MM/YYYY')
const fmtTime = (d: string | null) => (d ? dayjs(d).format('HH:mm') : '—')

const StaffRequestsPage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')

  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([])
  const [correctionsLoading, setCorrectionsLoading] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<{ kind: 'leave' | 'correction'; id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const fetchLeaves = useCallback(async () => {
    setLeavesLoading(true)
    try {
      const params = statusFilter === 'ALL' ? undefined : { status: statusFilter }
      const res = await leaveRequestService.list(params)
      setLeaves(res.data?.items ?? [])
    } catch {
      message.error('Không tải được danh sách đơn nghỉ phép')
    } finally {
      setLeavesLoading(false)
    }
  }, [statusFilter])

  const fetchCorrections = useCallback(async () => {
    setCorrectionsLoading(true)
    try {
      const params = statusFilter === 'ALL' ? undefined : { status: statusFilter }
      const res = await attendanceService.listCorrections(params)
      setCorrections(res.data?.items ?? [])
    } catch {
      message.error('Không tải được danh sách yêu cầu bổ sung chấm công')
    } finally {
      setCorrectionsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchLeaves(); fetchCorrections() }, [fetchLeaves, fetchCorrections])

  const handleApproveLeave = async (id: string) => {
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      await leaveRequestService.approve(id)
      message.success('Đã duyệt đơn nghỉ phép')
      fetchLeaves()
    } catch {
      message.error('Duyệt thất bại')
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }))
    }
  }

  const handleApproveCorrection = async (id: string) => {
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      await attendanceService.approveCorrection(id)
      message.success('Đã duyệt bổ sung chấm công')
      fetchCorrections()
    } catch {
      message.error('Duyệt thất bại')
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }))
    }
  }

  const openReject = (kind: 'leave' | 'correction', id: string) => {
    setRejectTarget({ kind, id })
    setRejectReason('')
  }

  const submitReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) { message.warning('Vui lòng nhập lý do từ chối'); return }
    const { kind, id } = rejectTarget
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      if (kind === 'leave') {
        await leaveRequestService.reject(id, rejectReason.trim())
        message.success('Đã từ chối đơn nghỉ phép')
        fetchLeaves()
      } else {
        await attendanceService.rejectCorrection(id, rejectReason.trim())
        message.success('Đã từ chối yêu cầu bổ sung chấm công')
        fetchCorrections()
      }
      setRejectTarget(null)
    } catch {
      message.error('Thao tác thất bại')
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }))
    }
  }

  const leaveColumns: ColumnsType<LeaveRequest> = [
    { title: 'Nhân viên', render: (_, r) => r.user?.name ?? '—' },
    { title: 'Khoảng ngày', render: (_, r) => `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}` },
    { title: 'Loại nghỉ', render: (_, r) => LEAVE_TYPE_LABEL[r.type] ?? r.type, width: 120 },
    { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
    { title: 'Trạng thái', render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Tag>, width: 110 },
    {
      title: '', width: 160,
      render: (_, r) => r.status === 'PENDING' ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="small" icon={<CheckOutlined />} style={{ color: '#389e0d' }} loading={actionLoading[r.id]} onClick={() => handleApproveLeave(r.id)}>Duyệt</Button>
          <Button size="small" danger icon={<CloseOutlined />} loading={actionLoading[r.id]} onClick={() => openReject('leave', r.id)}>Từ chối</Button>
        </div>
      ) : r.rejectReason ? <span style={{ color: '#aaa', fontSize: 12 }}>Lý do: {r.rejectReason}</span> : null,
    },
  ]

  const correctionColumns: ColumnsType<AttendanceCorrectionRequest> = [
    { title: 'Nhân viên', render: (_, r) => r.user?.name ?? '—' },
    { title: 'Ngày', render: (_, r) => fmtDate(r.workDate), width: 110 },
    { title: 'Giờ vào đề xuất', render: (_, r) => fmtTime(r.checkIn), width: 130 },
    { title: 'Giờ ra đề xuất', render: (_, r) => fmtTime(r.checkOut), width: 130 },
    { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
    { title: 'Trạng thái', render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Tag>, width: 110 },
    {
      title: '', width: 160,
      render: (_, r) => r.status === 'PENDING' ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="small" icon={<CheckOutlined />} style={{ color: '#389e0d' }} loading={actionLoading[r.id]} onClick={() => handleApproveCorrection(r.id)}>Duyệt</Button>
          <Button size="small" danger icon={<CloseOutlined />} loading={actionLoading[r.id]} onClick={() => openReject('correction', r.id)}>Từ chối</Button>
        </div>
      ) : r.rejectReason ? <span style={{ color: '#aaa', fontSize: 12 }}>Lý do: {r.rejectReason}</span> : null,
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Yêu cầu nhân viên" />

      <div className={styles.toolbar}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: 'PENDING', label: 'Chờ duyệt' },
            { value: 'APPROVED', label: 'Đã duyệt' },
            { value: 'REJECTED', label: 'Từ chối' },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => { fetchLeaves(); fetchCorrections() }} style={{ marginLeft: 8 }}>
          Làm mới
        </Button>
      </div>

      <Tabs
        defaultActiveKey="leave"
        items={[
          {
            key: 'leave',
            label: 'Nghỉ phép',
            children: (
              <div className={styles.tableWrap}>
                <Table columns={leaveColumns} dataSource={leaves} rowKey="id" loading={leavesLoading} pagination={{ pageSize: 20 }} size="small" />
              </div>
            ),
          },
          {
            key: 'correction',
            label: 'Bổ sung chấm công',
            children: (
              <div className={styles.tableWrap}>
                <Table columns={correctionColumns} dataSource={corrections} rowKey="id" loading={correctionsLoading} pagination={{ pageSize: 20 }} size="small" />
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Lý do từ chối"
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onOk={submitReject}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối..."
        />
      </Modal>
    </AppLayout>
  )
}

export default StaffRequestsPage
