import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { campaignService, type Campaign } from '../../services/campaign.service'

const SEGMENTS = [
  { value: 'ALL', label: 'Tất cả khách' },
  { value: 'GOLD', label: 'Hạng Vàng' },
  { value: 'SILVER', label: 'Hạng Bạc' },
  { value: 'INACTIVE_30D', label: 'Lâu không quay lại (30 ngày)' },
  { value: 'BIRTHDAY_MONTH', label: 'Sinh nhật tháng này' },
]
const CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Thông báo app' },
  { value: 'BOTH', label: 'Cả hai' },
]

const Campaigns: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', channel: 'EMAIL', segment: 'ALL' })
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await campaignService.list()
      setItems(res.data?.items ?? [])
    } catch {
      message.error('Không tải được chiến dịch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => {
    setForm({ title: '', content: '', channel: 'EMAIL', segment: 'ALL' })
    setPreviewCount(null)
    setOpen(true)
  }

  const loadPreview = async (segment: string) => {
    try {
      const res = await campaignService.previewCount(segment)
      setPreviewCount(res.data?.count ?? 0)
    } catch { setPreviewCount(null) }
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) { message.warning('Nhập tiêu đề và nội dung'); return }
    setBusy(true)
    try {
      await campaignService.create(form)
      message.success('Đã tạo chiến dịch (nháp)')
      setOpen(false)
      fetchAll()
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Tạo thất bại')
    } finally {
      setBusy(false)
    }
  }

  const handleSend = (c: Campaign) => {
    Modal.confirm({
      title: `Gửi chiến dịch "${c.title}"?`,
      content: 'Email/thông báo sẽ được gửi tới toàn bộ khách trong phân khúc. Không thể hoàn tác.',
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await campaignService.send(c.id)
          message.success(`Đã gửi tới ${res.data?.sent ?? 0}/${res.data?.total ?? 0} khách`)
          fetchAll()
        } catch (err: any) {
          message.error(err?.response?.data?.message ?? 'Gửi thất bại')
        }
      },
    })
  }

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Chiến dịch marketing" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Marketing' }]} />
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button type="primary" style={{ background: '#662c21', borderColor: '#662c21' }} onClick={openCreate}>Tạo chiến dịch</Button>
      </div>
      <Table
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Chưa có chiến dịch' }}
        dataSource={items.map((c) => ({ key: c.id, ...c }))}
        columns={[
          { title: 'Tiêu đề', dataIndex: 'title', key: 't' },
          { title: 'Kênh', dataIndex: 'channel', key: 'c', render: (v: string) => CHANNELS.find((x) => x.value === v)?.label ?? v },
          { title: 'Phân khúc', dataIndex: 'segment', key: 's', render: (v: string) => SEGMENTS.find((x) => x.value === v)?.label ?? v },
          { title: 'Trạng thái', dataIndex: 'status', key: 'st', render: (v: string, r: any) => v === 'SENT' ? <Tag color="green">Đã gửi ({r.sentCount})</Tag> : <Tag>Nháp</Tag> },
          { title: 'Ngày gửi', dataIndex: 'sentAt', key: 'd', render: (v: string | null) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
          {
            title: '', key: 'act', render: (_: any, r: Campaign) =>
              r.status === 'DRAFT' ? <Button size="small" type="primary" onClick={() => handleSend(r)}>Gửi</Button> : null,
          },
        ]}
      />

      <Modal title="Tạo chiến dịch" open={open} onOk={handleCreate} onCancel={() => setOpen(false)} okText="Lưu nháp" cancelText="Hủy" confirmLoading={busy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '12px 0' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tiêu đề</div>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nội dung</div>
            <Input.TextArea rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Kênh gửi</div>
              <Select style={{ width: '100%' }} value={form.channel} onChange={(v) => setForm((f) => ({ ...f, channel: v }))} options={CHANNELS} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Phân khúc</div>
              <Select style={{ width: '100%' }} value={form.segment} onChange={(v) => { setForm((f) => ({ ...f, segment: v })); loadPreview(v) }} options={SEGMENTS} />
            </div>
          </div>
          <Button size="small" onClick={() => loadPreview(form.segment)}>Xem số người nhận</Button>
          {previewCount != null && <div style={{ color: '#662c21' }}>≈ <b>{previewCount}</b> khách sẽ nhận</div>}
        </div>
      </Modal>
    </AppLayout>
  )
}

export default Campaigns
