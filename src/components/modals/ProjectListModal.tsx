import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useProjectStore } from '../../store/useProjectStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useUIStore } from '../../store/useUIStore'
import { computeProjectProgress } from '../../utils/progress'
import { STAGE_HEX, STAGE_LABELS } from '../../utils/colors'
import type { BusinessStage } from '../../types'
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import { PriorityBadge } from '../ui/Badge'

interface Props {
  open: boolean
  onClose: () => void
  stage: BusinessStage
}

type SortKey = 'code' | 'name' | 'customer' | 'progress' | 'targetCloseDate' | 'priority'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 } as const

export function ProjectListModal({ open, onClose, stage }: Props) {
  const projects = useProjectStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const stageOwners = useWorkflowStore((s) => s.stageOwners)
  const openModal = useUIStore((s) => s.openModal)
  const setProjectFilter = useUIStore((s) => s.setProjectFilter)
  const setBoardStageContext = useUIStore((s) => s.setBoardStageContext)
  const setSidebarTeamFilter = useUIStore((s) => s.setSidebarTeamFilter)
  const setView = useUIStore((s) => s.setView)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects
      .filter((p) => p.currentStage === stage)
      .filter((p) => {
        if (!q) return true
        const hay = `${p.code} ${p.name} ${p.customer} ${p.tags.join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
      .map((p) => {
        const { total } = computeProjectProgress(p, tasks, teams)
        const sc = p.stageConfig.find((s) => s.stage === p.currentStage)
        const perProjectOwners = sc?.ownerTeamIds ?? []
        const effectiveOwners = perProjectOwners.length > 0 ? perProjectOwners : (stageOwners[p.currentStage] ?? [])
        const ownerTeam = teams.find((t) => effectiveOwners.includes(t.id))
        return { project: p, progress: total, ownerTeam }
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        switch (sortKey) {
          case 'code': return a.project.code.localeCompare(b.project.code) * dir
          case 'name': return a.project.name.localeCompare(b.project.name) * dir
          case 'customer': return (a.project.customer || '').localeCompare(b.project.customer || '') * dir
          case 'progress': return (a.progress - b.progress) * dir
          case 'targetCloseDate': {
            const ad = a.project.targetCloseDate ? new Date(a.project.targetCloseDate).getTime() : Number.MAX_SAFE_INTEGER
            const bd = b.project.targetCloseDate ? new Date(b.project.targetCloseDate).getTime() : Number.MAX_SAFE_INTEGER
            return (ad - bd) * dir
          }
          case 'priority': return (PRIORITY_ORDER[a.project.priority] - PRIORITY_ORDER[b.project.priority]) * dir
        }
      })
  }, [projects, tasks, teams, stage, stageOwners, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const openProject = (id: string) => {
    onClose()
    setTimeout(() => openModal({ type: 'project-detail', projectId: id }), 50)
  }

  const openProjectInBoard = (projectId: string, ownerTeamId?: string) => {
    setProjectFilter(projectId)
    setBoardStageContext(stage)
    if (ownerTeamId) setSidebarTeamFilter(ownerTeamId)
    setView('board')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail List Project — ${STAGE_LABELS[stage]}`}
      description={`${rows.length} project di stage ini`}
      size="3xl"
    >
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, customer, tag..."
            className="input-base pl-9"
          />
        </div>

        {/* Table */}
        <div
          className="overflow-auto rounded-lg border border-border-subtle bg-white"
          style={{ maxHeight: '60vh' }}
        >
          <table className="w-full min-w-[840px] text-sm">
            <thead className="sticky top-0 bg-white border-b border-border-subtle text-[10px] uppercase tracking-widest text-ink-tertiary">
              <tr>
                <Th onClick={() => toggleSort('code')} active={sortKey === 'code'} dir={sortDir}>Kode</Th>
                <Th onClick={() => toggleSort('name')} active={sortKey === 'name'} dir={sortDir}>Nama Project</Th>
                <Th onClick={() => toggleSort('customer')} active={sortKey === 'customer'} dir={sortDir}>Customer</Th>
                <Th onClick={() => toggleSort('priority')} active={sortKey === 'priority'} dir={sortDir} className="text-center">Prioritas</Th>
                <th className="text-left p-2.5">Owner</th>
                <Th onClick={() => toggleSort('progress')} active={sortKey === 'progress'} dir={sortDir} className="text-right">Progress</Th>
                <Th onClick={() => toggleSort('targetCloseDate')} active={sortKey === 'targetCloseDate'} dir={sortDir}>Due</Th>
                <th className="text-right p-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[12px] text-ink-tertiary">
                    {search ? 'Tidak ada project cocok dengan filter' : `Belum ada project di stage ${STAGE_LABELS[stage]}`}
                  </td>
                </tr>
              )}
              {rows.map(({ project, progress, ownerTeam }) => (
                <tr
                  key={project.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-pertamina-red-50/30 transition cursor-pointer"
                  onClick={() => openProject(project.id)}
                >
                  <td className="p-2.5 font-mono text-[11px] text-ink-tertiary whitespace-nowrap">{project.code}</td>
                  <td className="p-2.5">
                    <div className="text-[13px] font-medium text-ink-primary truncate max-w-[280px]">{project.name}</div>
                    {project.tags.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {project.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] text-ink-tertiary">#{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-2.5 text-[12px] text-ink-secondary">{project.customer || '-'}</td>
                  <td className="p-2.5 text-center">
                    <PriorityBadge priority={project.priority} />
                  </td>
                  <td className="p-2.5">
                    {ownerTeam ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ownerTeam.color }} />
                        <span className="font-mono text-[11px] font-semibold" style={{ color: ownerTeam.color }}>
                          {ownerTeam.acronym}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-tertiary italic">—</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-end gap-2 min-w-[120px]">
                      <div className="h-1.5 flex-1 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: progress >= 80 ? '#059669' : progress >= 30 ? '#d97706' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-ink-primary tabular-nums">{progress}%</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-[11px] text-ink-tertiary whitespace-nowrap">
                    {project.targetCloseDate
                      ? new Date(project.targetCloseDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '-'}
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openProjectInBoard(project.id, ownerTeam?.id)
                      }}
                      className="inline-flex items-center gap-0.5 rounded bg-pertamina-red-50 px-1.5 py-0.5 text-[10px] font-medium text-pertamina-red hover:bg-pertamina-red-100 transition whitespace-nowrap"
                      title="Buka di Board Divisi"
                    >
                      Board <ExternalLink size={9} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button onClick={onClose} className="btn-primary">Selesai</button>
        </div>
      </div>
    </Modal>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  dir?: SortDir
  className?: string
}) {
  return (
    <th
      onClick={onClick}
      className={classNames(
        'text-left p-2.5 select-none',
        onClick && 'cursor-pointer hover:text-pertamina-red',
        active && 'text-pertamina-red',
        className,
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {onClick && active && <ArrowUpDown size={9} className={dir === 'desc' ? 'rotate-180' : ''} />}
      </span>
    </th>
  )
}
