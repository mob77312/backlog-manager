import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from './KanbanColumn'
import { useFilteredTasks } from '../../hooks/useFilteredTasks'
import { useTaskStore } from '../../store/useTaskStore'
import { usePermissions } from '../../hooks/usePermissions'
import { useTeamStore } from '../../store/useTeamStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useUIStore } from '../../store/useUIStore'
import { ArrowLeft, Settings2, X } from 'lucide-react'
import { STAGE_HEX, STAGE_LABELS } from '../../utils/colors'
import toast from 'react-hot-toast'

export function KanbanBoard() {
  const { grouped, columns } = useFilteredTasks()
  const moveTask = useTaskStore((s) => s.moveTask)
  const tasks = useTaskStore((s) => s.tasks)
  const { can } = usePermissions()
  const sidebarTeamId = useUIStore((s) => s.sidebarTeamFilter)
  const setSidebarTeamFilter = useUIStore((s) => s.setSidebarTeamFilter)
  const stageCtx = useUIStore((s) => s.boardStageContext)
  const setBoardStageContext = useUIStore((s) => s.setBoardStageContext)
  const projectId = useUIStore((s) => s.filters.projectId)
  const setProjectFilter = useUIStore((s) => s.setProjectFilter)
  const setView = useUIStore((s) => s.setView)
  const openModal = useUIStore((s) => s.openModal)
  const teams = useTeamStore((s) => s.teams)
  const projects = useProjectStore((s) => s.projects)
  const stageOwnersMap = useWorkflowStore((s) => s.stageOwners)
  const activeTeam = teams.find((t) => t.id === sidebarTeamId)
  const activeProject = projects.find((p) => p.id === projectId)
  // Cek apakah ada project di stage context saat ini (penting agar user tahu apakah tasks-nya akan ke-link ke project di stage tsb)
  const projectsAtStage = stageCtx
    ? projects.filter((p) => p.currentStage === stageCtx && p.status === 'active')
    : []
  // Multi-divisi mode: stage diset tanpa pin single team → tampilkan tasks dari semua stage owners
  const stageOwnerTeams = stageCtx
    ? teams.filter((t) => (stageOwnersMap[stageCtx] ?? []).includes(t.id))
    : []
  const isMultiMode = !activeTeam && stageCtx && stageOwnerTeams.length > 0

  const backToProjectBoard = () => {
    setBoardStageContext(null)
    setSidebarTeamFilter(null)
    setProjectFilter(null)
    setView('project-board')
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const task = tasks.find((t) => t.id === draggableId)
    if (!task) return
    const perm = can('task.move', { teamId: task.teamId })
    if (!perm.allowed) {
      toast.error(perm.reason ?? 'Tidak diizinkan memindahkan tugas ini')
      return
    }
    // Validasi: destination column key harus ada di kanban config divisi pemilik task
    // Penting di multi-team mode — cegah task pindah ke kolom yang tidak dikenal divisi-nya
    const taskTeam = teams.find((t) => t.id === task.teamId)
    const validCols = taskTeam?.kanbanConfig ?? []
    const isValidDestination = validCols.some((c) => c.key === destination.droppableId)
    if (!isValidDestination) {
      toast.error(
        `Kolom "${destination.droppableId}" tidak ada di kanban divisi ${taskTeam?.acronym ?? task.teamId}. Atur via "Atur Kolom" dulu.`,
      )
      return
    }
    moveTask(draggableId, destination.droppableId)
  }

  // Empty state — tidak ada konteks (stage maupun team)
  if (!activeTeam && !isMultiMode) {
    return (
      <div className="absolute inset-0 grid place-items-center p-5">
        <div className="text-center max-w-md">
          <h2 className="text-base font-semibold text-ink-primary mb-2">Board Divisi</h2>
          <p className="text-sm text-ink-secondary mb-3">
            Board divisi dibuka via klik kolom stage di Board Utama. Pilih stage L0 di sana.
          </p>
          <button onClick={backToProjectBoard} className="btn-primary">
            <ArrowLeft size={13} /> Kembali ke Board Utama
          </button>
        </div>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-3 sm:p-5">
        {/* Context bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={backToProjectBoard}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/30 transition"
          >
            <ArrowLeft size={11} /> Board Utama
          </button>
          <span className="text-[11px] text-ink-tertiary">/</span>
          {isMultiMode ? (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <span className="font-medium text-ink-primary">Semua Divisi Owner:</span>
              <span className="flex flex-wrap gap-1">
                {stageOwnerTeams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSidebarTeamFilter(t.id)}
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-white hover:opacity-80 transition"
                    style={{ backgroundColor: t.color }}
                    title={`Klik untuk filter ke ${t.name} saja`}
                  >
                    {t.acronym}
                  </button>
                ))}
              </span>
            </span>
          ) : activeTeam ? (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeTeam.color }} />
              <span className="font-medium text-ink-primary">{activeTeam.name}</span>
              {stageCtx && (stageOwnersMap[stageCtx] ?? []).length > 1 && (
                <button
                  onClick={() => setSidebarTeamFilter(null)}
                  className="ml-1 rounded bg-black/[0.04] px-1 text-[9px] text-ink-secondary hover:text-pertamina-red"
                  title="Lihat semua divisi owner stage ini"
                >
                  Lihat semua
                </button>
              )}
            </span>
          ) : null}
          {stageCtx && (
            <>
              <span className="text-[11px] text-ink-tertiary">·</span>
              <span
                className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${STAGE_HEX[stageCtx]}15`,
                  borderColor: `${STAGE_HEX[stageCtx]}55`,
                  color: STAGE_HEX[stageCtx],
                }}
              >
                Stage L0: {STAGE_LABELS[stageCtx]}
              </span>
              <button
                onClick={() => setBoardStageContext(null)}
                className="rounded-md p-0.5 text-ink-tertiary hover:bg-black/[0.04] hover:text-pertamina-red transition"
                title="Hapus filter stage"
              >
                <X size={11} />
              </button>
            </>
          )}
          {activeProject && (
            <>
              <span className="text-[11px] text-ink-tertiary">·</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary">
                Project: {activeProject.code}
              </span>
              <button
                onClick={() => setProjectFilter(null)}
                className="rounded-md p-0.5 text-ink-tertiary hover:bg-black/[0.04] hover:text-pertamina-red transition"
                title="Hapus filter project"
              >
                <X size={11} />
              </button>
            </>
          )}
          {activeTeam && (
            <button
              onClick={() => openModal({ type: 'kanban-config', teamId: activeTeam.id })}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/30 transition"
            >
              <Settings2 size={11} /> Atur Kolom
            </button>
          )}
        </div>

        {stageCtx && projectsAtStage.length === 0 && (
          <div className="mb-3 rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 px-3 py-2 flex items-start gap-2">
            <span className="text-pertamina-red">💡</span>
            <div className="flex-1 text-[11px] text-ink-secondary">
              <strong className="text-pertamina-red">Belum ada item di stage {STAGE_LABELS[stageCtx]}.</strong>
              <br />
              Untuk menambah project baru: klik <strong>"+ Tambah Tugas"</strong> di kolom <strong>Backlog</strong> bawah ini.
              Saat task pertama dibuat dengan stage {STAGE_LABELS[stageCtx]}, project otomatis terbentuk dan muncul di Board Utama.
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {columns.map((col) => (
            <KanbanColumn key={col.key} column={col} tasks={grouped[col.key] ?? []} />
          ))}
        </div>
      </div>
    </DragDropContext>
  )
}
