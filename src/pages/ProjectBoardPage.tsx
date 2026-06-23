import { useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Briefcase, CheckCircle2, ChevronDown, ChevronRight, Inbox, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjectStore } from '../store/useProjectStore'
import { useTaskStore } from '../store/useTaskStore'
import { useTeamStore } from '../store/useTeamStore'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useUIStore } from '../store/useUIStore'
import { usePermissions } from '../hooks/usePermissions'
import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_HEX,
  STAGE_DESCRIPTIONS,
} from '../utils/colors'
import type { BusinessStage, Project } from '../types'
import { computeProjectProgress, progressTone, stageOwnerLabels } from '../utils/progress'
import { classNames } from '../utils/helpers'
import { PriorityBadge } from '../components/ui/Badge'
import toast from 'react-hot-toast'

export function ProjectBoardPage() {
  const projects = useProjectStore((s) => s.projects)
  const advanceStage = useProjectStore((s) => s.advanceStage)
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const stageOwners = useWorkflowStore((s) => s.stageOwners)
  const openModal = useUIStore((s) => s.openModal)
  const { user, can } = usePermissions()

  // Board Utama hanya menampilkan project yang sudah AKTIF (lulus approval flow).
  // Project dengan status pending_approval / rejected / closed / cancelled disembunyikan.
  const visibleProjects = useMemo(
    () => projects.filter((p) => p.status === 'active' || p.status === 'on_hold' || p.status === 'completed'),
    [projects],
  )

  const pendingApprovalCount = useMemo(
    () => projects.filter((p) => p.status === 'pending_approval').length,
    [projects],
  )

  const grouped = useMemo(() => {
    const map: Record<BusinessStage, Project[]> = {
      lead_to_active: [],
      plan_to_build: [],
      build_to_operate: [],
      operate_to_assure: [],
      close: [],
    }
    visibleProjects.forEach((p) => map[p.currentStage].push(p))
    return map
  }, [visibleProjects])

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !user) return
    const { draggableId, source, destination } = result
    if (source.droppableId === destination.droppableId) return
    const project = projects.find((p) => p.id === draggableId)
    if (!project) return
    const srcIdx = STAGE_KEYS.indexOf(source.droppableId as BusinessStage)
    const dstIdx = STAGE_KEYS.indexOf(destination.droppableId as BusinessStage)
    if (srcIdx < 0 || dstIdx < 0) return
    if (Math.abs(dstIdx - srcIdx) !== 1) {
      toast.error('Hanya bisa pindah ke stage berikut/sebelumnya')
      return
    }
    const stageCfg = project.stageConfig.find((sc) => sc.stage === project.currentStage)
    const owners = stageCfg?.ownerTeamIds ?? stageOwners[project.currentStage] ?? []
    const perm = can('project.advanceStage', { stageOwnerTeamIds: owners })
    if (!perm.allowed) {
      toast.error(perm.reason ?? 'Tidak diizinkan')
      return
    }
    if (dstIdx > srcIdx) {
      const r = advanceStage(project.id, user.id, user.name, 'Drag-and-drop dari Board Utama')
      if (!r.ok) {
        toast.error(r.error ?? 'Gagal')
        return
      }
      const destStage = STAGE_KEYS[dstIdx]
      if (destStage === 'close') {
        toast.success(`Project naik ke ${STAGE_LABELS[destStage]}. Klik "Tutup Project" di detail untuk arsipkan.`, { duration: 5000 })
      } else {
        toast.success(`Project naik ke ${STAGE_LABELS[destStage]}`)
      }
    } else {
      const r = useProjectStore.getState().sendBackStage(project.id, user.id, user.name, 'Drag-back dari Board Utama')
      if (!r.ok) toast.error(r.error ?? 'Gagal')
      else toast.success(`Project mundur ke ${STAGE_LABELS[STAGE_KEYS[dstIdx]]}`)
    }
  }

  // Hitung stage yang belum punya owner — kalau ada, tampilkan banner CTA
  const unownedStages = STAGE_KEYS.filter((s) => (stageOwners[s] ?? []).length === 0)
  const hasUnowned = unownedStages.length > 0

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div className="flex items-start justify-between gap-3 px-3 sm:px-5 pt-3 sm:pt-5 pb-2">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-ink-primary flex items-center gap-2">
              <Briefcase size={16} className="text-pertamina-red" />
              Board Utama — L0 Business Process
            </h2>
            <p className="text-[11px] text-ink-tertiary mt-0.5">
              Hanya project AKTIF (lulus approval) yang tampil di sini. Drag card untuk advance stage.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openModal({ type: 'all-projects' })}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 transition"
              title="Lihat semua project lintas status"
            >
              <List size={13} />
              Semua Project
            </button>
            {/* Tombol Buat Project DIPINDAH ke Board Divisi (stage Lead to Active). */}
          </div>
        </div>

        {pendingApprovalCount > 0 && (
          <div className="mx-3 sm:mx-5 mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 flex items-center gap-2">
            <Inbox size={14} className="text-amber-700 shrink-0" />
            <div className="flex-1 text-[11px] text-amber-800">
              <strong>{pendingApprovalCount} project</strong> menunggu approval — tidak akan tampil di board sampai semua step disetujui.
            </div>
            <button
              onClick={() => openModal({ type: 'approval-queue' })}
              className="rounded-md bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-300 transition whitespace-nowrap"
            >
              Buka Antrian Approval
            </button>
          </div>
        )}

        {hasUnowned && (
          <div className="mx-3 sm:mx-5 mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2">
            <span className="text-amber-700">⚠</span>
            <div className="flex-1 text-[11px] text-amber-800">
              <strong>{unownedStages.length} stage L0 belum punya divisi owner:</strong>{' '}
              {unownedStages.map((s) => STAGE_LABELS[s]).join(', ')}.
              Handover/promote di stage tersebut tidak akan berfungsi.
            </div>
            <button
              onClick={() => openModal({ type: 'stage-owners' })}
              className="rounded-md bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-300 transition whitespace-nowrap"
            >
              Setup Owners
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 p-3 sm:p-5 pt-2">
          {STAGE_KEYS.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              projects={grouped[stage]}
              stageOwnerIds={stageOwners[stage] ?? []}
              tasks={tasks}
              teams={teams}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  )
}

function StageColumn({
  stage,
  projects,
  stageOwnerIds,
  tasks,
  teams,
}: {
  stage: BusinessStage
  projects: Project[]
  stageOwnerIds: string[]
  tasks: ReturnType<typeof useTaskStore.getState>['tasks']
  teams: ReturnType<typeof useTeamStore.getState>['teams']
}) {
  const { user } = usePermissions()
  const setView = useUIStore((s) => s.setView)
  const setSidebarTeamFilter = useUIStore((s) => s.setSidebarTeamFilter)
  const setBoardStageContext = useUIStore((s) => s.setBoardStageContext)
  const setProjectFilter = useUIStore((s) => s.setProjectFilter)
  const hex = STAGE_HEX[stage]
  const isOwner = user?.teamId ? stageOwnerIds.includes(user.teamId) : false
  const ownerLabel = stageOwnerLabels(stageOwnerIds, teams)

  const enterStageBoard = () => {
    if (stageOwnerIds.length === 0) {
      toast.error('Belum ada divisi owner di stage ini. Set di Workflow Config.')
      return
    }
    setBoardStageContext(stage)
    setProjectFilter(null)
    // Pin single-team kalau cuma 1 owner / user adalah owner. Multi-team mode untuk lainnya.
    if (stageOwnerIds.length === 1) {
      setSidebarTeamFilter(stageOwnerIds[0])
    } else if (isOwner && user?.teamId) {
      setSidebarTeamFilter(user.teamId)
    } else {
      setSidebarTeamFilter(null) // multi-mode: union dari semua stage owners
    }
    setView('board')
  }

  const [collapsed, setCollapsed] = useState(false)
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div
      className="flex flex-col rounded-xl border border-border-subtle bg-bg-column overflow-hidden shadow-card"
      style={{ borderTop: `3px solid ${hex}` }}
    >
      {/* Header (toggle accordion) */}
      <div
        className="px-3 py-2.5 border-b border-border-subtle flex items-center gap-2 text-left"
        style={{ background: `linear-gradient(90deg, ${hex}20, ${hex}05)` }}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="rounded p-0.5 text-ink-tertiary hover:text-ink-primary transition shrink-0"
          title={collapsed ? 'Buka' : 'Tutup'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}80` }} />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-primary">
          {STAGE_LABELS[stage]}
        </span>
        <span className="rounded-full bg-white border border-border-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary shrink-0">
          {projects.length}
        </span>
        <div className="ml-2 flex items-center gap-1.5 text-[10px] text-ink-tertiary flex-1 min-w-0">
          <span className="font-mono shrink-0">Owner:</span>
          <span
            className={classNames('font-medium truncate', isOwner ? 'text-emerald-700' : 'text-ink-secondary')}
            title={ownerLabel}
          >
            {ownerLabel}
          </span>
          {isOwner && <span className="rounded bg-emerald-100 px-1 text-[9px] text-emerald-700 font-semibold shrink-0">EDIT</span>}
        </div>
        <button
          onClick={() => openModal({ type: 'project-list', stage })}
          className="ml-auto shrink-0 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-medium text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 transition"
          title="Buka tabel detail list project di stage ini"
        >
          Detail List
        </button>
        <button
          onClick={enterStageBoard}
          className="shrink-0 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-medium text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 transition"
          title="Buka Board Divisi owner stage ini"
        >
          Buka Board →
        </button>
      </div>

      {/* Body: horizontal scrollable strip of project cards */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <Droppable droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={classNames(
                    'p-2.5 transition flex flex-col gap-1.5 overflow-y-auto',
                    snapshot.isDraggingOver && 'bg-pertamina-red-50/60',
                  )}
                  style={{ minHeight: projects.length === 0 ? '60px' : '180px', maxHeight: '240px' }}
                >
                  <AnimatePresence>
                    {projects.map((proj, idx) => (
                      <Draggable key={proj.id} draggableId={proj.id} index={idx}>
                        {(p) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            style={p.draggableProps.style}
                            className="w-full"
                          >
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                            >
                              <ProjectCard project={proj} tasks={tasks} teams={teams} />
                            </motion.div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                  {projects.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-border bg-white text-[11px] text-ink-tertiary text-center px-3">
                      {STAGE_DESCRIPTIONS[stage]}
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProjectCard({
  project,
  tasks,
  teams,
}: {
  project: Project
  tasks: ReturnType<typeof useTaskStore.getState>['tasks']
  teams: ReturnType<typeof useTeamStore.getState>['teams']
}) {
  const openModal = useUIStore((s) => s.openModal)
  const stageOwnersMap = useWorkflowStore((s) => s.stageOwners)
  const stageCfg = project.stageConfig.find((sc) => sc.stage === project.currentStage)
  const perProjectOwners = stageCfg?.ownerTeamIds ?? []
  // Fallback: kalau project-level owner kosong, pakai global stageOwners
  const effectiveOwners = perProjectOwners.length > 0 ? perProjectOwners : (stageOwnersMap[project.currentStage] ?? [])
  const ownerTeam = teams.find((t) => effectiveOwners.includes(t.id))
  const { total } = computeProjectProgress(project, tasks, teams)
  const tone = progressTone(total)
  const toneClass =
    tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-red-500' : 'bg-slate-400'

  // Ready to promote? semua task di stage ini sudah masuk kolom done/terminal
  const stageTasks = tasks.filter((t) => t.projectId === project.id && t.stage === project.currentStage)
  const isDoneStatus = (taskStatus: string, teamId: string) => {
    const team = teams.find((x) => x.id === teamId)
    const col = team?.kanbanConfig?.find((c) => c.key === taskStatus)
    return col?.isDone === true || taskStatus === 'done'
  }
  const allTasksDone =
    stageTasks.length > 0 &&
    stageTasks.every((t) => isDoneStatus(t.status, t.teamId))
  const isLastStage = project.currentStage === 'close'
  const readyToPromote = allTasksDone && !isLastStage

  // Status chip = column position task primer di stage ini (dominant column)
  const statusBreakdown = stageTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})
  const statusEntries = Object.entries(statusBreakdown).sort((a, b) => b[1] - a[1])
  // Resolve label & color dari kanban config divisi pertama (atau global STATUS_*)
  const resolveStatus = (statusKey: string) => {
    for (const team of teams) {
      const col = team.kanbanConfig?.find((c) => c.key === statusKey)
      if (col) return { label: col.label, color: col.color }
    }
    return { label: statusKey, color: '#94a3b8' }
  }

  return (
    <div
      onClick={() => openModal({ type: 'project-detail', projectId: project.id })}
      className={classNames(
        'group relative cursor-pointer rounded-lg border bg-white px-3 py-2 shadow-card hover:shadow-card-hover hover:border-pertamina-red/30 transition',
        readyToPromote ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-border-subtle',
      )}
    >
      {/* Baris 1: code · title · ready badge · priority */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-mono text-ink-tertiary shrink-0">{project.code}</span>
        <h3 className="text-[13px] font-semibold text-ink-primary truncate flex-1 min-w-0">{project.name}</h3>
        {project.customer && (
          <span className="hidden sm:inline text-[10px] text-ink-tertiary shrink-0">{project.customer}</span>
        )}
        {readyToPromote && (
          <span
            className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 border border-emerald-200 px-1 py-0.5 text-[9px] font-semibold text-emerald-700 shrink-0"
            title="Semua task Selesai — siap handover"
          >
            <CheckCircle2 size={9} /> Siap
          </span>
        )}
        <PriorityBadge priority={project.priority} />
      </div>

      {/* Baris 2: owner · status chips · progress bar · due · buka */}
      <div className="mt-1.5 flex items-center gap-2 text-[10px] min-w-0">
        {ownerTeam ? (
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ownerTeam.color }} />
            <span className="font-mono font-semibold" style={{ color: ownerTeam.color }}>{ownerTeam.acronym}</span>
          </span>
        ) : (
          <span className="text-ink-tertiary italic shrink-0">Belum owner</span>
        )}
        {statusEntries.slice(0, 2).map(([statusKey, count]) => {
          const meta = resolveStatus(statusKey)
          return (
            <span
              key={statusKey}
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-medium shrink-0"
              style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
            >
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
              {count > 1 && <span className="font-mono opacity-80">×{count}</span>}
            </span>
          )
        })}
        <div className="flex-1 min-w-[60px] flex items-center gap-1.5">
          <div className="h-1.5 flex-1 rounded-full bg-black/[0.06] overflow-hidden">
            <div className={classNames('h-full rounded-full', toneClass)} style={{ width: `${total}%` }} />
          </div>
          <span className="font-mono font-semibold text-ink-primary shrink-0">{total}%</span>
        </div>
        {project.targetCloseDate && (
          <span className="text-ink-tertiary shrink-0 hidden md:inline">
            {new Date(project.targetCloseDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}
