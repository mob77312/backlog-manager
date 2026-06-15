import { type ReactNode } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { LoginPage } from '../../pages/LoginPage'

interface Props {
  children: ReactNode
}

export function AuthGate({ children }: Props) {
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const valid = session && users.some((u) => u.id === session.userId && u.active)
  if (!valid) return <LoginPage />
  return <>{children}</>
}
