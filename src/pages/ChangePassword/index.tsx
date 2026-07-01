import React, { useState } from 'react'
import { Button, Form, Input, message, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { userService } from '../../services/user.service'
import loginStyles from '../Login/login.module.css'

const { Text } = Typography

interface FormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/dashboard',
  cashier: '/cashier',
  barista: '/barista',
  waiter: '/waiter',
}

const ChangePassword: React.FC = () => {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword)
  const navigate = useNavigate()

  const handleSubmit = async (values: FormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Xác nhận mật khẩu không khớp')
      return
    }
    if (!user?.id) return
    setLoading(true)
    try {
      await userService.changePassword(user.id, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      message.success('Đổi mật khẩu thành công')
      setMustChangePassword(false)
      navigate(ROLE_REDIRECT[user.role] ?? '/dashboard')
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Mật khẩu hiện tại không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={loginStyles.page}>
      <div className={loginStyles.card}>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>Đổi mật khẩu</Typography.Title>
        <Text type="secondary">
          Đây là lần đăng nhập đầu tiên. Vui lòng đặt mật khẩu mới trước khi tiếp tục sử dụng hệ thống.
        </Text>

        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 24 }}>
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại (đã gửi qua email)"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button htmlType="submit" block loading={loading} className={loginStyles.submitBtn}>
              ĐỔI MẬT KHẨU
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default ChangePassword
