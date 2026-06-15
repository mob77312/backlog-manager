import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useAuthStore } from '../../store/useAuthStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useRoleStore } from '../../store/useRoleStore'
import { useLogStore } from '../../store/useLogStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Avatar } from '../ui/Avatar'
import { Pencil, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { classNames, relativeTime } from '../../utils/helpers'
import { Tooltip } from '../ui/Tooltip'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function UserManagementModal({ open, onClose }: Props) {
  const { user: me, role: myRole, can } = usePermissions()
  const users = useAuthStore((s) => s.users)
  const allRoles = useRoleStore((s) => s.roles)
  const deleteUser = useAuthStore((s) => s.deleteUser)
  const toggleActive = useAuthStore((s) => s.toggleActive)
  const teams = useTeamStore((s) => s.teams)
  const addLog = useLogStore((s) => s.addLog)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const scopeOwnDivision = myRole?.scopeRestriction === 'own_division'

  const visible = useMemo(() => {
    return users
      .filter((u) => {
        if (scopeOwnDivision) return u.teamId === me?.teamId || u.id === me?.id
        return true
      })
      .filter((u) => roleFilter === 'all' || u.role === roleFilter)
      .filter((u) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, me, scopeOwnDivision, roleFilter, search])

  const sortedRoles = useMemo(() => [...allRoles].sort((a, b) => b.rank - a.rank), [allRoles])

  const teamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? '-' : '—')
  const teamAcronym = (id: string | null) => (id ? teams.find((t) => t.id === id)?.acronym ?? '-' : '—')
  const teamColor = (id: string | null) => (id ? teams.find((t) => t.id === id)?.color ?? '#94a3b8' : '#94a3b8')

  const canInvite = can('user.invite').allowed

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kelola User"
      description={scopeOwnDivision ? `Anggota divisi ${teams.find((t) => t.id === me?.teamId)?.name ?? ''}` : 'Semua pengguna FlowDesk'}
      size="xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="input-base w-full sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setRoleFilter('all')}
              className={classNames(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
                roleFilter === 'all'
                  ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red'
                  : 'border-border bg-white text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03]',
              )}
            >
              Semua
            </button>
            {sortedRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className="rounded-full border px-2 py-0.5 text-[11px] font-medium transition"
                style={
                  roleFilter === r.id
                    ? { borderColor: `${r.color}88`, backgroundColor: `${r.color}15`, color: r.color }
                    : undefined
                }
              >
                {r.name}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-ink-tertiary">{visible.length} user</span>
          {canInvite ? (
            <button className="btn-primary" onClick={() => openModal({ type: 'invite-user' })}>
              <Plus size={13} /> Undang User
            </button>
          ) : (
            <Tooltip content="Tidak memiliki akses">
              <button className="btn-primary opacity-50 cursor-not-allowed" disabled>
                <Plus size={13} /> Undang User
              </button>
            </Tooltip>
          )}
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-xl border border-border-subtle bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-white border-b border-border-subtle text-[10px] uppercase tracking-widest text-ink-tertiary">
              <tr>
                <th className="text-left p-2.5">Nama</th>
                <th className="text-left p-2.5">Role</th>
                <th className="text-left p-2.5">Divisi</th>
                <th className="text-left p-2.5">Status</th>
                <th className="text-left p-2.5">Login Terakhir</th>
                <th className="text-right p-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[12px] text-ink-tertiary">
                    Tidak ada user
                  </td>
                </tr>
              )}
              {visible.map((u) => {
                const userRole = allRoles.find((r) => r.id === u.role)
                const editPerm = can('user.edit', { teamId: u.teamId })
                const deletePerm = can('user.delete', { teamId: u.teamId })
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-pertamina-red-50/30">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} size="md" color={u.avatarColor} />
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-ink-primary truncate flex items-center gap-1.5">
                            {u.name}
                            {isMe && <span className="chip bg-pertamina-red-50 text-pertamina-red border border-pertamina-red/30">Anda</span>}
                          </div>
                          <div className="text-[11px] text-ink-tertiary truncate font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span
                        className="chip border"
                        style={{
                          backgroundColor: `${userRole?.color ?? '#94a3b8'}1a`,
                          color: userRole?.color ?? '#475569',
                          borderColor: `${userRole?.color ?? '#94a3b8'}55`,
                        }}
                      >
                        <ShieldCheck size={10} />
                        {userRole?.name ?? u.role}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {u.teamId ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 text-[12px]">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: teamColor(u.teamId) }} />
                            <span className="font-mono text-[10px]" style={{ color: teamColor(u.teamId) }}>{teamAcronym(u.teamId)}</span>
                            <span className="text-ink-secondary">{teamName(u.teamId)}</span>
                          </span>
                          {u.departmentId && (() => {
                            const t = teams.find((x) => x.id === u.teamId)
                            const d = t?.departments?.find((x) => x.id === u.departmentId)
                            return d ? (
                              <span className="text-[10px] text-ink-tertiary pl-3.5">→ {d.name}</span>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <button
                        onClick={() => {
                          if (isMe) return toast.error('Tidak bisa menonaktifkan akun sendiri')
                          if (!editPerm.allowed) return toast.error(editPerm.reason || 'Tidak diizinkan')
                          toggleActive(u.id)
                        }}
                        className={classNames(
                          'chip border',
                          u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
                          !editPerm.allowed && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        {u.active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="p-2.5 text-[11px] text-ink-tertiary">
                      {u.lastLoginAt ? relativeTime(u.lastLoginAt) : '—'}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {editPerm.allowed ? (
                          <button
                            onClick={() => openModal({ type: 'invite-user', userId: u.id })}
                            className="rounded-md p-1.5 text-ink-secondary hover:bg-pertamina-red-50 hover:text-pertamina-red"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                        ) : (
                          <Tooltip content={editPerm.reason ?? ''}>
                            <button disabled className="rounded-md p-1.5 text-ink-tertiary opacity-50 cursor-not-allowed">
                              <Pencil size={13} />
                            </button>
                          </Tooltip>
                        )}
                        {isMe ? (
                          <Tooltip content="Tidak bisa menghapus akun sendiri">
                            <button disabled className="rounded-md p-1.5 text-ink-tertiary opacity-50 cursor-not-allowed">
                              <Trash2 size={13} />
                            </button>
                          </Tooltip>
                        ) : deletePerm.allowed ? (
                          <button
                            onClick={() => {
                              if (confirmDelete === u.id) {
                                deleteUser(u.id)
                                addLog({
                                  type: 'user_removed',
                                  message: `User ${u.name} dihapus`,
                                  taskId: null,
                                  taskTitle: null,
                                  fromTeamId: u.teamId,
                                  toTeamId: null,
                                })
                                toast.success(`User ${u.name} dihapus`)
                                setConfirmDelete(null)
                              } else {
                                setConfirmDelete(u.id)
                                setTimeout(() => setConfirmDelete(null), 3000)
                              }
                            }}
                            className={classNames(
                              'rounded-md p-1.5 hover:bg-pertamina-red-50 hover:text-pertamina-red',
                              confirmDelete === u.id ? 'bg-pertamina-red-50 text-pertamina-red' : 'text-ink-secondary',
                            )}
                            title={confirmDelete === u.id ? 'Klik lagi untuk konfirmasi' : 'Hapus'}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <Tooltip content={deletePerm.reason ?? ''}>
                            <button disabled className="rounded-md p-1.5 text-ink-tertiary opacity-50 cursor-not-allowed">
                              <Trash2 size={13} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-ink-tertiary">
          <UserCog size={12} />
          {scopeOwnDivision
            ? 'Role Anda dibatasi ke divisi sendiri.'
            : 'Anda dapat mengelola user di seluruh divisi.'}
        </div>
      </div>
    </Modal>
  )
}
