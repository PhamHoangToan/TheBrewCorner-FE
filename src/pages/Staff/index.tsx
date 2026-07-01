import React, { useCallback, useEffect, useState } from 'react'
import { Avatar, Button, Form, Input, InputNumber, message, Modal, Select, Table, Tag, Upload } from 'antd'
import { DeleteOutlined, DollarOutlined, EditOutlined, PlusOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { userService } from '../../services/user.service'
import { uploadService } from '../../services/upload.service'
import { shiftService } from '../../services/shift.service'
import { payrollService } from '../../services/payroll.service'
import styles from './staff.module.css'

type StaffRole = 'admin' | 'cashier' | 'barista' | 'waiter'
type StaffStatus = 'Đang làm' | 'Nghỉ phép'

interface StaffRow {
  key: string
  id?: string
  manv: string
  hoten: string
  vaitro: StaffRole
  calamviec: string
  lienhe: string
  email: string
  trangthai: StaffStatus
  anhUrl?: string
  employmentType?: string
  baseSalary?: number
  otRatePerHour?: number
  paidLeaveDaysLeft?: number
}

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: 'Chủ cửa hàng',
  cashier: 'Thu ngân',
  barista: 'Pha chế',
  waiter: 'Phục vụ',
}

// Nền nhạt + chữ đậm màu để đủ độ tương phản (nền cam/xanh đậm + chữ trắng trước đây bị mờ, khó đọc)
const ROLE_CHIP: Record<StaffRole, { bg: string; fg: string }> = {
  admin: { bg: '#efe1dd', fg: '#662C21' },
  cashier: { bg: '#fdecc8', fg: '#8a5a00' },
  barista: { bg: '#dcf3de', fg: '#2e7d32' },
  waiter: { bg: '#dcebfc', fg: '#1565c0' },
}

const MOCK_DATA: StaffRow[] = [
  { key: '1', manv: 'NV001', hoten: 'Võ Thị Thùy Hoa',    vaitro: 'admin',   calamviec: 'Ca 1 (6h-14h)',  lienhe: '0901234567', email: 'nv001@thebrewcorner.local', trangthai: 'Đang làm' },
  { key: '2', manv: 'NV002', hoten: 'Nguyễn Thị Tú Trinh', vaitro: 'cashier', calamviec: 'Ca 1 (6h-14h)',  lienhe: '0901234568', email: 'nv002@thebrewcorner.local', trangthai: 'Đang làm' },
  { key: '3', manv: 'NV003', hoten: 'Trần Quang Minh',      vaitro: 'waiter',  calamviec: 'Ca 2 (14h-22h)', lienhe: '0901234569', email: 'nv003@thebrewcorner.local', trangthai: 'Đang làm' },
  { key: '4', manv: 'NV004', hoten: 'Võ Minh Tuấn',         vaitro: 'barista', calamviec: 'Ca 1 (6h-14h)',  lienhe: '0901234570', email: 'nv004@thebrewcorner.local', trangthai: 'Đang làm' },
  { key: '5', manv: 'NV005', hoten: 'Nguyễn Thị Lan',       vaitro: 'waiter',  calamviec: 'Ca 2 (14h-22h)', lienhe: '0901234571', email: 'nv005@thebrewcorner.local', trangthai: 'Nghỉ phép' },
  { key: '6', manv: 'NV006', hoten: 'Lê Văn Tú',            vaitro: 'cashier', calamviec: 'Ca 2 (14h-22h)', lienhe: '0901234572', email: 'nv006@thebrewcorner.local', trangthai: 'Đang làm' },
]

const mapItem = (item: any, idx: number): StaffRow => ({
  key: item.id ?? String(idx),
  id: item.id,
  manv: item.code ?? item.employeeCode ?? `NV${String(idx + 1).padStart(3, '0')}`,
  hoten: item.name ?? item.fullName ?? item.hoten ?? '',
  vaitro: ((item.role ?? item.vaitro ?? 'waiter') as string).toLowerCase() as StaffRole,
  calamviec: item.shiftName ?? item.shift ?? item.calamviec ?? '',
  lienhe: item.phone ?? item.lienhe ?? '',
  email: item.email ?? '',
  trangthai: (item.status === 'ACTIVE' || item.trangthai === 'Đang làm') ? 'Đang làm' : 'Nghỉ phép',
  anhUrl: item.avatarUrl ?? item.anhUrl,
  employmentType: item.employmentType ?? 'FULL_TIME',
  baseSalary: Number(item.baseSalary ?? 0),
  otRatePerHour: Number(item.otRatePerHour ?? 0),
  paidLeaveDaysLeft: Number(item.paidLeaveDaysLeft ?? 12),
})

