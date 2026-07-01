import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DatePicker, Form, Input, InputNumber } from 'antd'
import AppLayout from '../../../components/common/AppLayout'
import { useAuth } from '../../../hooks/useAuth'
import styles from './addExpense.module.css'

interface ExpenseForm {
  maphieuchi: string
  ngaylap: unknown
  nguoinhan: string
  mucdich: string
  sotien: number
  ghichu: string
}

const AddExpense: React.FC = () => {
  const { user, handleLogout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm<ExpenseForm>()

  const handleSubmit = (values: ExpenseForm) => {
    console.log('Phiếu chi:', values)
    navigate('/cashier/finance')
  }

  return (
    <AppLayout role={user?.role ?? 'cashier'} username={user?.name ?? ''} onLogout={handleLogout}>
      <div className={styles.formCard}>
        <div className={styles.formTitle}>Thêm phiếu chi tiền</div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="maphieuchi" label="Mã phiếu chi" initialValue="PC-AUTO">
            <Input disabled />
          </Form.Item>
          <Form.Item name="ngaylap" label="Ngày lập" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nguoinhan" label="Người nhận" rules={[{ required: true, message: 'Vui lòng nhập người nhận' }]}>
            <Input placeholder="Họ tên người nhận" />
          </Form.Item>
          <Form.Item name="mucdich" label="Mục đích chi" rules={[{ required: true, message: 'Vui lòng nhập mục đích' }]}>
            <Input.TextArea rows={3} placeholder="Mục đích chi tiền" />
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
            <Button htmlType="submit" className={styles.btnSubmit}>Lưu phiếu chi</Button>
          </div>
        </Form>
      </div>
    </AppLayout>
  )
}

export default AddExpense
