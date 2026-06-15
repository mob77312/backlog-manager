import { useEffect, useRef, useState } from 'react'
import { Search, Plus, Bell, Filter, X, Activity, Keyboard, Inbox, Menu, SlidersHorizontal } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { useTeamStore } from '../../store/useTeamStore'
import { Button } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../utils/colors'
import { classNames } from '../../utils/helpers'
import { usePermissions } from '../../hooks/usePermissions'
import { useApprovalQueue } from '../../hooks/useApprovalQueue'
import type { Priority, Status } from '../../types'

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const STATUSES: Status[] = ['backlog', 'in_progress', 'review', 'done', 'cancel']

const VIEW_META: Record<'project-board' | 'board' | 'dashboard', { title: string; subtitle: string }> = {
  'project-board': { title: 'Board Utama (L0)', subtitle: 'Pipeline project lintas divisi - Lead to Close' },
  board: { title: 'Board Divisi', subtitle: 'Eksekusi task per divisi sampai Selesai' },
  dashboard: { title: 'Dashboard Analytics', subtitle: 'Insight metrik dan progres tim' },
}

export function Header() {
  const view = useUIStore((s) => s.view)
  const filters = useUIStore((s) => s.filters)
  const setSearch = useUIStore((s) => s.setSearch)
  const togglePriority = useUIStore((s) => s.togglePriority)
  const toggleTeamFilter = useUIStore((s) => s.toggleTeamFilter)
  const toggleStatusFilter = useUIStore((s) => s.toggleStatusFilter)
  const resetFilters = useUIStore((s) => s.resetFilters)
  const sidebarTeamFilter = useUIStore((s) => s.sidebarTeamFilter)
  const setSidebarTeamFilter = useUIStore((s) => s.setSidebarTeamFilter)
  const openModal = useUIStore((s) => s.openModal)
  const toggleActivityLog = useUIStore((s) => s.toggleActivityLog)
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen)
  const searchToken = useUIStore((s) => s.searchFocusToken)
  const teams = useTeamStore((s) => s.teams)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const { can } = usePermissions()
  const createTaskPerm = can('task.create')
  const isProjectBoard = view === 'project-board'
  const isBoard = view === 'board'
  // Project Baru SENGAJA tidak tersedia dari header — project dibuat via task pertama di Board Divisi Backlog
  const createPerm = createTaskPerm
  const approvalQueue = useApprovalQueue()
  const canApprove = approvalQueue.canApprove

  useEffect(() => {
    if (searchToken > 0) inputRef.current?.focus()
  }, [searchToken])

  const filterCount =
    filters.priorities.length +
    filters.teamIds.length +
    filters.statuses.length +
    (sidebarTeamFilter ? 1 : 0)

  return (
    <header className="border-b border-border-subtle bg-white/85 backdrop-blur-xl">
      <div className="h-1 w-full bg-gradient-to-r from-pertamina-red via-pertamina-red-dark to-pertamina-red" />
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3">
        {/* Hamburger - mobile only */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden rounded-lg border border-border bg-white p-2 text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition shrink-0"
          aria-label="Buka menu"
        >
          <Menu size={16} />
        </button>

        <div className="hidden sm:flex flex-col min-w-0">
          <h1 className="text-sm font-semibold tracking-tight truncate">{VIEW_META[view].title}</h1>
          <span className="text-[11px] text-ink-tertiary truncate">{VIEW_META[view].subtitle}</span>
        </div>

        <div className="flex-1 min-w-0 sm:mx-2">
          <div className="relative w-full max-w-xl">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
            <input
              ref={inputRef}
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas..."
              className="input-base pl-9 pr-16 sm:pr-20"
            />
            <kbd className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-ink-tertiary">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => openModal({ type: 'shortcuts' })}
            className="hidden md:flex rounded-lg border border-border bg-white p-2 text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
            title="Shortcuts"
          >
            <Keyboard size={14} />
          </button>
          <button
            onClick={toggleActivityLog}
            className="hidden sm:flex rounded-lg border border-border bg-white p-2 text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red-50 hover:border-pertamina-red/40 transition relative"
            title="Activity Log"
          >
            <Activity size={14} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-pertamina-red shadow-glow" />
          </button>
          {canApprove && (
            <button
              onClick={() => openModal({ type: 'approval-queue' })}
              className="rounded-lg border border-border bg-white p-2 text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition relative"
              title={`Antrian Approval (${approvalQueue.actionableCount})`}
            >
              <Inbox size={14} />
              {approvalQueue.actionableCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-pertamina-red px-1 text-[9px] font-bold text-white shadow-glow animate-bounce-subtle">
                  {approvalQueue.actionableCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => openModal({ type: 'approval-queue' })}
            className="hidden sm:flex rounded-lg border border-border bg-white p-2 text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition relative"
            title="Notifikasi"
          >
            <Bell size={14} />
            {(approvalQueue.actionableCount + approvalQueue.myPendingCount) > 0 && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-pertamina-red shadow-glow" />
            )}
          </button>
          {/* Sembunyikan tombol create di Project Board — project dibuat lewat Board Divisi */}
          {!isProjectBoard && (
            createPerm.allowed ? (
              <Button
                onClick={() => openModal({ type: 'add-task' })}
                className="px-2 sm:px-4"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Tambah Proyek</span>
              </Button>
            ) : (
              <Tooltip content={createPerm.reason ?? ''}>
                <Button disabled className="opacity-60 cursor-not-allowed px-2 sm:px-4">
                  <Plus size={14} />
                  <span className="hidden sm:inline">Tambah Proyek</span>
                </Button>
              </Tooltip>
            )
          )}
        </div>
      </div>

      {/* Filter bar hanya untuk Board Divisi & Project Board */}
      {view === 'dashboard' ? null : <>
      {/* Mobile filter toggle */}
      <div className="md:hidden px-3 pb-2 flex items-center gap-2">
        <button
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className={classNames(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition',
            mobileFiltersOpen
              ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red'
              : 'border-border bg-white text-ink-secondary hover:bg-pertamina-red-50',
          )}
        >
          <SlidersHorizontal size={12} />
          Filter {filterCount > 0 && `(${filterCount})`}
        </button>
        {filterCount > 0 && (
          <button
            onClick={resetFilters}
            className="rounded-lg border border-border bg-white px-2 py-1.5 text-[11px] text-ink-secondary hover:text-pertamina-red"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className={classNames(
        'flex-wrap items-center gap-2 px-3 sm:px-5 pb-3',
        mobileFiltersOpen ? 'flex' : 'hidden md:flex',
      )}>
        <div className="flex items-center gap-1 text-[11px] text-ink-tertiary">
          <Filter size={12} />
          <span className="uppercase tracking-widest">Filter</span>
        </div>

        <FilterGroup label="Prioritas">
          {PRIORITIES.map((p) => (
            <FilterChip
              key={p}
              active={filters.priorities.includes(p)}
              onClick={() => togglePriority(p)}
              label={PRIORITY_LABELS[p]}
            />
          ))}
        </FilterGroup>

        {isBoard && (
          <FilterGroup label="Status">
            {STATUSES.map((s) => (
              <FilterChip
                key={s}
                active={filters.statuses.includes(s)}
                onClick={() => toggleStatusFilter(s)}
                label={STATUS_LABELS[s] ?? s}
              />
            ))}
          </FilterGroup>
        )}

        <FilterGroup label="Divisi">
          {teams.map((t) => (
            <FilterChip
              key={t.id}
              active={filters.teamIds.includes(t.id)}
              onClick={() => toggleTeamFilter(t.id)}
              label={t.acronym}
              color={t.color}
            />
          ))}
        </FilterGroup>

        {sidebarTeamFilter && (
          <button
            onClick={() => setSidebarTeamFilter(null)}
            className="chip border border-pertamina-red/40 bg-pertamina-red-50 text-pertamina-red hover:bg-pertamina-red-100"
          >
            Sidebar: {teams.find((t) => t.id === sidebarTeamFilter)?.acronym}
            <X size={10} />
          </button>
        )}

        {filterCount > 0 && (
          <button
            onClick={resetFilters}
            className="chip border border-border bg-white text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40"
          >
            Reset Filter ({filterCount})
            <X size={10} />
          </button>
        )}
      </div>
      </>}
    </header>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border-subtle px-1.5 py-1">
      <span className="text-[10px] uppercase tracking-widest text-ink-tertiary px-1">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
        active
          ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red'
          : 'border-border bg-white text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03]',
      )}
      style={
        active && color
          ? { borderColor: `${color}80`, backgroundColor: `${color}20`, color }
          : undefined
      }
    >
      {label}
    </button>
  )
}
