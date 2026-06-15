import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  ClipboardCheck,
  X,
  Briefcase,
  Settings2,
  GitBranch,
} from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useTaskStore } from '../../store/useTaskStore'
import { Tooltip } from '../ui/Tooltip'
import { classNames } from '../../utils/helpers'
import { UserMenu } from '../auth/UserMenu'
import { usePermissions } from '../../hooks/usePermissions'

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen)
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen)
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)
  const openModal = useUIStore((s) => s.openModal)
  const { can } = usePermissions()
  const teamCreatePerm = can('team.create')

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={classNames(
          'flex h-full shrink-0 flex-col border-r border-border-subtle bg-gradient-to-b from-white to-pertamina-red-50/40',
          // Width: full on mobile, collapse-able on desktop
          'w-[260px]',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[252px]',
          // Mobile: fixed drawer, slide in/out
          'fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-modal' : '-translate-x-full lg:translate-x-0',
          'transition-[transform,width] duration-300 ease-out',
        )}
      >
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle/70 px-4 py-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-pertamina-red to-pertamina-red-dark shadow-glow">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="overflow-hidden"
              >
                <div className="text-sm font-semibold leading-tight text-ink-primary">FlowDesk</div>
                <div className="text-[10px] uppercase tracking-widest text-pertamina-red font-semibold">PGN COM · Backlog</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-ink-primary transition lg:hidden"
          aria-label="Tutup sidebar"
        >
          <X size={16} />
        </button>
        {/* Desktop collapse button */}
        <button
          onClick={toggle}
          className="hidden rounded-md p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-ink-primary transition lg:block"
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="px-3 py-2 space-y-1">
        <NavItem
          collapsed={collapsed}
          active={view === 'project-board'}
          icon={<Briefcase size={16} />}
          label="Board Utama (L0)"
          onClick={() => {
            setView('project-board')
            setMobileOpen(false)
          }}
        />
        <NavItem
          collapsed={collapsed}
          active={view === 'dashboard'}
          icon={<LayoutDashboard size={16} />}
          label="Dashboard"
          onClick={() => {
            setView('dashboard')
            setMobileOpen(false)
          }}
        />
      </nav>

      <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
        {!collapsed && (
          <div className="mt-4 mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Divisi</span>
            {teamCreatePerm.allowed ? (
              <button
                onClick={() => openModal({ type: 'add-team' })}
                className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-ink-primary transition"
                aria-label="Tambah divisi"
              >
                <Plus size={14} />
              </button>
            ) : (
              <Tooltip content={teamCreatePerm.reason ?? 'Tidak diizinkan'}>
                <button disabled className="rounded-md p-1 text-ink-tertiary opacity-40 cursor-not-allowed" aria-label="Tambah divisi">
                  <Plus size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
        <TeamList collapsed={collapsed} />
      </div>

      <div className="border-t border-border-subtle p-3">
        {!collapsed && (
          teamCreatePerm.allowed ? (
            <button
              onClick={() => openModal({ type: 'add-team' })}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
            >
              <Plus size={14} />
              Tambah Divisi
            </button>
          ) : (
            <Tooltip content={teamCreatePerm.reason ?? 'Tidak diizinkan'}>
              <button disabled className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-ink-tertiary opacity-50 cursor-not-allowed">
                <Plus size={14} />
                Tambah Divisi
              </button>
            </Tooltip>
          )
        )}
        <UserMenu collapsed={collapsed} />
      </div>
      </aside>
    </>
  )
}

function NavItem({
  collapsed,
  active,
  icon,
  label,
  onClick,
}: {
  collapsed: boolean
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  const button = (
    <button
      onClick={onClick}
      className={classNames(
        'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition',
        active
          ? 'bg-pertamina-red-50 text-pertamina-red border border-pertamina-red/20'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.04] border border-transparent',
      )}
    >
      <span
        className={classNames(
          'grid h-7 w-7 place-items-center rounded-md',
          active ? 'bg-pertamina-red/15 text-pertamina-red' : 'text-ink-secondary',
        )}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-pertamina-red shadow-glow" />}
    </button>
  )
  if (collapsed)
    return (
      <Tooltip content={label} side="right">
        {button}
      </Tooltip>
    )
  return button
}

function TeamList({ collapsed }: { collapsed: boolean }) {
  const teams = useTeamStore((s) => s.teams)
  const tasks = useTaskStore((s) => s.tasks)
  const sidebarTeamFilter = useUIStore((s) => s.sidebarTeamFilter)
  const setSidebarTeamFilter = useUIStore((s) => s.setSidebarTeamFilter)
  const openModal = useUIStore((s) => s.openModal)

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      if (t.status !== 'done') map[t.teamId] = (map[t.teamId] ?? 0) + 1
    }
    return map
  }, [tasks])

  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      if (t.departmentId) map[t.departmentId] = (map[t.departmentId] ?? 0) + 1
    }
    return map
  }, [tasks])

  return (
    <div className="space-y-1">
      {teams.map((team) => {
        const active = sidebarTeamFilter === team.id
        const row = (
          <TeamRow
            key={team.id}
            collapsed={collapsed}
            teamId={team.id}
            color={team.color}
            name={team.name}
            acronym={team.acronym}
            count={counts[team.id] ?? 0}
            active={active}
            description={team.description}
            members={team.memberCount}
            onClick={() => setSidebarTeamFilter(active ? null : team.id)}
            onEdit={() => openModal({ type: 'edit-team', teamId: team.id })}
            onDelete={() => openModal({ type: 'delete-team', teamId: team.id })}
          />
        )
        if (collapsed) {
          return (
            <Tooltip key={team.id} content={`${team.name} • ${counts[team.id] ?? 0} aktif`} side="right">
              {row}
            </Tooltip>
          )
        }
        return (
          <div key={team.id}>
            {row}
            <AnimatePresence initial={false}>
              {active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <DepartmentList team={team} deptCounts={deptCounts} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

function DepartmentList({
  team,
  deptCounts,
}: {
  team: import('../../types').Team
  deptCounts: Record<string, number>
}) {
  const openModal = useUIStore((s) => s.openModal)
  const { role, can } = usePermissions()
  const departments = team.departments ?? []
  const editPerm = can('team.edit', { teamId: team.id })
  const canOpenManage = editPerm.allowed
  const isSuper = role?.id === 'super_admin'

  return (
    <div className="ml-3 mt-1 mb-1 border-l border-dashed border-border-subtle pl-2.5 space-y-0.5">
      {departments.length === 0 ? (
        <div className="rounded px-2 py-1.5 text-[10px] italic text-ink-tertiary">
          Belum ada team di divisi ini
        </div>
      ) : (
        departments.map((d) => {
          const count = deptCounts[d.id] ?? 0
          return (
            <div
              key={d.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-black/[0.03]"
              title={d.description || d.name}
            >
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: team.color }} />
              <span className="flex-1 text-[11px] text-ink-secondary truncate">{d.name}</span>
              <span className="text-[9px] text-ink-tertiary tabular-nums">{count}</span>
            </div>
          )
        })
      )}

      {canOpenManage && (
        <button
          onClick={() => openModal({ type: 'edit-team', teamId: team.id })}
          className="mt-1 flex w-full items-center gap-1.5 rounded-md border border-dashed border-border-subtle bg-white px-2 py-1 text-[10px] text-ink-tertiary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
        >
          <Plus size={10} />
          {isSuper ? 'Tambah / Kelola Team' : 'Lihat / Kelola Divisi'}
        </button>
      )}
    </div>
  )
}

function TeamRow({
  collapsed,
  teamId,
  color,
  name,
  acronym,
  count,
  active,
  description,
  members,
  onClick,
  onEdit,
  onDelete,
}: {
  collapsed: boolean
  teamId: string
  color: string
  name: string
  acronym: string
  count: number
  active: boolean
  description: string
  members: number
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const openModal = useUIStore((s) => s.openModal)
  const { can } = usePermissions()
  const editPerm = can('team.edit', { teamId })
  const deletePerm = can('team.delete', { teamId })
  const requirementsPerm = can('team.editHandoffRequirements', { teamId })
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={classNames(
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition border',
          active
            ? 'bg-black/[0.04] text-ink-primary border-border'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03] border-transparent',
        )}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
        />
        {collapsed ? (
          <span className="font-mono text-[10px] font-bold tracking-wide" style={{ color }}>
            {acronym}
          </span>
        ) : (
          <>
            <span className="truncate flex-1 text-left">{name}</span>
            <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
              {count}
            </span>
          </>
        )}
      </button>
      {!collapsed && (
        <button
          className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-ink-tertiary opacity-0 group-hover:opacity-100 hover:bg-black/[0.06] hover:text-ink-primary transition"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
        >
          <MoreHorizontal size={12} />
        </button>
      )}
      {menuOpen && !collapsed && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-9 z-40 w-44 rounded-lg surface-elevated p-1 shadow-modal">
            <div className="px-2 py-2 text-[11px] text-ink-tertiary border-b border-border-subtle mb-1">
              <div className="text-ink-primary font-medium truncate">{name}</div>
              <div className="truncate">{description}</div>
              <div className="mt-1 flex items-center gap-1 text-ink-tertiary">
                <Users size={10} /> {members} anggota
              </div>
            </div>
            {editPerm.allowed ? (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-secondary hover:bg-black/[0.04] hover:text-ink-primary"
              >
                <Pencil size={12} /> Edit Divisi
              </button>
            ) : (
              <Tooltip content={editPerm.reason ?? ''}>
                <button disabled className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-tertiary opacity-50 cursor-not-allowed">
                  <Pencil size={12} /> Edit Divisi
                </button>
              </Tooltip>
            )}
            {requirementsPerm.allowed ? (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  openModal({ type: 'handoff-requirements', teamId })
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-secondary hover:bg-black/[0.04] hover:text-ink-primary"
              >
                <ClipboardCheck size={12} /> Syarat Handoff
              </button>
            ) : (
              <Tooltip content={requirementsPerm.reason ?? ''}>
                <button disabled className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-tertiary opacity-50 cursor-not-allowed">
                  <ClipboardCheck size={12} /> Syarat Handoff
                </button>
              </Tooltip>
            )}
            <button
              onClick={() => {
                setMenuOpen(false)
                openModal({ type: 'kanban-config', teamId })
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-secondary hover:bg-black/[0.04] hover:text-ink-primary"
            >
              <Settings2 size={12} /> Atur Kolom Kanban
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                openModal({ type: 'division-workflow', teamId })
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-secondary hover:bg-black/[0.04] hover:text-ink-primary"
            >
              <GitBranch size={12} /> Alur Approval Divisi
            </button>
            {deletePerm.allowed ? (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-pertamina-red hover:bg-pertamina-red-50"
              >
                <Trash2 size={12} /> Hapus Divisi
              </button>
            ) : (
              <Tooltip content={deletePerm.reason ?? ''}>
                <button disabled className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-tertiary opacity-50 cursor-not-allowed">
                  <Trash2 size={12} /> Hapus Divisi
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}
    </div>
  )
}

