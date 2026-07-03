import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Form, message, Modal, Popconfirm, Select, Table, Tag, TimePicker } from 'antd'
import { CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { shiftService } from '../../services/shift.service'
import { userService } from '../../services/user.service'
import styles from './shift.module.css'

interface Shift {
  key: string
  id?: string
  ma: string
  nhanVien: string
  vaiTro: string
  ngay: string
  gioVao: string
  gioRa: string
  trangThai: 'Đang làm' | 'Vắng mặt' | ''
  note?: string
}

const MOCK_DATA: Shift[] = [
  { key: '1', ma: 'CA001', nhanVien: 'Trần Quang Minh',    vaiTro: 'Phục vụ',  ngay: '26/06/2026', gioVao: '07:00', gioRa: '15:00', trangThai: 'Đang làm' },
  { key: '2', ma: 'CA002', nhanVien: 'Nguyễn Thị Tú Trinh',vaiTro: 'Thu ngân', ngay: '26/06/2026', gioVao: '07:00', gioRa: '15:00', trangThai: 'Đang làm' },
  { key: '3', ma: 'CA003', nhanVien: 'Võ Minh Tuấn',        vaiTro: 'Pha chế',  ngay: '26/06/2026', gioVao: '07:00', gioRa: '15:00', trangThai: 'Đang làm' },
  { key: '4', ma: 'CA004', nhanVien: 'Lê Văn Tú',           vaiTro: 'Phục vụ',  ngay: '25/06/2026', gioVao: '15:00', gioRa: '23:00', trangThai: 'Đang làm' },
  { key: '5', ma: 'CA005', nhanVien: 'Phạm Thị Mai',        vaiTro: 'Thu ngân', ngay: '25/06/2026', gioVao: '15:00', gioRa: '23:00', trangThai: 'Đang làm' },
  { key: '6', ma: 'CA006', nhanVien: 'Nguyễn Văn An',       vaiTro: 'Phục vụ',  ngay: '25/06/2026', gioVao: '15:00', gioRa: '23:00', trangThai: 'Vắng mặt' },
]

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Chủ cửa hàng', admin: 'Chủ cửa hàng',
  CASHIER: 'Thu ngân', cashier: 'Thu ngân',
  BARISTA: 'Pha chế', barista: 'Pha chế',
  WAITER: 'Phục vụ', waiter: 'Phục vụ',
}

// Ca chưa tới ngày (SCHEDULED và ngày làm ở tương lai) → để trống, không suy đoán trạng thái.
// Đã tới ngày: có dữ liệu chấm công (COMPLETED/IN_PROGRESS) → "Đang làm"; không có (ABSENT) → "Vắng mặt".
const mapStatus = (rawStatus: string, workDate?: string): Shift['trangThai'] => {
  const isFuture = workDate ? dayjs(workDate).startOf('day').isAfter(dayjs().startOf('day')) : false
  if (isFuture || rawStatus === 'SCHEDULED') return ''
  if (rawStatus === 'ABSENT' || rawStatus === 'Vắng mặt') return 'Vắng mặt'
  return 'Đang làm'
}

const mapItem = (item: any, idx: number): Shift => {
  const rawRole = item.user?.role ?? item.userRole ?? item.role ?? item.vaiTro ?? ''
  return {
    key: item.id ?? String(idx),
    id: item.id,
    ma: item.shift?.code ?? item.code ?? `CA${String(idx + 1).padStart(3, '0')}`,
    nhanVien: item.user?.name ?? item.userName ?? item.employeeName ?? item.nhanVien ?? '',
    vaiTro: ROLE_LABEL[rawRole] ?? rawRole,
    ngay: item.workDate ? dayjs(item.workDate).format('DD/MM/YYYY') : (item.ngay ?? ''),
    gioVao: item.shift?.startTime ?? item.checkIn ?? item.startTime ?? item.gioVao ?? '',
    gioRa: item.shift?.endTime ?? item.checkOut ?? item.endTime ?? item.gioRa ?? '',
    trangThai: mapStatus(item.status ?? item.trangThai ?? '', item.workDate),
    note: item.note ?? '',
  }
}

