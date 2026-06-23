import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useProjectStore } from '../../store/useProjectStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_HEX,
  STAGE_DESCRIPTIONS,
} from '../../utils/colors'
import { PriorityBadge } from '../ui/Badge'
import { ArrowRight, ArrowLeft, CheckCircle2, Edit3, Plus, X, Briefcase } from 'lucide-react'
import { classNames, formatDateTime, relativeTime } from '../../utils/helpers'
import { computeProjectProgress, computeStageProgress, isValidWeights, stageOwnerLabels } from '../../utils/progress'
import { ProjectDashboardCard } from '../dashboard/ProjectDashboardCard'
import { KickoffPanel } from '../project/KickoffPanel'
import { RiskRegisterPanel } from '../project/RiskRegisterPanel'
import { Tooltip } from '../ui/Tooltip'
import type { BusinessStage, Project } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
}

type Tab = 'overview' | 'scurve' | 'kickoff' | 'risk' | 'completion' | 'weights' | 'tasks' | 'history'

export function ProjectDetailModal({ open, onClose, projectId }: Props) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const setProjectFilter = useUIStore((s) => s.setProjectFilter)
  const setSidebarTeamFilter = useUIStore((s) => s.setSidebarTeamFilter)
  const setView = useUIStore((s) => s.setView)
  const openModal = useUIStore((s) => s.openModal)
  const advanceStage = useProjectStore((s) => s.advanceStage)
  const sendBackStage = useProjectStore((s) => s.sendBackStage)
  // closeProject (legacy) digantikan oleh project-completion modal
  const setWeights = useProjectStore((s) => s.setWeights)
  const resubmitForApproval = useProjectStore((s) => s.resubmitForApproval)
  const { user, can } = usePermissions()
  const [tab, setTab] = useState<Tab>('overview')
  const [editWeights, setEditWeights] = useState<Record<BusinessStage, number> | null>(null)

  if (!project) {
    return (
      <Modal open={open} onClose={onClose} title="Project tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Data tidak tersedia.</div>
      </Modal>
    )
  }

  const stageCfg = project.stageConfig.find((sc) => sc.stage === project.currentStage)
  const owners = stageCfg?.ownerTeamIds ?? []
  const advancePerm = can('project.advanceStage', { stageOwnerTeamIds: owners })
  const weightsPerm = can('project.editWeights')
  const closePerm = can('project.close')
  const { total, perStage } = computeProjectProgress(project, tasks, teams)

  const openDivisionBoard = (teamId: string) => {
    setProjectFilter(project.id)
    setSidebarTeamFilter(teamId)
    setView('board')
    onClose()
  }

  const handleAdvance = () => {
    if (!user) return
    const r = advanceStage(project.id, user.id, user.name, 'Advance dari Project Detail')
    if (!r.ok) toast.error(r.error ?? 'Gagal')
    else toast.success('Stage berhasil dinaikkan')
  }

  const handleSendBack = () => {
    if (!user) return
    const reason = prompt('Alasan mundur stage?') ?? ''
    if (!reason.trim()) return
    const r = sendBackStage(project.id, user.id, user.name, reason)
    if (!r.ok) toast.error(r.error ?? 'Gagal')
    else toast.success('Stage dikembalikan')
  }

  return (
    <Modal open={open} onClose={onClose} size="3xl">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-lg shadow-glow"
          style={{ backgroundColor: STAGE_HEX[project.currentStage] }}
        >
          <Briefcase size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-ink-tertiary">{project.code}</div>
          <h2 className="text-base sm:text-lg font-semibold text-ink-primary leading-snug">{project.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-tertiary">
            <PriorityBadge priority={project.priority} />
            <span>Customer: <span className="text-ink-secondary font-medium">{project.customer || '-'}</span></span>
            <span>·</span>
            <span>Status: <span className="text-ink-secondary font-medium capitalize">{project.status}</span></span>
            <span>·</span>
            <span>Stage: <span className="text-ink-primary font-semibold">{STAGE_LABELS[project.currentStage]}</span></span>
          </div>
        </div>
      </div>

      {/* I2: Rejection banner + resubmit action */}
      {project.status === 'rejected' && (
        <RejectedBanner
          project={project}
          canResubmit={user?.id === project.createdByUserId || can('project.create').allowed}
          onResubmit={(note) => {
            if (!user) return
            const r = resubmitForApproval(project.id, user.id, user.name, note)
            if (!r.ok) toast.error(r.error ?? 'Gagal resubmit')
            else toast.success('Project di-resubmit untuk approval')
          }}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-border-subtle mb-3">
        <div className="flex gap-1">
          {(
            [
              ['overview', 'Overview'],
              ['scurve', 'S-Curve'],
              ...(project.priority === 'high' || project.priority === 'critical'
                ? [['kickoff', 'Kickoff']] as Array<[Tab, string]>
                : []),
              ...(project.priority === 'critical'
                ? [['risk', `Risk (${project.riskRegister.length})`]] as Array<[Tab, string]>
                : []),
              ...(project.completion
                ? [['completion', 'Penyelesaian']] as Array<[Tab, string]>
                : []),
              ['weights', 'Bobot & Stage'],
              ['tasks', 'Tasks per Stage'],
              ['history', 'Riwayat'],
            ] as Array<[Tab, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={classNames(
                'px-3 py-2 text-[12px] font-medium border-b-2 transition',
                tab === k ? 'border-pertamina-red text-pertamina-red' : 'border-transparent text-ink-secondary hover:text-ink-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="surface rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Progress Total</span>
              <span className="text-lg font-bold text-ink-primary">{total}%</span>
            </div>
            <ProgressSegments perStage={perStage} />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1 text-[10px]">
              {perStage.map((s) => (
                <div key={s.stage} className="rounded border border-border-subtle bg-white px-1.5 py-1">
                  <div className="font-medium text-ink-secondary truncate">{STAGE_LABELS[s.stage]}</div>
                  <div className="font-mono text-ink-tertiary">{s.weight}% · {s.progress}%</div>
                </div>
              ))}
            </div>
          </div>

          {project.description && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Deskripsi</div>
              <p className="text-sm text-ink-secondary whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <Field label="Tanggal Mulai">{project.startDate ? formatDateTime(project.startDate) : '-'}</Field>
            <Field label="Target Close">{project.targetCloseDate ? formatDateTime(project.targetCloseDate) : '-'}</Field>
            <Field label="Dibuat oleh">{project.createdByName}</Field>
            <Field label="Diperbarui">{relativeTime(project.updatedAt)}</Field>
          </div>

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.tags.map((t) => (
                <span key={t} className="rounded-md border border-border-subtle bg-black/[0.03] px-1.5 py-0.5 text-[10px] text-ink-secondary">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <Tooltip content={advancePerm.allowed ? '' : advancePerm.reason ?? ''}>
              <button
                onClick={handleSendBack}
                disabled={!advancePerm.allowed || project.currentStage === STAGE_KEYS[0]}
                className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={13} /> Send Back
              </button>
            </Tooltip>
            <Tooltip content={advancePerm.allowed ? '' : advancePerm.reason ?? ''}>
              <button
                onClick={handleAdvance}
                disabled={!advancePerm.allowed || project.currentStage === STAGE_KEYS[STAGE_KEYS.length - 1]}
                className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Advance <ArrowRight size={13} />
              </button>
            </Tooltip>
            {closePerm.allowed && project.status !== 'closed' && project.currentStage === 'close' ? (
              <button
                onClick={() => {
                  if (!user) return
                  // F5: Tutup project SEKARANG via Form Penyelesaian (BAST wajib).
                  openModal({ type: 'project-completion', projectId: project.id })
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
              >
                <CheckCircle2 size={13} /> Tutup Project (Form Penyelesaian)
              </button>
            ) : closePerm.allowed && project.status !== 'closed' ? (
              <Tooltip content="Project harus di stage Close dulu — advance bertahap stage demi stage">
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 opacity-50 cursor-not-allowed"
                >
                  <CheckCircle2 size={13} /> Tutup Project
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'scurve' && (
        <div className="space-y-3">
          <ProjectDashboardCard project={project} clickable={false} />
        </div>
      )}

      {tab === 'kickoff' && (
        <KickoffTab project={project} />
      )}

      {tab === 'risk' && (
        <div className="space-y-3">
          <RiskRegisterPanel project={project} />
        </div>
      )}

      {tab === 'completion' && project.completion && (
        <CompletionTab project={project} />
      )}

      {tab === 'weights' && (
        <WeightsTab
          project={project}
          editWeights={editWeights}
          onEdit={setEditWeights}
          weightsPermAllowed={weightsPerm.allowed}
          weightsPermReason={weightsPerm.reason}
          onSave={(w) => {
            setWeights(project.id, w)
            setEditWeights(null)
            toast.success('Bobot disimpan')
          }}
          teams={teams}
        />
      )}

      {tab === 'tasks' && (
        <TasksByStageTab
          project={project}
          tasks={tasks}
          teams={teams}
          openDivisionBoard={openDivisionBoard}
          openAddTask={(stage) => openModal({ type: 'add-task', defaultProjectId: project.id, defaultStage: stage })}
        />
      )}

      {tab === 'history' && (
        <div className="space-y-2 text-[12px]">
          {project.stageHistory.length === 0 && <div className="text-ink-tertiary text-center py-6">Belum ada riwayat</div>}
          {[...project.stageHistory].reverse().map((h) => (
            <div key={h.id} className="surface rounded-md p-2 flex items-start gap-2">
              <div
                className="mt-0.5 grid h-6 w-6 place-items-center rounded-md text-white shrink-0"
                style={{ backgroundColor: STAGE_HEX[h.toStage] }}
              >
                {h.direction === 'forward' ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink-primary">
                  {h.fromStage ? `${STAGE_LABELS[h.fromStage]} → ` : ''}
                  <span className="font-semibold">{STAGE_LABELS[h.toStage]}</span>
                </div>
                <div className="text-[10px] text-ink-tertiary">
                  {relativeTime(h.timestamp)} · oleh {h.byName}
                </div>
                {h.reason && <div className="mt-1 text-ink-secondary">{h.reason}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-md p-2">
      <div className="text-[10px] uppercase tracking-widest text-ink-tertiary">{label}</div>
      <div className="mt-0.5 text-ink-primary">{children}</div>
    </div>
  )
}

function ProgressSegments({ perStage }: { perStage: ReturnType<typeof computeProjectProgress>['perStage'] }) {
  const totalWeight = perStage.reduce((sum, p) => sum + p.weight, 0) || 1
  return (
    <div className="flex h-3 w-full rounded-full overflow-hidden bg-black/[0.06]">
      {perStage.map((s) => {
        const widthPct = (s.weight / totalWeight) * 100
        const fillPct = s.progress
        return (
          <div
            key={s.stage}
            className="relative h-full border-r border-white/40 last:border-r-0"
            style={{ width: `${widthPct}%`, background: `${STAGE_HEX[s.stage]}22` }}
            title={`${STAGE_LABELS[s.stage]} — weight ${s.weight}%, progress ${s.progress}%`}
          >
            <div className="h-full" style={{ width: `${fillPct}%`, backgroundColor: STAGE_HEX[s.stage] }} />
          </div>
        )
      })}
    </div>
  )
}

function WeightsTab({
  project,
  editWeights,
  onEdit,
  weightsPermAllowed,
  weightsPermReason,
  onSave,
  teams,
}: {
  project: Project
  editWeights: Record<BusinessStage, number> | null
  onEdit: (w: Record<BusinessStage, number> | null) => void
  weightsPermAllowed: boolean
  weightsPermReason?: string
  onSave: (w: Record<BusinessStage, number>) => void
  teams: ReturnType<typeof useTeamStore.getState>['teams']
}) {
  const isEditing = editWeights !== null
  const weights = editWeights
    ?? project.stageConfig.reduce((acc, sc) => {
      acc[sc.stage] = sc.weight
      return acc
    }, {} as Record<BusinessStage, number>)
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  const valid = isValidWeights(weights)

  return (
    <div className="space-y-2">
      {project.stageConfig.map((sc) => (
        <div key={sc.stage} className="surface rounded-md p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_HEX[sc.stage] }} />
            <span className="text-[13px] font-semibold text-ink-primary">{STAGE_LABELS[sc.stage]}</span>
            <span className="ml-auto rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-ink-secondary">
              status: {sc.status}
            </span>
          </div>
          <p className="text-[10px] text-ink-tertiary mb-2">{STAGE_DESCRIPTIONS[sc.stage]}</p>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 items-center">
            <label className="block">
              <span className="text-[10px] text-ink-tertiary">Bobot %</span>
              <input
                type="number"
                min={0}
                max={100}
                disabled={!isEditing}
                value={weights[sc.stage]}
                onChange={(e) => onEdit({ ...weights, [sc.stage]: Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))) })}
                className="input-base text-right"
              />
            </label>
            <div className="text-[11px] text-ink-tertiary">
              Owner: <span className="text-ink-primary font-medium">{stageOwnerLabels(sc.ownerTeamIds, teams)}</span>
            </div>
          </div>
        </div>
      ))}
      <div
        className={classNames(
          'flex items-center justify-between rounded-md px-3 py-2 text-[12px]',
          valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
        )}
      >
        <span>Total bobot</span>
        <span className="font-mono font-semibold">{sum} / 100</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        {!isEditing ? (
          <Tooltip content={weightsPermAllowed ? '' : weightsPermReason ?? ''}>
            <button
              disabled={!weightsPermAllowed}
              onClick={() =>
                onEdit(
                  project.stageConfig.reduce((acc, sc) => {
                    acc[sc.stage] = sc.weight
                    return acc
                  }, {} as Record<BusinessStage, number>),
                )
              }
              className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Edit3 size={13} /> Edit Bobot
            </button>
          </Tooltip>
        ) : (
          <>
            <button onClick={() => onEdit(null)} className="btn-ghost">
              <X size={13} /> Batal
            </button>
            <button
              disabled={!valid}
              onClick={() => onSave(weights)}
              className={classNames('btn-primary', !valid && 'opacity-50 cursor-not-allowed')}
            >
              Simpan Bobot
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function TasksByStageTab({
  project,
  tasks,
  teams,
  openDivisionBoard,
  openAddTask,
}: {
  project: Project
  tasks: ReturnType<typeof useTaskStore.getState>['tasks']
  teams: ReturnType<typeof useTeamStore.getState>['teams']
  openDivisionBoard: (teamId: string) => void
  openAddTask: (stage: BusinessStage) => void
}) {
  return (
    <div className="space-y-3">
      {STAGE_KEYS.map((stage) => {
        const stageTasks = tasks.filter((t) => t.projectId === project.id && t.stage === stage)
        const sc = project.stageConfig.find((s) => s.stage === stage)
        const owners = sc?.ownerTeamIds ?? []
        const progress = computeStageProgress(project, stage, tasks, teams)
        return (
          <div key={stage} className="surface rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_HEX[stage] }} />
              <span className="text-[13px] font-semibold text-ink-primary">{STAGE_LABELS[stage]}</span>
              <span className="text-[11px] text-ink-tertiary">{stageTasks.length} task · {progress}%</span>
              <div className="ml-auto flex items-center gap-1">
                {owners.map((tid) => {
                  const team = teams.find((t) => t.id === tid)
                  if (!team) return null
                  return (
                    <button
                      key={tid}
                      onClick={() => openDivisionBoard(tid)}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold text-white"
                      style={{ backgroundColor: team.color }}
                      title={`Buka board ${team.name}, filter project ini`}
                    >
                      {team.acronym}
                    </button>
                  )
                })}
                <button
                  onClick={() => openAddTask(stage)}
                  className="rounded-md border border-border bg-white p-1 text-ink-tertiary hover:text-pertamina-red hover:border-pertamina-red/30 transition"
                  title="Tambah task di stage ini"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {stageTasks.length === 0 ? (
                <div className="text-[11px] text-ink-tertiary text-center py-3 italic">Belum ada task di stage ini</div>
              ) : (
                stageTasks.map((t) => {
                  const team = teams.find((x) => x.id === t.teamId)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded border border-border-subtle bg-white px-2 py-1.5 text-[12px]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: team?.color }} />
                      <span className="font-mono text-[10px] text-ink-tertiary">{team?.acronym}</span>
                      <span className="flex-1 truncate text-ink-primary">{t.title}</span>
                      <span className="text-[10px] text-ink-tertiary">{t.status}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KickoffTab({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false)
  const k = project.kickoffMeeting
  if (!k && !editing) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
        <div className="text-[12px] text-ink-secondary mb-2">
          Kickoff Meeting belum dicatat.
        </div>
        <button onClick={() => setEditing(true)} className="btn-primary text-[11px]">
          Catat Kickoff Meeting
        </button>
      </div>
    )
  }
  if (editing) {
    return (
      <KickoffPanel
        project={project}
        onApproved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-ink-tertiary">
          Direkam oleh <strong className="text-ink-primary">{k!.recordedByName}</strong>
          {' · '}
          {new Date(k!.recordedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-medium text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 transition"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KField label="Tanggal Meeting">
          {new Date(k!.meetingDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
        </KField>
        <KField label="Lokasi / Link">{k!.location || '—'}</KField>
      </div>
      <KField label={`Attendees (${k!.attendees.length})`}>
        <div className="flex flex-wrap gap-1">
          {k!.attendees.map((a) => (
            <span key={a} className="pill border border-blue-200 bg-blue-50 text-blue-700">{a}</span>
          ))}
        </div>
      </KField>
      <KField label="Agenda">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{k!.agenda || '—'}</pre>
      </KField>
      <KField label="Keputusan Utama">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{k!.decisions || '—'}</pre>
      </KField>
      <KField label="Action Items">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{k!.actionItems || '—'}</pre>
      </KField>
      <KField label="Catatan / Notulen">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{k!.notes || '—'}</pre>
      </KField>
    </div>
  )
}

function CompletionTab({ project }: { project: Project }) {
  const c = project.completion!
  const outcomeColor = c.outcome === 'successful' ? '#059669' : c.outcome === 'partial' ? '#d97706' : '#ef4444'
  const outcomeLabel = c.outcome === 'successful' ? 'Successful' : c.outcome === 'partial' ? 'Partial' : 'Cancelled'
  const downloadEvidence = (e: typeof c.evidence[number]) => {
    const link = document.createElement('a')
    link.href = e.dataUrl
    link.download = e.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(2)} MB`
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 px-3 py-2.5 flex items-center justify-between" style={{ borderColor: outcomeColor, background: `${outcomeColor}10` }}>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-tertiary">Outcome</div>
          <div className="text-[15px] font-bold" style={{ color: outcomeColor }}>{outcomeLabel}</div>
        </div>
        <div className="text-right text-[11px] text-ink-tertiary">
          Ditutup oleh <strong className="text-ink-primary">{c.closedByName}</strong><br />
          {new Date(c.closedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </div>
      <KField label="Tanggal Penyelesaian">
        {new Date(c.completionDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
      </KField>
      <KField label="Ringkasan Deliverable">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{c.deliverableSummary || '—'}</pre>
      </KField>
      <KField label={`Evidence / BAST (${c.evidence.length})`}>
        <div className="space-y-1">
          {c.evidence.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-md border border-border-subtle bg-white px-2 py-1.5 text-[11px]">
              <span className="flex-1 truncate text-ink-primary">{e.name}</span>
              <span className="text-[10px] text-ink-tertiary">{formatBytes(e.size)}</span>
              <button
                onClick={() => downloadEvidence(e)}
                className="text-[10px] text-pertamina-red underline hover:no-underline"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </KField>
      <KField label="Lessons Learned">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{c.lessonsLearned || '—'}</pre>
      </KField>
      <KField label="Stakeholder Feedback">
        <pre className="whitespace-pre-wrap font-sans text-[12px] text-ink-primary">{c.stakeholderFeedback || '—'}</pre>
      </KField>
    </div>
  )
}

function KField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-column/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary mb-1">{label}</div>
      <div className="text-[12px] text-ink-primary">{children}</div>
    </div>
  )
}

function RejectedBanner({
  project,
  canResubmit,
  onResubmit,
}: {
  project: Project
  canResubmit: boolean
  onResubmit: (note: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const rejectedStep = project.approvalFlow.find((s) => s.status === 'rejected')
  return (
    <div className="mb-3 rounded-lg border border-pertamina-red/40 bg-pertamina-red-50/60 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <X size={16} className="text-pertamina-red mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-pertamina-red">
            Project DITOLAK pada step "{rejectedStep?.label ?? '—'}"
          </div>
          {rejectedStep?.rejectedReason && (
            <div className="mt-0.5 text-[11px] text-ink-secondary">
              <strong>Alasan:</strong> {rejectedStep.rejectedReason}
            </div>
          )}
          {rejectedStep?.approvedByName && (
            <div className="text-[10px] text-ink-tertiary">oleh {rejectedStep.approvedByName}</div>
          )}
        </div>
        {canResubmit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-md border border-pertamina-red bg-white px-2 py-1 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-50 transition"
          >
            Ajukan Ulang
          </button>
        )}
      </div>
      {showForm && (
        <div className="mt-2 space-y-2 rounded-md border border-pertamina-red/30 bg-white p-2.5">
          <span className="block text-[11px] font-medium text-ink-secondary">
            Catatan Revisi (wajib)
          </span>
          <textarea
            className="input-base min-h-[60px] text-[12px]"
            placeholder="Jelaskan revisi/perbaikan yang sudah dilakukan sebelum resubmit..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => {
                setShowForm(false)
                setNote('')
              }}
              className="btn-ghost text-[11px] py-1"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!note.trim()) {
                  toast.error('Catatan revisi wajib diisi')
                  return
                }
                onResubmit(note)
                setShowForm(false)
                setNote('')
              }}
              disabled={!note.trim()}
              className={classNames('btn-primary text-[11px] py-1', !note.trim() && 'opacity-50 cursor-not-allowed')}
            >
              Resubmit untuk Approval
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
