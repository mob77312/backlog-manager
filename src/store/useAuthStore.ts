import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthSession, Role, User } from '../types'
import { hashPassword, verifyPassword } from '../utils/auth'
import { nowIso, uid } from '../utils/helpers'
import { SEED_USERS } from './authSeed'

interface AuthState {
  users: User[]
  session: AuthSession | null
  loginError: string | null

  login: (email: string, password: string) => boolean
  logout: () => void
  currentUser: () => User | null

  createUser: (data: {
    name: string
    email: string
    password: string
    role: Role
    teamId: string | null
    departmentId?: string | null
    avatarColor?: string
  }) => { ok: true; user: User } | { ok: false; error: string }

  updateUser: (id: string, patch: Partial<Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'createdBy'>>) => void
  resetPassword: (id: string, newPassword: string) => void
  deleteUser: (id: string) => void
  toggleActive: (id: string) => void
}

const DEFAULT_AVATAR_PALETTE = ['#5b6af8', '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#ec4899', '#eab308', '#14b8a6']

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      session: null,
      loginError: null,

      login: (email, password) => {
        const u = get().users.find((x) => x.email.toLowerCase() === email.toLowerCase())
        if (!u) {
          set({ loginError: 'Email tidak ditemukan' })
          return false
        }
        if (!u.active) {
          set({ loginError: 'Akun dinonaktifkan. Hubungi admin.' })
          return false
        }
        if (!verifyPassword(password, u.passwordHash)) {
          set({ loginError: 'Password salah' })
          return false
        }
        set({
          session: { userId: u.id, loggedInAt: nowIso() },
          loginError: null,
          users: get().users.map((x) => (x.id === u.id ? { ...x, lastLoginAt: nowIso() } : x)),
        })
        return true
      },

      logout: () => set({ session: null }),

      currentUser: () => {
        const s = get().session
        if (!s) return null
        return get().users.find((u) => u.id === s.userId) ?? null
      },

      createUser: (data) => {
        const exists = get().users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())
        if (exists) return { ok: false, error: 'Email sudah dipakai' }
        if (data.password.length < 6) return { ok: false, error: 'Password minimal 6 karakter' }
        if (!data.name.trim()) return { ok: false, error: 'Nama wajib diisi' }
        if (!data.email.trim()) return { ok: false, error: 'Email wajib diisi' }
        // Validation of teamId requirement is delegated to the calling modal (which has access to MasterRole config).
        const creator = get().currentUser()
        const user: User = {
          id: uid('usr'),
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          passwordHash: hashPassword(data.password),
          role: data.role,
          teamId: data.teamId,
          departmentId: data.departmentId ?? null,
          avatarColor: data.avatarColor || DEFAULT_AVATAR_PALETTE[get().users.length % DEFAULT_AVATAR_PALETTE.length],
          active: true,
          createdAt: nowIso(),
          createdBy: creator?.id ?? null,
          lastLoginAt: null,
        }
        set({ users: [...get().users, user] })
        return { ok: true, user }
      },

      updateUser: (id, patch) => {
        set({
          users: get().users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  ...patch,
                  teamId: patch.teamId !== undefined ? patch.teamId : u.teamId,
                  departmentId: patch.departmentId !== undefined ? patch.departmentId : u.departmentId,
                }
              : u,
          ),
        })
      },

      resetPassword: (id, newPassword) => {
        set({
          users: get().users.map((u) => (u.id === id ? { ...u, passwordHash: hashPassword(newPassword) } : u)),
        })
      },

      deleteUser: (id) => {
        const s = get().session
        if (s?.userId === id) return
        set({ users: get().users.filter((u) => u.id !== id) })
      },

      toggleActive: (id) => {
        set({ users: get().users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)) })
      },
    }),
    { name: 'flowdesk:auth' },
  ),
)
