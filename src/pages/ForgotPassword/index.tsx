import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, message } from 'antd'
import { authService } from '../../services/auth.service'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) { message.warning('Nhập email'); return }
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch {
      // vẫn báo thành công để không lộ email tồn tại
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf7f5' }}>
      <div style={{ width: 380, background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <h2 style={{ color: '#662c21', marginTop: 0 }}>Quên mật khẩu</h2>
        {sent ? (
          <>
            <p style={{ color: '#555' }}>Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục Spam).</p>
            <Link to="/login">← Về đăng nhập</Link>
          </>
        ) : (
          <>
            <p style={{ color: '#555' }}>Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={handleSubmit}
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" block loading={loading} onClick={handleSubmit} style={{ background: '#662c21', borderColor: '#662c21' }}>
              Gửi liên kết
            </Button>
            <div style={{ marginTop: 16, textAlign: 'center' }}><Link to="/login">← Về đăng nhập</Link></div>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