const Staff: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [data, setData] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftOptions, setShiftOptions] = useState<{ value: string; label: string }[]>([])
  const [selected, setSelected] = useState<React.Key[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StaffRow | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [form] = Form.useForm()
  const [salaryModalOpen, setSalaryModalOpen] = useState(false)
  const [salaryTarget, setSalaryTarget] = useState<StaffRow | null>(null)
  const [salaryForm] = Form.useForm()

  const fetchShifts = useCallback(async () => {
    try {
      const res = await shiftService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      if (items.length) {
        setShiftOptions(items.map((s) => ({ value: s.name ?? s.code, label: s.name ?? s.code })))
      } else {
        setShiftOptions([
          { value: 'Ca 1 (6h-14h)', label: 'Ca 1 (6h-14h)' },
          { value: 'Ca 2 (14h-22h)', label: 'Ca 2 (14h-22h)' },
          { value: 'Ca 3 (22h-6h)', label: 'Ca 3 (22h-6h)' },
        ])
      }
    } catch {
      setShiftOptions([
        { value: 'Ca 1 (6h-14h)', label: 'Ca 1 (6h-14h)' },
        { value: 'Ca 2 (14h-22h)', label: 'Ca 2 (14h-22h)' },
        { value: 'Ca 3 (22h-6h)', label: 'Ca 3 (22h-6h)' },
      ])
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userService.staffList()
      const items: any[] = res.data?.items ?? res.data ?? []
      setData(items.map(mapItem))
    } catch {
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); fetchShifts() }, [fetchData, fetchShifts])

  const openAdd = () => {
    setEditing(null)
    setFileList([])
    setPreviewUrl('')
    setPendingFile(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = () => {
    const record = data.find((d) => d.key === selected[0])
    if (!record) return
    setEditing(record)
    setPreviewUrl(record.anhUrl ?? '')
    setFileList(record.anhUrl ? [{ uid: '-1', name: 'avatar.png', status: 'done' as const, url: record.anhUrl }] : [])
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    const toDelete = data.filter((d) => selected.includes(d.key))
    try {
      await Promise.all(toDelete.filter((d) => d.id).map((d) => userService.remove(d.id!)))
      message.success('Đã xóa nhân viên')
      setSelected([])
      fetchData()
    } catch { message.error('Xóa thất bại') }
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        let anhUrl = editing?.anhUrl
        if (pendingFile) {
          try { anhUrl = await uploadService.uploadImage(pendingFile) } catch { /* keep local preview */ }
        } else if (previewUrl && !previewUrl.startsWith('blob:')) {
          anhUrl = previewUrl
        }
        const body = {
          name: values.hoten,
          role: values.vaitro,
          phone: values.lienhe,
          email: values.email,
          shiftName: values.calamviec,
          status: values.trangthai === 'Đang làm' ? 'ACTIVE' : 'INACTIVE',
          ...(anhUrl ? { avatarUrl: anhUrl } : {}),
        }
        if (editing?.id) {
          await userService.update(editing.id, body)
          message.success('Đã cập nhật nhân viên')
        } else {
          await userService.create(body)
          message.success('Đã thêm nhân viên mới — thông tin tài khoản đã được gửi qua email')
        }
        setModalOpen(false)
        setSelected([])
        fetchData()
      } catch { message.error('Lưu thất bại') }
    })
  }

  const columns: ColumnsType<StaffRow> = [
    {
      title: 'Ảnh',
      dataIndex: 'anhUrl',
      key: 'anhUrl',
      width: 64,
      render: (url: string, record) =>
        url ? (
          <Avatar src={url} size={40} />
        ) : (
          <Avatar size={40} icon={<UserOutlined />} style={{ background: '#662C21' }}>
            {record.hoten.charAt(0)}
          </Avatar>
        ),
    },
    { title: 'Mã NV', dataIndex: 'manv', key: 'manv', width: 90 },
    { title: 'Họ tên', dataIndex: 'hoten', key: 'hoten' },
    {
      title: 'Vai trò',
      dataIndex: 'vaitro',
      key: 'vaitro',
      render: (v: StaffRole) => (
        <Tag style={{ background: ROLE_CHIP[v].bg, color: ROLE_CHIP[v].fg, border: 'none', fontWeight: 700 }}>
          {ROLE_LABEL[v]}
        </Tag>
      ),
    },
    { title: 'Ca làm việc', dataIndex: 'calamviec', key: 'calamviec' },
    { title: 'Liên hệ', dataIndex: 'lienhe', key: 'lienhe' },
    {
      title: 'Lương cơ bản',
      key: 'luong',
      align: 'right' as const,
      width: 130,
      render: (_: unknown, record: StaffRow) =>
        record.baseSalary
          ? <span style={{ color: '#389e0d', fontWeight: 600 }}>{Number(record.baseSalary).toLocaleString('vi-VN')}đ</span>
          : <span style={{ color: '#cf1322', fontSize: 12 }}>Chưa cấu hình</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangthai',
      key: 'trangthai',
      render: (v: string) => <Tag color={v === 'Đang làm' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (_, record) => (
        <div className={styles.actionBtns}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record)
              setPreviewUrl(record.anhUrl ?? '')
              setFileList(record.anhUrl ? [{ uid: '-1', name: 'avatar.png', status: 'done' as const, url: record.anhUrl }] : [])
              form.setFieldsValue(record)
              setModalOpen(true)
            }}
          />
          <Button
            size="small"
            icon={<DollarOutlined />}
            title="Cấu hình lương"
            style={!record.baseSalary ? { color: '#cf1322', borderColor: '#cf1322' } : undefined}
            onClick={() => {
              setSalaryTarget(record)
              salaryForm.setFieldsValue({
                employmentType: record.employmentType ?? 'FULL_TIME',
                baseSalary: record.baseSalary ?? 0,
                otRatePerHour: record.otRatePerHour ?? 0,
                paidLeaveDaysLeft: record.paidLeaveDaysLeft ?? 12,
              })
              setSalaryModalOpen(true)
            }}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={async () => {
              try {
                if (record.id) await userService.remove(record.id)
                message.success('Đã xóa')
                fetchData()
              } catch { message.error('Xóa thất bại') }
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Quản lý nhân viên" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Nhân viên' }]} />

      <div className={styles.toolbar}>
        <Button type="primary" icon={<PlusOutlined />} className={styles.btnAdd} onClick={openAdd}>Thêm</Button>
        <Button icon={<EditOutlined />} disabled={selected.length !== 1} onClick={openEdit}>Sửa</Button>
        <Button danger icon={<DeleteOutlined />} disabled={selected.length === 0} onClick={handleDelete}>Xóa</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} nhân viên` }}
        className={styles.table}
      />

      <Modal
        title={editing ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Ảnh đại diện">
            <div className={styles.avatarUpload}>
              <Avatar
                size={80}
                src={previewUrl || undefined}
                icon={!previewUrl ? <UserOutlined /> : undefined}
                style={{ background: '#662C21', marginBottom: 12 }}
              />
              <Upload
                fileList={fileList}
                beforeUpload={(file) => {
                  const url = URL.createObjectURL(file)
                  setPreviewUrl(url)
                  setPendingFile(file)
                  setFileList([{ uid: '-1', name: file.name, status: 'done' as const, url }])
                  return false
                }}
                onRemove={() => { setPreviewUrl(''); setPendingFile(null); setFileList([]) }}
                maxCount={1}
                accept="image/*"
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} size="small">Chọn ảnh</Button>
              </Upload>
              {previewUrl && (
                <Button size="small" danger onClick={() => { setPreviewUrl(''); setPendingFile(null); setFileList([]) }} style={{ marginTop: 8 }}>
                  Xóa ảnh
                </Button>
              )}
            </div>
          </Form.Item>

          <Form.Item name="hoten" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="vaitro" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
            <Select options={[
              { value: 'admin',   label: 'Chủ cửa hàng' },
              { value: 'cashier', label: 'Thu ngân' },
              { value: 'barista', label: 'Pha chế' },
              { value: 'waiter',  label: 'Phục vụ' },
            ]} />
          </Form.Item>
          <Form.Item name="calamviec" label="Ca làm việc" rules={[{ required: true }]}>
            <Select options={shiftOptions} placeholder="Chọn ca làm việc" />
          </Form.Item>
          <Form.Item name="lienhe" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
            <Input placeholder="VD: 0901234567" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
            extra={!editing ? 'Thông tin tài khoản đăng nhập (app Nhân viên) sẽ được gửi về email này' : undefined}
          >
            <Input placeholder="VD: nhanvien@thebrewcorner.local" />
          </Form.Item>
          <Form.Item name="trangthai" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Đang làm',  label: 'Đang làm' },
              { value: 'Nghỉ phép', label: 'Nghỉ phép' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal cấu hình lương */}
      <Modal
        title={`Cấu hình lương — ${salaryTarget?.hoten ?? ''}`}
        open={salaryModalOpen}
        onCancel={() => setSalaryModalOpen(false)}
        onOk={async () => {
          const vals = await salaryForm.validateFields()
          try {
            await payrollService.setSalaryConfig(salaryTarget!.id!, vals)
            message.success('Đã lưu cấu hình lương')
            setSalaryModalOpen(false)
          } catch { message.error('Lưu thất bại') }
        }}
        okText="Lưu"
        okButtonProps={{ style: { background: '#662c21', border: 'none' } }}
      >
        <Form form={salaryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="employmentType" label="Loại hình lao động" rules={[{ required: true }]}>
            <Select options={[{ value: 'FULL_TIME', label: 'Toàn thời gian (Full-time)' }, { value: 'PART_TIME', label: 'Bán thời gian (Part-time)' }]} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.employmentType !== curr.employmentType}
          >
            {({ getFieldValue }) => getFieldValue('employmentType') === 'PART_TIME' ? (
              <Form.Item name="baseSalary" label="Lương theo giờ (đ/giờ)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} addonAfter="đ/giờ" />
              </Form.Item>
            ) : (
              <>
                <Form.Item name="baseSalary" label="Lương tháng cơ bản" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} addonAfter="đ/tháng" />
                </Form.Item>
                <Form.Item name="paidLeaveDaysLeft" label="Ngày phép còn lại (năm)">
                  <InputNumber min={0} max={12} style={{ width: '100%' }} addonAfter="ngày" />
                </Form.Item>
              </>
            )}
          </Form.Item>
          <Form.Item name="otRatePerHour" label="Tiền OT (đ/giờ)">
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} addonAfter="đ/giờ" />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default Staff
