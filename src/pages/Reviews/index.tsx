import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Rate, Select, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { reviewService, type ProductReview } from '../../services/review.service'

const RATING_OPTIONS = [
  { value: undefined, label: 'Tất cả số sao' },
  { value: 5, label: '5 sao' },
  { value: 4, label: '4 sao' },
  { value: 3, label: '3 sao' },
  { value: 2, label: '2 sao' },
  { value: 1, label: '1 sao' },
]

const Reviews: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [items, setItems] = useState<ProductReview[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [replyTarget, setReplyTarget] = useState<ProductReview | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reviewService.list({ page, limit: 20, rating: ratingFilter })
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
    } catch {
      message.error('Không tải được danh sách đánh giá')
    } finally {
      setLoading(false)
    }
  }, [page, ratingFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleHidden = async (r: ProductReview) => {
    try {
      await reviewService.setHidden(r.id, !r.hidden)
      message.success(r.hidden ? 'Đã hiện lại đánh giá' : 'Đã ẩn đánh giá')
      fetchAll()
    } catch { message.error('Thao tác thất bại') }
  }

  const openReply = (r: ProductReview) => {
    setReplyTarget(r)
    setReplyText(r.reply ?? '')
  }

  const submitReply = async () => {
    if (!replyTarget || !replyText.trim()) { message.warning('Nhập nội dung phản hồi'); return }
    setReplySubmitting(true)
    try {
      await reviewService.reply(replyTarget.id, replyText.trim())
      message.success('Đã gửi phản hồi')
      setReplyTarget(null)
      fetchAll()
    } catch { message.error('Gửi phản hồi thất bại') } finally { setReplySubmitting(false) }
  }

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Đánh giá sản phẩm" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Đánh giá' }]} />

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder="Lọc theo số sao"
          value={ratingFilter}
          onChange={(v) => { setRatingFilter(v); setPage(1) }}
          options={RATING_OPTIONS.filter((o) => o.value !== undefined)}
        />
      </div>

      <Table
        loading={loading}
        rowKey="id"
        dataSource={items}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
        locale={{ emptyText: 'Chưa có đánh giá nào' }}
        columns={[
          { title: 'Sản phẩm', dataIndex: ['product', 'name'], key: 'product', render: (_, r) => r.product?.name ?? '—' },
          { title: 'Khách', dataIndex: ['user', 'name'], key: 'user', render: (_, r) => r.user?.name ?? '—' },
          { title: 'Sao', dataIndex: 'rating', key: 'rating', render: (v: number) => <Rate disabled value={v} style={{ fontSize: 14 }} /> },
          { title: 'Bình luận', dataIndex: 'comment', key: 'comment', render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span> },
          { title: 'Phản hồi quán', dataIndex: 'reply', key: 'reply', render: (v: string | null) => v || <span style={{ color: '#999' }}>Chưa phản hồi</span> },
          { title: 'Ngày', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
          {
            title: 'Trạng thái', dataIndex: 'hidden', key: 'hidden',
            render: (v: boolean) => v ? <Tag color="red">Đã ẩn</Tag> : <Tag color="green">Hiện</Tag>,
          },
          {
            title: 'Thao tác', key: 'act', render: (_: any, r: ProductReview) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="small" onClick={() => openReply(r)}>Phản hồi</Button>
                <Button size="small" danger={!r.hidden} onClick={() => toggleHidden(r)}>
                  {r.hidden ? 'Hiện lại' : 'Ẩn'}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Phản hồi đánh giá"
        open={!!replyTarget}
        onOk={submitReply}
        onCancel={() => setReplyTarget(null)}
        okText="Gửi phản hồi"
        cancelText="Hủy"
        confirmLoading={replySubmitting}
      >
        <Input.TextArea
          rows={4}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Cảm ơn khách đã đánh giá..."
          maxLength={500}
        />
      </Modal>
    </AppLayout>
  )
}

export default Reviews
