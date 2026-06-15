import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useRoleStore } from '../../store/useRoleStore'
import { useAuthStore } from '../../store/useAuthStore'
import { usePermissions } from '../../hooks/usePermissions'
import { TEAM_COLOR_PALETTE } from '../../utils/colors'
import { classNames } from '../../utils/helpers'
import { Plus, Pencil, Trash2, Shield, ShieldAlert, ShieldCheck, Lock } from 'lucide-react'
import type { MasterRole, RolePermissions, ScopeRestriction } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
}

const PERMISSION_GROUPS: Array<{ title: string; items: Array<{ key: keyof RolePermissions; label: string }> }> = [
  {
    title: 'Tugas / Backlog',
    items: [
      { key: 'canCreateTask', label: 'Membuat tugas' },
      { key: 'canEditTask', label: 'Mengedit tugas' },
      { key: 'canMoveTask', label: 'Memindah tugas (drag)' },
      { key: 'canDeleteTask', label: 'Menghapus tugas' },
      { key: 'canHandoffTask', label: 'Mengajukan handoff' },
      { key: 'canCommentTask', label: 'Berkomentar' },
    ],
  },
  {
    title: 'Divisi & Team',
    items: [
      { key: 'canCreateDivision', label: 'Menambah divisi' },
      { key: 'canEditDivision', label: 'Mengedit divisi' },
      { key: 'canDeleteDivision', label: 'Menghapus divisi' },
      { key: 'canManageDivisionTeams', label: 'Kelola team di divisi' },
      { key: 'canEditHandoffRequirements', label: 'Atur syarat handoff' },
    ],
  },
  {
    title: 'User',
    items: [
      { key: 'canManageUsers', label: 'Buka panel user' },
      { key: 'canInviteUsers', label: 'Undang user baru' },
      { key: 'canDeleteUsers', label: 'Hapus user' },
      { key: 'canChangeUserRoles', label: 'Ubah role user' },
    ],
  },
  {
    title: 'Konfigurasi Sistem',
    items: [
      { key: 'canManageRoles', label: 'Kelola master role' },
      { key: 'canConfigureWorkflow', label: 'Atur workflow approval' },
    ],
  },
  {
    title: 'Approval / Workflow',
    items: [
      { key: 'canApproveHandoff', label: 'Menjadi approver handoff' },
      { key: 'canApproveSegmentChange', label: 'Setujui perubahan kolom kanban' },
    ],
  },
  {
    title: 'Project (Board Utama L0)',
    items: [
      { key: 'canCreateProject', label: 'Membuat project' },
      { key: 'canEditProject', label: 'Mengedit project' },
      { key: 'canDeleteProject', label: 'Menghapus project' },
      { key: 'canAdvanceProjectStage', label: 'Memindah stage (advance)' },
      { key: 'canEditProjectWeights', label: 'Mengubah bobot stage' },
      { key: 'canCloseProject', label: 'Menutup project' },
    ],
  },
  {
    title: 'Kanban Custom (Segment Change)',
    items: [
      { key: 'canRequestSegmentChange', label: 'Ajukan tambah/hapus kolom' },
    ],
  },
]

export function MasterRoleModal({ open, onClose }: Props) {
  const { can } = usePermissions()
  if (!open) return null
  const perm = can('role.manage')
  if (!perm.allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="flex items-start gap-2 rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 text-sm text-ink-primary">
          <ShieldAlert size={16} className="mt-0.5 text-pertamina-red" />
          <div>{perm.reason}</div>
        </div>
      </Modal>
    )
  }
  return <Inner open={open} onClose={onClose} />
}

