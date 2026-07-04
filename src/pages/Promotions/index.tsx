import React, { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Table, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import AppLayout from '../../components/common/AppLayout'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { promotionService } from '../../services/promotion.service'
import styles from './promotions.module.css'

/* ── Types ── */
type KMStatus = 'Đang áp dụng' | 'Hết hạn'

interface OrderPromo {
  key: string
  id?: string
  makm: string
  tenchuongtrinh: string
  dieukien: string
  minOrderAmount?: number
  giampercent: number
  trangthai: KMStatus
}



const toStatus = (s: string): KMStatus =>
  (s === 'ACTIVE' || s === 'Đang áp dụng') ? 'Đang áp dụng' : 'Hết hạn'

const mapOrderPromo = (item: any, idx: number): OrderPromo => ({
  key: item.id ?? String(idx),
  id: item.id,
  makm: item.code ?? `KM${String(idx + 1).padStart(3, '0')}`,
  tenchuongtrinh: item.name ?? item.tenchuongtrinh ?? '',
  dieukien: item.conditionText ?? item.condition ?? item.dieukien ?? '',
  minOrderAmount: Number(item.minOrderAmount ?? 0),
  giampercent: Number(item.discountPercent ?? item.giampercent ?? 0),
  trangthai: toStatus(item.status ?? item.trangthai ?? ''),
})

/* ── Status tag ── */
const StatusTag = ({ v }: { v: string }) => (
  <Tag color={v === 'Đang áp dụng' ? 'green' : 'red'}>{v}</Tag>
)

/* ── Component ── */
const Promotions: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const [orderPromos, setOrderPromos] = useState<OrderPromo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<React.Key[]>([])
  const [modal, setModal] = useState<boolean>(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await promotionService.list()
      const items: any[] = res.data?.items ?? res.data ?? []
      setOrderPromos(items.map(mapOrderPromo))
    } catch {
      setOrderPromos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openModal = () => {
    form.resetFields()
    setModal(true)
  }

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        await promotionService.create({
          code: values.makm,
          name: values.tenchuongtrinh,
          conditionText: values.dieukien,
          minOrderAmount: values.minOrderAmount,
          discountPercent: values.giampercent,
          imageUrl: values.imageUrl || undefined,
          startDate: values.ngaybatdau?.format('YYYY-MM-DD'),
          endDate: values.ngayketthuc?.format('YYYY-MM-DD'),
          status: 'ACTIVE',
        })
        message.success('Đã thêm khuyến mãi')
        setModal(false)
        fetchData()
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Thêm thất bại'
        message.error(String(msg))
      }
    })
  }

  const deletePromo = async (id?: string, key?: string) => {
    try {
      if (id) await promotionService.remove(id)
      message.success('Đã ẩn')
      fetchData()
    } catch {
      setOrderPromos((p) => p.filter((d) => d.key !== key))
    }
  }

  /* ── Columns ── */
  const orderColumns: ColumnsType<OrderPromo> = [
    { title: 'Mã KM', dataIndex: 'makm', key: 'makm', width: 100 },
    { title: 'Tên chương trình', dataIndex: 'tenchuongtrinh', key: 'tenchuongtrinh' },
    { title: 'Điều kiện', dataIndex: 'dieukien', key: 'dieukien' },
    {
      title: 'Đơn tối thiểu',
      dataIndex: 'minOrderAmount',
      key: 'minOrderAmount',
      width: 130,
      render: (v: number) => `${Number(v ?? 0).toLocaleString('vi-VN')} VND`,
    },
    { title: 'Giảm', dataIndex: 'giampercent', key: 'giampercent', align: 'center', width: 80, render: (v: number) => `${v}%` },
    { title: 'Trạng thái', dataIndex: 'trangthai', key: 'trangthai', render: (v) => <StatusTag v={v} /> },
    {
      title: 'Thao tác', key: 'action', width: 80,
      render: (_, r) => (
        <Button size="small" danger icon={<DeleteOutlined />}
          onClick={() => deletePromo(r.id, r.key)} />
      ),
    },
  ]

  return (
    <AppLayout role={user?.role ?? 'admin'} username={user?.name ?? ''} onLogout={handleLogout}>
      <PageHeader title="Quản lý khuyến mãi" breadcrumbs={[{ label: 'Trang chủ' }, { label: 'Khuyến mãi' }]} />

      <div className={styles.toolbar}>
        <Button type="primary" icon={<PlusOutlined />} className={styles.btnAdd} onClick={() => openModal()}>
          Thêm khuyến mãi
        </Button>
        <Button danger icon={<DeleteOutlined />} disabled={selectedOrder.length === 0}
          onClick={async () => {
            const toDelete = orderPromos.filter((d) => selectedOrder.includes(d.key))
            try {
              await Promise.all(toDelete.filter((d) => d.id).map((d) => promotionService.remove(d.id!)))
              message.success('Đã ẩn')
              setSelectedOrder([])
              fetchData()
            } catch (err: any) {
              message.error(err?.response?.data?.message ?? 'Ẩn thất bại')
            }
          }}>
          Ẩn
        </Button>
      </div>
      <Table
        columns={orderColumns}
        dataSource={orderPromos}
        loading={loading}
        rowSelection={{ selectedRowKeys: selectedOrder, onChange: setSelectedOrder }}
        pagination={{ pageSize: 8, showTotal: (t) => `Tổng ${t} chương trình` }}
        className={styles.table}
      />

      {/* Modal theo đơn */}
      <Modal
        open={modal}
        title="Thêm khuyến mãi theo đơn hàng"
        onOk={handleOk}
        onCancel={() => setModal(false)}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#662C21', borderColor: '#662C21' } }}
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="makm" label="Mã khuyến mãi" rules={[{ required: true, message: 'Nhập mã khuyến mãi' }]}>
            <Input placeholder="VD: KM001" onChange={(e) => form.setFieldValue('makm', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="tenchuongtrinh" label="Tên chương trình" rules={[{ required: true }]}>
            <Input placeholder="VD: Giảm 5% đơn trên 300K" />
          </Form.Item>
          <Form.Item name="dieukien" label="Điều kiện áp dụng" rules={[{ required: true }]}>
            <Input placeholder="VD: Đơn trên 300.000 VND" />
          </Form.Item>
          <Form.Item name="minOrderAmount" label="Giá trị đơn tối thiểu" rules={[{ required: true, message: 'Nhập giá trị tối thiểu' }]}>
            <InputNumber min={0} step={10000} style={{ width: '100%' }} addonAfter="VND" />
          </Form.Item>
          <Form.Item name="giampercent" label="% Giảm" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item name="imageUrl" label="Ảnh banner (tùy chọn)">
            <Input placeholder="URL ảnh hiện ở trang Ưu đãi (Customer)" />
          </Form.Item>
          <Form.Item name="ngaybatdau" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ngayketthuc" label="Ngày kết thúc" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

    </AppLayout>
  )
}

export default Promotions
