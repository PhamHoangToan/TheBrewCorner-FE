import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Form, InputNumber, message, Modal, Select, Table, Tag, TimePicker } from 'antd'
import { EditOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { attendanceService, type AttendanceLog, type PenaltyConfig } from '../../services/attendance.service'
import { userService } from '../../services/user.service'
import styles from './attendance.module.css'

interface StaffOption { value: string; label: string }

const AttendancePage: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [filterUserId, setFilterUserId] = useState<string | undefined>()
  const [filterMonth, setFilterMonth] = useState(dayjs())
  const [penaltyConfig, setPenaltyConfig] = useState<PenaltyConfig | null>(null)
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<AttendanceLog | null>(null)
  const [form] = Form.useForm()
  const [penaltyForm] = Form.useForm()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await attendanceService.list({
        userId: filterUserId,
        month: String(filterMonth.month() + 1),
        year: String(filterMonth.year()),
        limit: 100,
      })
      setLogs(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
    } catch { setLogs([]) } finally { setLoading(false) }
  }, [filterUserId, filterMonth])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    userService.staffList({ limit: 200 }).then((res) => {
      const items: any[] = res.data?.items ?? []
      setStaffOptions(items.map(u => ({ value: u.id, label: `${u.code} — ${u.name}` })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    attendanceService.getPenaltyConfig().then(r => {
      setPenaltyConfig(r.data)
      penaltyForm.setFieldsValue(r.data)
    }).catch(() => {})
  }, [penaltyForm])

  const openManual = (record?: AttendanceLog) => {
    setEditRecord(record ?? null)
    form.setFieldsValue(record ? {
      userId: record.userId,
      workDate: dayjs(record.workDate),
      checkIn: record.checkIn ? dayjs(record.checkIn) : null,
      checkOut: record.checkOut ? dayjs(record.checkOut) : null,
      note: record.note,
    } : {})
    setManualModalOpen(true)
  }

  const handleManualSave = async () => {
    const vals = await form.validateFields()
    const checkIn = vals.checkIn ? `${vals.workDate.format('YYYY-MM-DD')}T${vals.checkIn.format('HH:mm')}:00` : null
    const checkOut = vals.checkOut ? `${vals.workDate.format('YYYY-MM-DD')}T${vals.checkOut.format('HH:mm')}:00` : undefined
    try {
      if (editRecord) {
        await attendanceService.update(editRecord.id, { checkIn: checkIn ?? undefined, checkOut, note: vals.note })
      } else {
        await attendanceService.createManual({ userId: vals.userId, checkIn: checkIn!, checkOut, workDate: vals.workDate.format('YYYY-MM-DD'), note: vals.note })
      }
      message.success('Đã lưu')
      setManualModalOpen(false)
      fetchLogs()
    } catch { message.error('Lưu thất bại') }
  }

  const handlePenaltySave = async () => {
    const vals = await penaltyForm.validateFields()
    try {
      await attendanceService.updatePenaltyConfig(vals)
      message.success('Đã cập nhật cấu hình phạt')
      setPenaltyModalOpen(false)
    } catch { message.error('Cập nhật thất bại') }
  }

  const columns: ColumnsType<AttendanceLog> = [
    { title: 'Nhân viên', key: 'name', render: (_, r) => `${r.user?.name ?? ''} (${r.user?.code ?? ''})` },
    { title: 'Ngày', dataIndex: 'workDate', key: 'workDate', render: (v) => dayjs(v).format('DD/MM/YYYY'), width: 110 },
    { title: 'Check-in', dataIndex: 'checkIn', key: 'checkIn', render: (v) => v ? dayjs(v).format('HH:mm') : '—', width: 90 },
    { title: 'Check-out', dataIndex: 'checkOut', key: 'checkOut', render: (v) => v ? dayjs(v).format('HH:mm') : '—', width: 90 },
    { title: 'Nguồn', dataIndex: 'source', key: 'source', width: 80, render: (v) => <Tag>{v}</Tag> },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openManual(r)} />,
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Chấm công" />

      {penaltyConfig && (
        <div className={styles.penaltyCard}>
          <div className={styles.penaltyTitle}>⚙️ Cấu hình phạt</div>
          <div className={styles.penaltyGrid}>
            <div>Phạt trễ: <b>{Number(penaltyConfig.penaltyPerMinuteLate).toLocaleString('vi-VN')}đ/phút</b> (grace {penaltyConfig.lateGraceMinutes}p)</div>
            <div>Phạt về sớm: <b>{Number(penaltyConfig.penaltyPerMinuteEarly).toLocaleString('vi-VN')}đ/phút</b> (grace {penaltyConfig.earlyGraceMinutes}p)</div>
          </div>
          <Button size="small" icon={<SettingOutlined />} style={{ marginTop: 8 }} onClick={() => setPenaltyModalOpen(true)}>Chỉnh</Button>
        </div>
      )}

      <div className={styles.toolbar}>
        <Select allowClear placeholder="Chọn nhân viên" options={staffOptions} style={{ width: 240 }} value={filterUserId} onChange={setFilterUserId} />
        <DatePicker.MonthPicker value={filterMonth} onChange={(v) => v && setFilterMonth(v)} format="MM/YYYY" />
        <Button onClick={fetchLogs}>Xem</Button>
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#662c21', border: 'none' }} onClick={() => openManual()}>
          Nhập thủ công
        </Button>
      </div>

      <div className={styles.tableWrap}>
        <Table columns={columns} dataSource={logs} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="small"
          footer={() => `Tổng: ${total} bản ghi`} />
      </div>

      {/* Modal nhập / sửa chấm công */}
      <Modal title={editRecord ? 'Sửa chấm công' : 'Nhập chấm công thủ công'} open={manualModalOpen} onCancel={() => setManualModalOpen(false)} onOk={handleManualSave} okText="Lưu" okButtonProps={{ style: { background: '#662c21', border: 'none' } }}>
        <Form form={form} layout="vertical">
          {!editRecord && (
            <Form.Item name="userId" label="Nhân viên" rules={[{ required: true }]}>
              <Select showSearch options={staffOptions} filterOption={(i, o) => (o?.label as string ?? '').toLowerCase().includes(i.toLowerCase())} />
            </Form.Item>
          )}
          <Form.Item name="workDate" label="Ngày" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="checkIn" label="Check-in" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="checkOut" label="Check-out">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Form.Item name="note"><input className="ant-input" /></Form.Item>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal cấu hình phạt */}
      <Modal title="Cấu hình phạt" open={penaltyModalOpen} onCancel={() => setPenaltyModalOpen(false)} onOk={handlePenaltySave} okText="Lưu" okButtonProps={{ style: { background: '#662c21', border: 'none' } }}>
        <Form form={penaltyForm} layout="vertical">
          <Form.Item name="lateGraceMinutes" label="Số phút grace khi đi trễ"><InputNumber min={0} style={{ width: '100%' }} addonAfter="phút" /></Form.Item>
          <Form.Item name="penaltyPerMinuteLate" label="Tiền phạt mỗi phút đi trễ"><InputNumber min={0} style={{ width: '100%' }} addonAfter="đ/phút" /></Form.Item>
          <Form.Item name="earlyGraceMinutes" label="Số phút grace khi về sớm"><InputNumber min={0} style={{ width: '100%' }} addonAfter="phút" /></Form.Item>
          <Form.Item name="penaltyPerMinuteEarly" label="Tiền phạt mỗi phút về sớm"><InputNumber min={0} style={{ width: '100%' }} addonAfter="đ/phút" /></Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default AttendancePage