function Inner({ open, onClose }: Props) {
  const roles = useRoleStore((s) => s.roles)
  const users = useAuthStore((s) => s.users)
  const [selectedId, setSelectedId] = useState<string>(roles[0]?.id ?? '')
  const sorted = [...roles].sort((a, b) => b.rank - a.rank)
  const selected = roles.find((r) => r.id === selectedId) ?? sorted[0]

  return (
    <Modal open={open} onClose={onClose} title="Master Role" description="Kelola role, hierarki, dan permission" size="3xl">
      <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-4 min-h-0">
        {/* Left: role list */}
        <div className="flex flex-col gap-2 min-w-0">
          <NewRoleButton onCreated={(id) => setSelectedId(id)} />
          {sorted.map((r) => {
            const userCount = users.filter((u) => u.role === r.id).length
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={classNames(
                  'group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition',
                  selected?.id === r.id ? 'border-pertamina-red/40 bg-pertamina-red-50/60' : 'border-border-subtle bg-white hover:bg-black/[0.03]',
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-ink-primary truncate">{r.name}</span>
                    {r.isSystem && (
                      <span title="Role sistem">
                        <Lock size={9} className="text-ink-tertiary" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-ink-tertiary flex items-center gap-1.5">
                    <span>rank {r.rank}</span>
                    <span>·</span>
                    <span>{userCount} user</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: detail */}
        <div className="min-w-0">
          {selected ? <RoleEditor key={selected.id} role={selected} onDeleted={() => setSelectedId(sorted[0]?.id ?? '')} /> : <div className="text-center text-ink-tertiary text-sm py-12">Pilih role di kiri atau buat baru.</div>}
        </div>
      </div>
    </Modal>
  )
}

function NewRoleButton({ onCreated }: { onCreated: (id: string) => void }) {
  const createRole = useRoleStore((s) => s.createRole)
  return (
    <button
      onClick={() => {
        const created = createRole({
          name: 'Role Baru',
          description: 'Deskripsikan tanggung jawab role ini...',
          color: TEAM_COLOR_PALETTE[Math.floor(Math.random() * TEAM_COLOR_PALETTE.length)],
          rank: 50,
          scopeRestriction: 'own_division',
          permissions: {
            canCreateTask: true,
            canEditTask: true,
            canDeleteTask: false,
            canMoveTask: true,
            canHandoffTask: true,
            canCommentTask: true,
            canCreateDivision: false,
            canEditDivision: false,
            canDeleteDivision: false,
            canManageDivisionTeams: false,
            canEditHandoffRequirements: false,
            canManageUsers: false,
            canInviteUsers: false,
            canDeleteUsers: false,
            canChangeUserRoles: false,
            canManageRoles: false,
            canConfigureWorkflow: false,
            canApproveHandoff: false,
            canCreateProject: false,
            canEditProject: false,
            canDeleteProject: false,
            canAdvanceProjectStage: false,
            canEditProjectWeights: false,
            canCloseProject: false,
            canRequestSegmentChange: false,
            canApproveSegmentChange: false,
          },
        })
        onCreated(created.id)
        toast.success(`Role "${created.name}" dibuat — edit di kanan`)
      }}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-pertamina-red/40 bg-pertamina-red-50 px-2.5 py-2 text-[12px] font-medium text-pertamina-red hover:bg-pertamina-red-100 transition"
    >
      <Plus size={13} /> Tambah Role Baru
    </button>
  )
}

function RoleEditor({ role, onDeleted }: { role: MasterRole; onDeleted: () => void }) {
  const updateRole = useRoleStore((s) => s.updateRole)
  const updatePermissions = useRoleStore((s) => s.updatePermissions)
  const deleteRole = useRoleStore((s) => s.deleteRole)
  const users = useAuthStore((s) => s.users)
  const [confirmDel, setConfirmDel] = useState(false)
  const userCount = users.filter((u) => u.role === role.id).length

  const isLocked = role.isSystem && role.id === 'super_admin'

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: role.color, boxShadow: `0 0 8px ${role.color}80` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink-primary truncate">{role.name}</h3>
              {role.isSystem && (
                <span className="chip bg-slate-100 text-slate-700 border border-slate-200">
                  <Lock size={9} /> Sistem
                </span>
              )}
            </div>
            <div className="text-[11px] text-ink-tertiary">Rank {role.rank} · {userCount} user pakai role ini</div>
          </div>
        </div>
        {!role.isSystem && (
          <button
            onClick={() => {
              if (userCount > 0 && !confirmDel) return toast.error(`${userCount} user masih pakai role ini`)
              if (confirmDel) {
                const r = deleteRole(role.id)
                if (!r.ok) return toast.error(r.error ?? 'Gagal')
                toast.success(`Role "${role.name}" dihapus`)
                onDeleted()
                setConfirmDel(false)
              } else {
                setConfirmDel(true)
                setTimeout(() => setConfirmDel(false), 3000)
              }
            }}
            className={classNames(
              'rounded-md p-1.5 hover:bg-pertamina-red-50 hover:text-pertamina-red',
              confirmDel ? 'bg-pertamina-red-50 text-pertamina-red' : 'text-ink-tertiary',
            )}
            title={confirmDel ? 'Klik lagi untuk konfirmasi' : 'Hapus role'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nama Role"
          value={role.name}
          disabled={role.isSystem}
          onChange={(e) => updateRole(role.id, { name: e.target.value })}
        />
        <Input
          label="Rank (hierarki)"
          type="number"
          min={1}
          max={100}
          value={role.rank}
          disabled={isLocked}
          onChange={(e) => updateRole(role.id, { rank: Math.max(1, Math.min(100, parseInt(e.target.value || '0', 10))) })}
          hint="Lebih tinggi = lebih senior. Super Admin = 100."
        />
      </div>

      <Textarea
        label="Deskripsi"
        value={role.description}
        disabled={role.isSystem}
        onChange={(e) => updateRole(role.id, { description: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Warna Badge</span>
          <div className="flex flex-wrap gap-1.5">
            {TEAM_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => updateRole(role.id, { color: c })}
                disabled={isLocked}
                className={classNames(
                  'h-6 w-6 rounded-full border-2 transition',
                  role.color === c ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100',
                  isLocked && 'opacity-50 cursor-not-allowed',
                )}
                style={{ backgroundColor: c, boxShadow: role.color === c ? `0 0 10px ${c}80` : undefined }}
              />
            ))}
          </div>
        </div>
        <Select
          label="Ruang Lingkup"
          value={role.scopeRestriction}
          disabled={isLocked}
          onChange={(e) => updateRole(role.id, { scopeRestriction: e.target.value as ScopeRestriction })}
          options={[
            { value: 'any', label: 'Lintas Divisi (any)' },
            { value: 'own_division', label: 'Divisi Sendiri (Kadiv-level)' },
            { value: 'own_department', label: 'Team / Departemen Sendiri (Kadep-level)' },
          ]}
        />
      </div>

      {/* Permission matrix */}
      <div className="rounded-lg border border-border-subtle bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <Shield size={13} className="text-pertamina-red" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-primary">Permission</span>
          {isLocked && (
            <span className="ml-auto text-[10px] text-ink-tertiary italic flex items-center gap-1">
              <Lock size={10} /> Super Admin terkunci penuh
            </span>
          )}
        </div>
        <div className="space-y-3">
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1.5">{g.title}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {g.items.map((item) => {
                  const checked = !!role.permissions[item.key]
                  return (
                    <label
                      key={item.key}
                      className={classNames(
                        'flex items-center gap-2 rounded-md border px-2 py-1.5 text-[12px] cursor-pointer',
                        checked ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-border-subtle bg-white text-ink-secondary',
                        isLocked && 'opacity-70 cursor-not-allowed',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isLocked}
                        onChange={(e) => updatePermissions(role.id, { [item.key]: e.target.checked } as Partial<RolePermissions>)}
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                      <span className="flex-1">{item.label}</span>
                      {checked && <ShieldCheck size={11} className="text-emerald-600" />}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// shim to keep Pencil import used
void Pencil
