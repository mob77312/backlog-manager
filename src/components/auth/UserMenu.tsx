import { useState, useRef, useEffect } from 'react'
import { GitBranch, LogOut, Shield, ShieldCheck, ChevronUp, UserCog, Briefcase, Eraser, ListChecks } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useHandoffStore } from '../../store/useHandoffStore'
import { useDeleteRequestStore } from '../../store/useDeleteRequestStore'
import { useSegmentRequestStore } from '../../store/useSegmentRequestStore'
import { useLogStore } from '../../store/useLogStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Avatar } from '../ui/Avatar'
import { Tooltip } from '../ui/Tooltip'
import { classNames } from '../../utils/helpers'
import toast from 'react-hot-toast'

interface Props {
  collapsed: boolean
}

export function UserMenu({ collapsed }: Props) {
  const { user, role, can } = usePermissions()
  const logout = useAuthStore((s) => s.logout)
  const team = useTeamStore((s) => (user?.teamId ? s.teams.find((t) => t.id === user.teamId) : undefined))
  const openModal = useUIStore((s) => s.openModal)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  const roleColor = role?.color ?? '#64748B'
  const manageAllowed = can('user.manage').allowed
  const canRoles = can('role.manage').allowed
  const canWorkflow = can('workflow.configure').allowed

  const handleLogout = () => {
    logout()
    toast.success('Berhasil keluar')
  }

  const handleResetDemo = () => {
    if (!confirm('Reset semua data demo (proyek + task ke seed, handoff/log dikosongkan)?\n\nDivisi, role, workflow, user, dan akun login TETAP. Lanjut?')) return
    useProjectStore.getState().resetToSeed()
    useTaskStore.getState().resetToSeed()
    useHandoffStore.getState().clearAll()
    useDeleteRequestStore.getState().clearAll()
    useSegmentRequestStore.getState().clearAll()
    useLogStore.getState().clear()
    toast.success('Data demo dimuat ulang dari seed', { icon: '🧹', duration: 4000 })
    setOpen(false)
  }

  if (collapsed) {
    return (
      <Tooltip content={`${user.name} · ${role?.name ?? user.role}`} side="right">
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-black/[0.04]"
        >
          <Avatar name={user.name} size="md" color={user.avatarColor} />
        </button>
      </Tooltip>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={classNames(
          'w-full flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition',
          open ? 'border-border bg-black/[0.04]' : 'hover:bg-black/[0.04] hover:border-border-subtle',
        )}
      >
        <Avatar name={user.name} size="md" color={user.avatarColor} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-ink-primary">{user.name}</div>
          <div className="flex items-center gap-1.5">
            <span
              className="chip border text-[9px]"
              style={{
                backgroundColor: `${roleColor}1a`,
                color: roleColor,
                borderColor: `${roleColor}55`,
              }}
            >
              <ShieldCheck size={9} /> {role?.name ?? user.role}
            </span>
            {team && (
              <span className="text-[10px] font-mono" style={{ color: team.color }}>{team.acronym}</span>
            )}
          </div>
        </div>
        <ChevronUp size={14} className={classNames('text-ink-tertiary transition', open ? '' : 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-lg surface-elevated shadow-modal p-1">
          <div className="px-2.5 py-2 border-b border-border-subtle">
            <div className="text-[12px] font-medium text-ink-primary">{user.name}</div>
            <div className="text-[10px] text-ink-tertiary font-mono truncate">{user.email}</div>
            {team && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: team.color }} />
                <span className="text-ink-secondary">{team.name}</span>
              </div>
            )}
            {user.departmentId && team?.departments?.find((d) => d.id === user.departmentId) && (
              <div className="text-[10px] text-ink-tertiary ml-3 mt-0.5">
                → {team.departments.find((d) => d.id === user.departmentId)?.name}
              </div>
            )}
          </div>

          <MenuItem
            allowed={manageAllowed}
            icon={<UserCog size={13} />}
            label="Kelola User"
            onClick={() => {
              setOpen(false)
              openModal({ type: 'user-management' })
            }}
          />
          <MenuItem
            allowed={canRoles}
            icon={<Shield size={13} />}
            label="Master Role"
            onClick={() => {
              setOpen(false)
              openModal({ type: 'role-management' })
            }}
          />
          <MenuItem
            allowed={canWorkflow}
            icon={<Briefcase size={13} />}
            label="Stage Owners"
            onClick={() => {
              setOpen(false)
              openModal({ type: 'stage-owners' })
            }}
          />
          <MenuItem
            allowed={canWorkflow}
            icon={<GitBranch size={13} />}
            label="Workflow Approval"
            onClick={() => {
              setOpen(false)
              openModal({ type: 'workflow-config' })
            }}
          />
          <MenuItem
            allowed={canWorkflow}
            icon={<ListChecks size={13} />}
            label="Template Approval Project"
            onClick={() => {
              setOpen(false)
              openModal({ type: 'approval-templates' })
            }}
          />
          <MenuItem
            allowed={canWorkflow}
            icon={<Eraser size={13} />}
            label="Reset Data Demo"
            onClick={handleResetDemo}
          />

          <div className="my-1 border-t border-border-subtle" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-pertamina-red hover:bg-pertamina-red-50"
          >
            <LogOut size={13} /> Keluar
          </button>
        </div>
      )}
    </div>
  )
}

function MenuItem({ allowed, icon, label, onClick }: { allowed: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  if (!allowed) {
    return (
      <Tooltip content="Tidak memiliki akses">
        <button disabled className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-ink-tertiary opacity-50 cursor-not-allowed">
          {icon} {label}
        </button>
      </Tooltip>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs text-ink-secondary hover:bg-pertamina-red-50 hover:text-pertamina-red"
    >
      {icon} {label}
    </button>
  )
}
