import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { Search, ArrowUpDown } from 'lucide-react'
import { classNames, deadlineLabel } from '../../utils/helpers'
import { PriorityBadge } from '../ui/Badge'
import { AvatarStack } from '../ui/Avatar'
import { STATUS_LABELS } from '../../utils/colors'

interface Props {
  open: boolean
  onClose: () => void
  /** Task yang ditampilkan = task dengan status ini di team-team yang relevan dengan board context */
  statusKey: string
  /** Team IDs (sidebarTeamId atau multi-stage owners) — kalau null, semua */
  teamIds: string[] | null
}

type SortKey = 'title' | 'team' | 'priority' | 'deadline' | 'storyPoints'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 } as const

export function TaskListModal({ open, onClose, statusKey, teamIds }: Props) {
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const projects = useProjectStore((s) => s.projects)
  const openModal = useUIStore((s) => s.openModal)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks
      .filter((t) => t.status === statusKey)
      .filter((t) => (teamIds ? teamIds.includes(t.teamId) : true))
      .filter((t) => {
        if (!q) return true
        const hay = `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
      .map((t) => {
        const team = teams.find((x) => x.id === t.teamId)
        const project = projects.find((p) => p.id === t.projectId)
        return { task: t, team, project }
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        switch (sortKey) {
          case 'title': return a.task.title.localeCompare(b.task.title) * dir
          case 'team': return (a.team?.acronym ?? '').localeCompare(b.team?.acronym ?? '') * dir
          case 'priority': return (PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]) * dir
          case 'storyPoints': return (a.task.storyPoints - b.task.storyPoints) * dir
          case 'deadline': {
            const ad = a.task.deadline ? new Date(a.task.deadline).getTime() : Number.MAX_SAFE_INTEGER
            const bd = b.task.deadline ? new Date(b.task.deadline).getTime() : Number.MAX_SAFE_INTEGER
            return (ad - bd) * dir
          }
        }
      })
  }, [tasks, teams, projects, statusKey, teamIds, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const openTask = (id: string) => {
    onClose()
    setTimeout(() => openModal({ type: 'detail-task', taskId: id }), 50)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail List Tugas — ${STATUS_LABELS[statusKey] ?? statusKey}`}
      description={`${rows.length} tugas di kolom ini`}
      size="3xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, deskripsi, tag..."
            className="input-base pl-9"
          />
        </div>

        <div className="overflow-auto rounded-lg border border-border-subtle bg-white" style={{ maxHeight: '60vh' }}>
          <table className="w-full min-w-[840px] text-sm">
            <thead className="sticky top-0 bg-white border-b border-border-subtle text-[10px] uppercase tracking-widest text-ink-tertiary">
              <tr>
                <Th onClick={() => toggleSort('title')} active={sortKey === 'title'} dir={sortDir}>Judul</Th>
                <th className="text-left p-2.5">Project</th>
                <Th onClick={() => toggleSort('team')} active={sortKey === 'team'} dir={sortDir}>Divisi</Th>
                <Th onClick={() => toggleSort('priority')} active={sortKey === 'priority'} dir={sortDir} className="text-center">Prioritas</Th>
                <Th onClick={() => toggleSort('storyPoints')} active={sortKey === 'storyPoints'} dir={sortDir} className="text-right">SP</Th>
                <Th onClick={() => toggleSort('deadline')} active={sortKey === 'deadline'} dir={sortDir}>Deadline</Th>
                <th className="text-right p-2.5">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[12px] text-ink-tertiary">
                    {search ? 'Tidak ada tugas cocok' : 'Belum ada tugas di kolom ini'}
                  </td>
                </tr>
              )}
              {rows.map(({ task, team, project }) => {
                const dl = deadlineLabel(task.deadline)
                return (
                  <tr
                    key={task.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-pertamina-red-50/30 transition cursor-pointer"
                    onClick={() => openTask(task.id)}
                  >
                    <td className="p-2.5">
                      <div className="text-[13px] font-medium text-ink-primary truncate max-w-[260px]">{task.title}</div>
                      {task.tags.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-0.5">
                          {task.tags.slice(0, 3).map((t) => <span key={t} className="text-[9px] text-ink-tertiary">#{t}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-[11px] text-ink-tertiary font-mono truncate max-w-[140px]">{project?.code ?? '-'}</td>
                    <td className="p-2.5">
                      {team && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: team.color }} />
                          <span className="font-mono text-[11px] font-semibold" style={{ color: team.color }}>{team.acronym}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center"><PriorityBadge priority={task.priority} /></td>
                    <td className="p-2.5 text-right font-mono text-[11px] text-ink-secondary">{task.storyPoints}</td>
                    <td className="p-2.5">
                      {task.deadline ? (
                        <span
                          className={classNames(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border whitespace-nowrap',
                            dl.tone === 'overdue' && 'bg-pertamina-red-50 text-pertamina-red border-pertamina-red/30',
                            dl.tone === 'today' && 'bg-amber-50 text-amber-700 border-amber-200',
                            dl.tone === 'soon' && 'bg-amber-50 text-amber-700 border-amber-200/70',
                            dl.tone === 'normal' && 'bg-black/[0.04] text-ink-secondary border-border-subtle',
                          )}
                        >
                          {dl.text}
                        </span>
                      ) : <span className="text-[11px] text-ink-tertiary">-</span>}
                    </td>
                    <td className="p-2.5 text-right">
                      {task.assignees.length > 0 ? <AvatarStack names={task.assignees} max={3} /> : <span className="text-[11px] text-ink-tertiary">-</span>}
                    </td>
                  </tr>
                )
              })}
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

function Th({ children, onClick, active, dir, className }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: SortDir; className?: string }) {
  return (
    <th
      onClick={onClick}
      className={classNames('text-left p-2.5 select-none', onClick && 'cursor-pointer hover:text-pertamina-red', active && 'text-pertamina-red', className)}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {onClick && active && <ArrowUpDown size={9} className={dir === 'desc' ? 'rotate-180' : ''} />}
      </span>
    </th>
  )
}
