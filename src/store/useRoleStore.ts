import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MasterRole, RolePermissions } from '../types'
import { uid } from '../utils/helpers'
import { SEED_ROLES } from './roleSeed'

interface RoleState {
  roles: MasterRole[]
  getRole: (id: string | null | undefined) => MasterRole | undefined
  createRole: (data: Omit<MasterRole, 'id' | 'isSystem'>) => MasterRole
  updateRole: (id: string, patch: Partial<Omit<MasterRole, 'id' | 'isSystem'>>) => void
  deleteRole: (id: string) => { ok: boolean; error?: string }
  updatePermissions: (id: string, patch: Partial<RolePermissions>) => void
  ensureSystemRoles: () => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      roles: SEED_ROLES,
      getRole: (id) => (id ? get().roles.find((r) => r.id === id) : undefined),
      createRole: (data) => {
        const role: MasterRole = {
          ...data,
          id: uid('role'),
          isSystem: false,
        }
        set((s) => ({ roles: [...s.roles, role] }))
        return role
      },
      updateRole: (id, patch) => {
        set((s) => ({
          roles: s.roles.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  permissions: r.isSystem && r.id === 'super_admin' ? r.permissions : { ...r.permissions, ...(patch.permissions ?? {}) },
                }
              : r,
          ),
        }))
      },
      deleteRole: (id) => {
        const role = get().roles.find((r) => r.id === id)
        if (!role) return { ok: false, error: 'Role tidak ditemukan' }
        if (role.isSystem) return { ok: false, error: 'Role sistem tidak dapat dihapus' }
        set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }))
        return { ok: true }
      },
      updatePermissions: (id, patch) => {
        set((s) => ({
          roles: s.roles.map((r) =>
            r.id === id
              ? r.isSystem && r.id === 'super_admin'
                ? r
                : { ...r, permissions: { ...r.permissions, ...patch } }
              : r,
          ),
        }))
      },
      ensureSystemRoles: () => {
        const existing = new Set(get().roles.map((r) => r.id))
        const missing = SEED_ROLES.filter((r) => !existing.has(r.id))
        if (missing.length > 0) {
          set((s) => ({ roles: [...s.roles, ...missing] }))
        }
      },
    }),
    {
      name: 'flowdesk:roles',
      onRehydrateStorage: () => (state) => {
        // Ensure new system roles are added when seed is updated
        state?.ensureSystemRoles()
      },
    },
  ),
)
