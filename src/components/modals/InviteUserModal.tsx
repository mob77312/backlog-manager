import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAuthStore } from '../../store/useAuthStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useRoleStore } from '../../store/useRoleStore'
import { useLogStore } from '../../store/useLogStore'
import { rolesAssignableBy, usePermissions } from '../../hooks/usePermissions'
import { roleLabel } from '../../utils/auth'
import type { Role, User } from '../../types'
import { Eye, EyeOff, Shuffle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  userId?: string
}

export function InviteUserModal({ open, onClose, userId }: Props) {
  const target = useAuthStore((s) => (userId ? s.users.find((u) => u.id === userId) : undefined))
  if (!open) return null
  return <UserFormModal key={target?.id ?? 'new'} open={open} onClose={onClose} target={target} />
}

function randomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

interface FormProps {
  open: boolean
  onClose: () => void
  target?: User
}

function UserFormModal({ open, onClose, target }: FormProps) {
  const { role: myRole, can } = usePermissions()
  const allRoles = useRoleStore((s) => s.roles)
  const teams = useTeamStore((s) => s.teams)
  const createUser = useAuthStore((s) => s.createUser)
  const updateUser = useAuthStore((s) => s.updateUser)
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const addLog = useLogStore((s) => s.addLog)
  const me = useAuthStore.getState().currentUser()

  const assignable = useMemo(() => rolesAssignableBy(myRole, allRoles).sort((a, b) => b.rank - a.rank), [myRole, allRoles])
  const defaultRole: Role = target?.role ?? assignable[assignable.length - 1]?.id ?? 'viewer'

  const [name, setName] = useState(target?.name ?? '')
  const [email, setEmail] = useState(target?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(defaultRole)
  const [teamId, setTeamId] = useState<string | null>(
    target?.teamId ?? (myRole?.scopeRestriction !== 'any' ? me?.teamId ?? null : null),
  )
  const [departmentId, setDepartmentId] = useState<string | null>(
    target?.departmentId ?? (myRole?.scopeRestriction === 'own_department' ? me?.departmentId ?? null : null),
  )
  const [active, setActive] = useState<boolean>(target?.active ?? true)
  const [showPwd, setShowPwd] = useState(false)

  const selectedRole = allRoles.find((r) => r.id === role)
  const requiresDivision = selectedRole?.scopeRestriction === 'own_division' || selectedRole?.scopeRestriction === 'own_department'
  const requiresDepartment = selectedRole?.scopeRestriction === 'own_department'

  // Lock scope based on inviter's own scope
  const divisionLocked = myRole?.scopeRestriction !== 'any'
  const departmentLocked = myRole?.scopeRestriction === 'own_department'
  const effectiveTeamId = divisionLocked ? me?.teamId ?? null : teamId
  const effectiveDepartmentId = departmentLocked ? me?.departmentId ?? null : departmentId

  const selectedTeam = teams.find((t) => t.id === effectiveTeamId)
  const availableDepartments = selectedTeam?.departments ?? []

  // Editing existing user: role can only be set within assignable set + target's current role
  const roleOptions = target
    ? assignable.concat(allRoles.filter((r) => r.id === target.role && !assignable.find((a) => a.id === r.id)))
    : assignable

  if (roleOptions.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="text-sm text-ink-secondary">Anda tidak punya hak untuk mengundang/mengubah user.</div>
      </Modal>
    )
  }

  if (target && !can('user.edit', { teamId: target.teamId, departmentId: target.departmentId }).allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="text-sm text-ink-secondary">{can('user.edit', { teamId: target.teamId, departmentId: target.departmentId }).reason}</div>
      </Modal>
    )
  }

  const submit = () => {
    if (!name.trim()) return toast.error('Nama wajib diisi')
    if (!email.trim()) return toast.error('Email wajib diisi')
    if (requiresDivision && !effectiveTeamId) return toast.error(`Role "${selectedRole?.name}" wajib terikat ke divisi`)
    if (requiresDepartment && !effectiveDepartmentId) return toast.error(`Role "${selectedRole?.name}" wajib terikat ke team / departemen`)

    const payloadTeamId = requiresDivision ? effectiveTeamId : null
    const payloadDepartmentId = requiresDepartment ? effectiveDepartmentId : null

    if (target) {
      updateUser(target.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        teamId: payloadTeamId,
        departmentId: payloadDepartmentId,
        active,
      })
      if (password.trim()) {
        if (password.length < 6) return toast.error('Password minimal 6 karakter')
        resetPassword(target.id, password)
        toast.success('Password direset')
      }
      addLog({
        type: 'user_role_changed',
        message: `User ${name} diperbarui (${roleLabel(selectedRole)})`,
        taskId: null,
        taskTitle: null,
        fromTeamId: target.teamId,
        toTeamId: payloadTeamId,
      })
      toast.success('User diperbarui')
      onClose()
      return
    }
    const result = createUser({
      name,
      email,
      password,
      role,
      teamId: payloadTeamId,
      departmentId: payloadDepartmentId,
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    addLog({
      type: 'user_invited',
      message: `${result.user.name} diundang sebagai ${roleLabel(selectedRole)}`,
      taskId: null,
      taskTitle: null,
      fromTeamId: null,
      toTeamId: result.user.teamId ?? null,
    })
    toast.success(`User ${result.user.name} dibuat`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={target ? 'Edit User' : 'Undang User Baru'} size="lg">
      <div className="space-y-3">
        <Input label="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" autoFocus />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@pertamina.id" />

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{target ? 'Reset Password (opsional)' : 'Password Awal'}</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={target ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-tertiary hover:bg-black/[0.05] hover:text-ink-primary"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setPassword(randomPassword())} title="Generate password">
              <Shuffle size={13} /> Acak
            </button>
          </div>
        </div>

        <Select
          label="Role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            // When changing role scope, reset team/department appropriately
            setDepartmentId(null)
          }}
          options={roleOptions.map((r) => ({
            value: r.id,
            label: `${r.name} · ${r.scopeRestriction === 'own_department' ? 'team' : r.scopeRestriction === 'own_division' ? 'divisi' : 'lintas'}`,
          }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={divisionLocked ? 'Divisi (terkunci ke divisi Anda)' : 'Divisi'}
            value={effectiveTeamId ?? ''}
            disabled={!requiresDivision || divisionLocked}
            onChange={(e) => {
              setTeamId(e.target.value || null)
              setDepartmentId(null)
            }}
            options={[
              { value: '', label: requiresDivision ? '— Pilih divisi —' : 'Tidak terikat divisi' },
              ...teams.map((t) => ({ value: t.id, label: `${t.acronym} • ${t.name}` })),
            ]}
          />
          <Select
            label={
              requiresDepartment
                ? departmentLocked
                  ? 'Team (terkunci ke team Anda)'
                  : availableDepartments.length === 0
                    ? 'Team (belum ada team di divisi)'
                    : 'Team / Departemen'
                : 'Team (tidak diperlukan role ini)'
            }
            value={effectiveDepartmentId ?? ''}
            disabled={!requiresDepartment || departmentLocked || availableDepartments.length === 0}
            onChange={(e) => setDepartmentId(e.target.value || null)}
            options={[
              { value: '', label: requiresDepartment ? '— Pilih team —' : '—' },
              ...availableDepartments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>

        {target && (
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-pertamina-red" />
            Akun aktif (uncheck untuk menonaktifkan tanpa menghapus)
          </label>
        )}

        {selectedRole && (
          <div className="rounded-lg border p-3 text-[11px] leading-relaxed" style={{
            backgroundColor: `${selectedRole.color}10`,
            borderColor: `${selectedRole.color}40`,
          }}>
            <div className="font-semibold mb-1" style={{ color: selectedRole.color }}>
              {selectedRole.name} <span className="opacity-70">(rank {selectedRole.rank})</span>
            </div>
            <div className="text-ink-secondary">{selectedRole.description}</div>
            <div className="mt-1 text-[10px] text-ink-tertiary">
              Scope: {selectedRole.scopeRestriction === 'own_department'
                ? 'Hanya team / departemen sendiri'
                : selectedRole.scopeRestriction === 'own_division'
                  ? 'Hanya divisi sendiri'
                  : 'Lintas divisi'}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button className="btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button className="btn-primary" onClick={submit}>
            {target ? 'Simpan Perubahan' : 'Buat User'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
