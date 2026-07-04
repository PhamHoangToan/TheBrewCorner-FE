import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input, message } from 'antd'
import { authService } from '../../services/auth.service'

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (password.length < 6) { message.warning('Mật khẩu phải có ít nhất 6 ký tự'); return }
    if (password !== confirm) { message.warning('Mật khẩu nhập lại không khớp'); return }
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      message.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.')
      navigate('/login')
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Liên kết không hợp lệ hoặc đã hết hạn')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf7f5' }}>
      <div style={{ width: 380, background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <h2 style={{ color: '#662c21', marginTop: 0 }}>Đặt lại mật khẩu</h2>
        {!token ? (
          <>
            <p style={{ color: '#b91c1c' }}>Liên kết không hợp lệ.</p>
            <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
          </>
        ) : (
          <>
            <Input.Password placeholder="Mật khẩu mới" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 12 }} />
            <Input.Password placeholder="Nhập lại mật khẩu" value={confirm} onChange={(e) => setConfirm(e.target.value)} onPressEnter={handleSubmit} style={{ marginBottom: 16 }} />
            <Button type="primary" block loading={loading} onClick={handleSubmit} style={{ background: '#662c21', borderColor: '#662c21' }}>
              Đặt lại mật khẩu
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
