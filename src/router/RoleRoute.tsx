import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import type { Role } from '../store/auth.store'

interface Props {
  roles: Role[]
  children: React.ReactNode
}

const RoleRoute: React.FC<Props> = ({ roles, children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default RoleRoute