const isPaidLeaveNote = (note?: string) => {
  const normalized = String(note ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return normalized.includes('phep') || normalized.includes('paid leave') || /\bleave\b/.test(normalized)
}

const Shift: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Shift | null>(null)
  const [form] = Form.useForm()

  const fetchStaff = useCallback(async () => {
    try {
      const res = await userService.staffList()
      const items: any[] = res.data?.items ?? res.data ?? []
      setStaffOptions(items.map((u) => ({ value: u.name, label: u.name })))
    } catch { /* giữ options cũ */ }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await shiftService.assignments({ limit: 200 })
      const items: any[] = res.data?.items ?? res.data ?? []
      setData(items.map(mapItem))
    } catch {
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); fetchStaff() }, [fetchData, fetchStaff])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Shift) => {
    setEditing(record)
    form.setFieldsValue({
      nhanVien: record.nhanVien,
      vaiTro: record.vaiTro,
      ngay: record.ngay ? dayjs(record.ngay, 'DD/MM/YYYY') : undefined,
      gioVao: record.gioVao ? dayjs(record.gioVao, 'HH:mm') : undefined,
      gioRa: record.gioRa ? dayjs(record.gioRa, 'HH:mm') : undefined,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id?: string, key?: string) => {
    try {
      if (id) await shiftService.removeAssignment(id)
      message.success('Đã ẩn ca làm việc')
      fetchData()
    } catch {
      setData((prev) => prev.filter((d) => d.key !== key))
    }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const body = {
          nhanVien: values.nhanVien,
          role: values.vaiTro,
          ngay: values.ngay?.format('YYYY-MM-DD'),
          gioVao: values.gioVao?.format('HH:mm'),
          gioRa: values.gioRa?.format('HH:mm'),
        }
        if (editing?.id) {
          await shiftService.updateAssignment(editing.id, body)
          message.success('Đã cập nhật ca làm việc')
        } else {
          await shiftService.createAssignment(body)
          message.success('Đã thêm ca làm việc và chấm công tương ứng')
        }
        setModalOpen(false)
        fetchData()
      } catch { message.error('Lưu thất bại') }
    })
  }

  const handleUpdateStatus = async (record: Shift, newStatus: string) => {
    if (!record.id) return
    try {
      await shiftService.updateAssignment(record.id, { status: newStatus })
      message.success('Đã cập nhật trạng thái')
      fetchData()
    } catch { message.error('Cập nhật thất bại') }
  }

  const handleUsePaidLeave = async (record: Shift) => {
    if (!record.id) return
    try {
      await shiftService.updateAssignment(record.id, { status: 'ABSENT', note: 'nghỉ phép' })
      message.success('Đã cập nhật ca dùng ngày phép')
      fetchData()
    } catch { message.error('Cập nhật ngày phép thất bại') }
  }

  const columns: ColumnsType<Shift> = [
    { title: 'Mã ca', dataIndex: 'ma', key: 'ma', width: 90 },
    { title: 'Nhân viên', dataIndex: 'nhanVien', key: 'nhanVien' },
    { title: 'Vai trò', dataIndex: 'vaiTro', key: 'vaiTro', width: 110 },
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay', width: 120 },
    { title: 'Giờ vào', dataIndex: 'gioVao', key: 'gioVao', align: 'center', width: 90 },
    { title: 'Giờ ra', dataIndex: 'gioRa', key: 'gioRa', align: 'center', width: 90 },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: 140,
      render: (note?: string) => isPaidLeaveNote(note)
        ? <Tag color="blue">{note}</Tag>
        : (note || '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 130,
      render: (v: string, record) => v === '' ? (
        <span style={{ color: '#aaa' }}>— Chưa tới ngày</span>
      ) : (
        <Select
          value={v}
          size="small"
          style={{ width: 130 }}
          onChange={(val) => handleUpdateStatus(record, val)}
          options={[
            { value: 'Đang làm', label: <Tag color="blue">Đang làm</Tag> },
            { value: 'Vắng mặt', label: <Tag color="red">Vắng mặt</Tag> },
          ]}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      render: (_, record) => (
        <div className={styles.actionBtns}>
          <Popconfirm title="Cập nhật ca này là nghỉ phép?" onConfirm={() => handleUsePaidLeave(record)}>
            <Button size="small" icon={<CalendarOutlined />} title="Dùng ngày phép" disabled={!record.id || isPaidLeaveNote(record.note)} />
          </Popconfirm>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.key)} />
        </div>
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.toolbar}>
        <Button type="primary" icon={<PlusOutlined />} className={styles.addBtn} onClick={openAdd}>
          Thêm ca làm việc
        </Button>
      </div>

      <Table columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 10 }} className={styles.table} />

      <Modal
        title={editing ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nhanVien" label="Nhân viên" rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}>
            <Select
              options={staffOptions}
              placeholder="Chọn nhân viên..."
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="vaiTro" label="Vai trò" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Phục vụ',  label: 'Phục vụ' },
              { value: 'Thu ngân', label: 'Thu ngân' },
              { value: 'Pha chế',  label: 'Pha chế' },
            ]} />
          </Form.Item>
          <Form.Item name="ngay" label="Ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="gioVao" label="Giờ vào" rules={[{ required: true }]}>
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>
          <Form.Item name="gioRa" label="Giờ ra" rules={[{ required: true }]}>
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default Shift
