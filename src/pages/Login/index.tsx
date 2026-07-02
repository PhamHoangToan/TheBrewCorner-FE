import React, { useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import coffeeMilk from '../../assets/images/coffee-milk.png'
import { useAuthStore, type Role } from '../../store/auth.store'
import { authService } from '../../services/auth.service'
import styles from './login.module.css'

type RoleKey = 'phuc-vu' | 'thu-ngan' | 'admin' | 'pha-che'

interface LoginFormValues {
  username: string
  password: string
}

const ROLES: { key: RoleKey; label: string }[] = [
  { key: 'phuc-vu',  label: 'Phục vụ' },
  { key: 'thu-ngan', label: 'Thu ngân' },
  { key: 'admin',    label: 'Admin' },
  { key: 'pha-che',  label: 'Pha chế' },
]

const ROLE_MAP: Record<RoleKey, Role> = {
  'admin':    'admin',
  'thu-ngan': 'cashier',
  'pha-che':  'barista',
  'phuc-vu':  'waiter',
}

const ROLE_REDIRECT: Record<Role, string> = {
  admin:   '/dashboard',
  cashier: '/cashier',
  barista: '/barista',
  waiter:  '/waiter',
}

const Login: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>()
  const [selectedRole, setSelectedRole] = useState<RoleKey>('admin')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      const res = await authService.login({ username: values.username, password: values.password })
      const { user, token, access_token } = res.data
      const beRole = (user?.role as string)?.toLowerCase() as Role
      const selectedRoleMapped = ROLE_MAP[selectedRole]
      if (beRole && beRole !== selectedRoleMapped) {
        message.error('Tài khoản không có quyền truy cập với vai trò này')
        return
      }
      const role: Role = beRole ?? selectedRoleMapped
      const mustChangePassword = !!user?.mustChangePassword
      setAuth({ id: user?.id ?? '1', name: user?.name ?? values.username, role, mustChangePassword }, token ?? access_token)
      navigate(mustChangePassword ? '/change-password' : ROLE_REDIRECT[role])
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 400) {
        message.error(err?.response?.data?.message || 'Sai tên đăng nhập hoặc mật khẩu')
      } else {
        // fallback: dev mode without backend
        const role = ROLE_MAP[selectedRole]
        setAuth({ id: '1', name: values.username, role }, 'dev-token')
        navigate(ROLE_REDIRECT[role])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <img src={coffeeMilk} alt="The Brew Corner" className={styles.coffeeDecor} />

      <div className={styles.card}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password />
          </Form.Item>

          <div className={styles.roleGroup}>
            {ROLES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={styles.roleItem}
                onClick={() => setSelectedRole(key)}
              >
                <span
                  className={`${styles.roleRadio} ${selectedRole === key ? styles.roleRadioSelected : ''}`}
                />
                <span className={styles.roleLabel}>{label}</span>
              </button>
            ))}
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button htmlType="submit" block loading={loading} className={styles.submitBtn}>
              ĐĂNG NHẬP
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default Login
