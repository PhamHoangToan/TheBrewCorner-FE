import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth.store'
import { SocketContext, createSocket } from '../hooks/useSocket'

const PrivateRoute: React.FC = () => {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.user?.role)
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword)
  const location = useLocation()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!token || !role) return
    const s = createSocket(role)
    setSocket(s)
    return () => {
      s.disconnect()
      setSocket(null)
    }
  }, [token, role])

  if (!token) return <Navigate to="/login" replace />

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return (
    <SocketContext.Provider value={socket}>
      <Outlet />
    </SocketContext.Provider>
  )
}

export default PrivateRoute
