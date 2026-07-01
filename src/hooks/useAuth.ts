import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export const useAuth = () => {
  const { user, token, setAuth, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return { user, token, setAuth, handleLogout, isAuthenticated: !!token }
}
