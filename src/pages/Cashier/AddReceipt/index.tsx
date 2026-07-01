import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DatePicker, Form, Input, InputNumber } from 'antd'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import styles from './addReceipt.module.css'

interface ReceiptForm {
  maphieuthu: string
  ngaylap: unknown
  nguoinop: string
  noidung: string
  sotien: number
  ghichu: string
}

const AddReceipt: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm<ReceiptForm>()

  const handleSubmit = (values: ReceiptForm) => {
    console.log('Phiếu thu:', values)
    navigate('/cashier/finance')
  }

  return (
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.formCard}>
        <div className={styles.formTitle}>Thêm phiếu thu tiền</div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="maphieuthu" label="Mã phiếu thu" initialValue="PT-AUTO">
            <Input disabled />
          </Form.Item>
          <Form.Item name="ngaylap" label="Ngày lập" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nguoinop" label="Người nộp" rules={[{ required: true, message: 'Vui lòng nhập người nộp' }]}>
            <Input placeholder="Họ tên người nộp" />
          </Form.Item>
          <Form.Item name="noidung" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
            <Input.TextArea rows={3} placeholder="Nội dung thu tiền" />
          </Form.Item>
          <Form.Item name="sotien" label="Số tiền (VND)" rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="ghichu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm (nếu có)" />
          </Form.Item>

          <div className={styles.actions}>
            <Button className={styles.btnCancel} onClick={() => navigate(-1)}>Hủy</Button>
            <Button htmlType="submit" className={styles.btnSubmit}>Lưu phiếu thu</Button>
          </div>
        </Form>
      </div>
    </AppLayout>
  )
}

export default AddReceipt
