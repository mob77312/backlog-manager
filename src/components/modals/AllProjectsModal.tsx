import { useMemo, useState } from 'react'
import { ArrowUpDown, Filter, Search, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useProjectStore } from '../../store/useProjectStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { computeSCurveSummary } from '../../utils/scurve'
import {
  PRIORITY_HEX,
  PRIORITY_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  STAGE_HEX,
  STAGE_LABELS,
} from '../../utils/colors'
import type { Priority, Project, ProjectStatus } from '../../types'
import { classNames } from '../../utils/helpers'

interface Props {
  open: boolean
  onClose: () => void
}

type SortKey = 'updatedAt' | 'priority' | 'progress' | 'variance' | 'name'

const ALL_STATUSES: ProjectStatus[] = ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'closed', 'cancelled', 'rejected']
const ALL_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export function AllProjectsModal({ open, onClose }: Props) {
  const projects = useProjectStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Set<ProjectStatus>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')

  const filtered = useMemo(() => {
    let arr = projects.slice()
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      arr = arr.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.customer.toLowerCase().includes(q),
      )
    }
    if (statusFilter.size > 0) arr = arr.filter((p) => statusFilter.has(p.status))
    if (priorityFilter.size > 0) arr = arr.filter((p) => priorityFilter.has(p.priority))
    return arr
  }, [projects, search, statusFilter, priorityFilter])

  const sorted = useMemo(() => {
    const arr = filtered.slice()
    if (sortKey === 'updatedAt') arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    if (sortKey === 'priority') arr.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    if (sortKey === 'name') arr.sort((a, b) => a.name.localeCompare(b.name))
    if (sortKey === 'progress' || sortKey === 'variance') {
      arr.sort((a, b) => {
        const sa = computeSCurveSummary(a, tasks, teams)
        const sb = computeSCurveSummary(b, tasks, teams)
        return sortKey === 'progress'
          ? sb.actualProgress - sa.actualProgress
          : sa.scheduleVariancePercent - sb.scheduleVariancePercent
      })
    }
    return arr
  }, [filtered, sortKey, tasks, teams])

  const toggleStatus = (s: ProjectStatus) => {
    const next = new Set(statusFilter)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setStatusFilter(next)
  }
  const togglePriority = (p: Priority) => {
    const next = new Set(priorityFilter)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    setPriorityFilter(next)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Semua Project"
      description="View terpadu seluruh project lintas status (active, pending, rejected, closed)"
      size="3xl"
    >
      <div className="space-y-3">
        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input
              className="input-base pl-8"
              placeholder="Cari kode, nama, atau customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-white px-2 py-1.5 text-[12px] text-ink-secondary"
          >
            <option value="updatedAt">Terbaru diperbarui</option>
            <option value="priority">Priority tertinggi</option>
            <option value="progress">Progress tertinggi</option>
            <option value="variance">Variance (terburuk)</option>
            <option value="name">Nama A-Z</option>
          </select>
        </div>

        {/* Filter chips */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary mr-1">Status:</span>
            {ALL_STATUSES.map((s) => {
              const active = statusFilter.has(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={classNames(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
                    active ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red' : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: PROJECT_STATUS_COLORS[s] }} />
                  {PROJECT_STATUS_LABELS[s]}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary mr-1">Priority:</span>
            {ALL_PRIORITIES.map((p) => {
              const active = priorityFilter.has(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className={classNames(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
                    active ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red' : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_HEX[p] }} />
                  {PRIORITY_LABELS[p]}
                </button>
              )
            })}
            {(statusFilter.size > 0 || priorityFilter.size > 0) && (
              <button
                onClick={() => {
                  setStatusFilter(new Set())
                  setPriorityFilter(new Set())
                }}
                className="ml-auto text-[10px] text-ink-tertiary underline hover:text-pertamina-red"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 text-[11px] text-ink-tertiary border-y border-border-subtle py-1.5">
          <Filter size={11} />
          <span>
            <strong className="text-ink-primary">{sorted.length}</strong> dari {projects.length} project ditampilkan
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <ArrowUpDown size={10} /> Sort: {sortLabel(sortKey)}
          </span>
        </div>

        {/* Table */}
        <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border-subtle">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-bg-elevated z-10">
              <tr className="border-b border-border-subtle text-left text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
                <th className="px-2 py-1.5">Kode</th>
                <th className="px-2 py-1.5">Project</th>
                <th className="px-2 py-1.5 hidden sm:table-cell">Stage</th>
                <th className="px-2 py-1.5">Priority</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5 text-right">Progress</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[11px] text-ink-tertiary">
                    Tidak ada project yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                sorted.map((p) => <ProjectRow key={p.id} project={p} onOpen={() => {
                  onClose()
                  openModal({ type: 'project-detail', projectId: p.id })
                }} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

function ProjectRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const summary = useMemo(() => computeSCurveSummary(project, tasks, teams), [project, tasks, teams])
  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-b border-border-subtle hover:bg-pertamina-red-50/30 transition"
    >
      <td className="px-2 py-2 font-mono text-[10px] text-ink-tertiary">{project.code}</td>
      <td className="px-2 py-2">
        <div className="text-ink-primary truncate max-w-[280px]">{project.name}</div>
        {project.customer && (
          <div className="text-[10px] text-ink-tertiary">{project.customer}</div>
        )}
      </td>
      <td className="px-2 py-2 hidden sm:table-cell">
        <span
          className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            borderColor: STAGE_HEX[project.currentStage],
            color: STAGE_HEX[project.currentStage],
            background: `${STAGE_HEX[project.currentStage]}10`,
          }}
        >
          {STAGE_LABELS[project.currentStage]}
        </span>
      </td>
      <td className="px-2 py-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] font-bold uppercase"
          style={{ background: `${PRIORITY_HEX[project.priority]}18`, color: PRIORITY_HEX[project.priority] }}
        >
          {PRIORITY_LABELS[project.priority]}
        </span>
      </td>
      <td className="px-2 py-2">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            background: `${PROJECT_STATUS_COLORS[project.status]}18`,
            color: PROJECT_STATUS_COLORS[project.status],
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: PROJECT_STATUS_COLORS[project.status] }} />
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
      </td>
      <td className="px-2 py-2 text-right">
        <div className="inline-flex items-center gap-1.5">
          <div className="h-1.5 w-16 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${summary.actualProgress}%`,
                background:
                  summary.health === 'red' ? '#ef4444' : summary.health === 'yellow' ? '#d97706' : '#059669',
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-ink-secondary w-9 text-right">
            {summary.actualProgress}%
          </span>
        </div>
      </td>
    </tr>
  )
}

function sortLabel(k: SortKey): string {
  return {
    updatedAt: 'Terbaru',
    priority: 'Priority',
    progress: 'Progress',
    variance: 'Variance',
    name: 'Nama',
  }[k]
}
