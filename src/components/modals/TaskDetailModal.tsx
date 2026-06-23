import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { PriorityBadge, TagPill, TeamBadge } from '../ui/Badge'
import { AvatarStack, Avatar } from '../ui/Avatar'
import { Select } from '../ui/Select'
import { ProgressBar } from '../ui/ProgressBar'
import {
  ArrowRightLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  History,
  Package,
  Plus,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { AttachmentManager } from '../task/AttachmentManager'
import { FIBONACCI_POINTS, PRIORITY_LABELS, STAGE_LABELS, STATUS_LABELS } from '../../utils/colors'
import { useProjectStore } from '../../store/useProjectStore'
import { formatDateTime, relativeTime, classNames } from '../../utils/helpers'
import type { Priority, Status } from '../../types'
import { usePermissions } from '../../hooks/usePermissions'
import { Tooltip } from '../ui/Tooltip'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  taskId: string
}

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const STATUSES: Status[] = ['backlog', 'in_progress', 'review', 'done', 'operate']

export function TaskDetailModal({ open, onClose, taskId }: Props) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const teams = useTeamStore((s) => s.teams)
  const team = useTeamStore((s) => s.getTeam(task?.teamId))
  const updateTask = useTaskStore((s) => s.updateTask)
  const moveTask = useTaskStore((s) => s.moveTask)
  const markDone = useTaskStore((s) => s.markDone)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const addSubTask = useTaskStore((s) => s.addSubTask)
  const toggleSubTask = useTaskStore((s) => s.toggleSubTask)
  const removeSubTask = useTaskStore((s) => s.removeSubTask)
  const addComment = useTaskStore((s) => s.addComment)
  const openModal = useUIStore((s) => s.openModal)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task?.title ?? '')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(task?.description ?? '')
  const [subInput, setSubInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const { user, can } = usePermissions()
  const [comment, setComment] = useState('')
  const [author, setAuthor] = useState(user?.name ?? 'Saya')

  if (!task) return null

  const editPerm = can('task.edit', { teamId: task.teamId, departmentId: task.departmentId })
  const movePerm = can('task.move', { teamId: task.teamId, departmentId: task.departmentId })
  const handoffPerm = can('task.handoff', { teamId: task.teamId, departmentId: task.departmentId })
  const deletePerm = can('task.delete', { teamId: task.teamId, departmentId: task.departmentId })
  const requestDeletePerm = can('task.requestDelete', { teamId: task.teamId, departmentId: task.departmentId })
  const commentPerm = can('task.comment')
  const canEdit = editPerm.allowed
  const canMove = movePerm.allowed

  const completedSubs = task.subTasks.filter((s) => s.done).length
  const totalSubs = task.subTasks.length

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Left */}
        <div className="md:col-span-3 space-y-4 md:max-h-[75vh] md:overflow-y-auto md:pr-1">
          {/* Title */}
          <div>
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  if (titleDraft.trim() && titleDraft !== task.title) updateTask(task.id, { title: titleDraft.trim() })
                  setEditingTitle(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (titleDraft.trim() && titleDraft !== task.title) updateTask(task.id, { title: titleDraft.trim() })
                    setEditingTitle(false)
                  }
                  if (e.key === 'Escape') {
                    setTitleDraft(task.title)
                    setEditingTitle(false)
                  }
                }}
                className="input-base text-xl font-semibold"
              />
            ) : (
              <h2
                onClick={() => {
                  if (!canEdit) return
                  setTitleDraft(task.title)
                  setEditingTitle(true)
                }}
                className={classNames(
                  'text-xl font-semibold tracking-tight text-ink-primary leading-snug -mx-1 px-1 rounded',
                  canEdit ? 'cursor-text hover:bg-black/[0.04]' : 'cursor-default',
                )}
              >
                {task.title}
              </h2>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <PriorityBadge priority={task.priority} />
              {team && <TeamBadge name={team.name} color={team.color} acronym={team.acronym} />}
              {task.isMilestone && (
                <span className="pill border border-amber-300 bg-amber-50 text-amber-800">
                  <Flag size={10} className="mr-0.5" /> Milestone
                </span>
              )}
              <span className="pill">
                <span className="font-mono">#{task.id.slice(-6)}</span>
              </span>
            </div>
            <StageMismatchWarning task={task} />
          </div>

          {/* Description */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1.5">Deskripsi</h3>
            {editingDesc ? (
              <textarea
                autoFocus
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={() => {
                  updateTask(task.id, { description: descDraft })
                  setEditingDesc(false)
                }}
                className="input-base min-h-[100px] text-sm"
              />
            ) : (
              <p
                onClick={() => {
                  if (!canEdit) return
                  setDescDraft(task.description)
                  setEditingDesc(true)
                }}
                className={classNames(
                  'whitespace-pre-wrap rounded-md text-sm text-ink-secondary px-2 py-2 -mx-2 leading-relaxed',
                  canEdit ? 'cursor-text hover:bg-black/[0.04]' : 'cursor-default',
                )}
              >
                {task.description || (
                  <span className="italic text-ink-tertiary">
                    {canEdit ? 'Klik untuk menambah deskripsi...' : 'Tidak ada deskripsi'}
                  </span>
                )}
              </p>
            )}
          </section>

          {/* Deliverable */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1.5 flex items-center gap-1.5">
              <Package size={11} /> Deliverable
            </h3>
            <textarea
              className="input-base min-h-[60px] text-sm"
              disabled={!canEdit}
              placeholder={canEdit ? 'Output konkret yang diharapkan dari tugas ini...' : 'Belum ada deliverable'}
              value={task.deliverable}
              onChange={(e) => updateTask(task.id, { deliverable: e.target.value })}
            />
          </section>

          {/* Attachments */}
          <section>
            <AttachmentManager task={task} canEdit={canEdit} />
          </section>

          {/* Subtasks */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary">Sub-tugas</h3>
              {totalSubs > 0 && (
                <span className="text-[11px] text-ink-tertiary">
                  {completedSubs}/{totalSubs}
                </span>
              )}
            </div>
            {totalSubs > 0 && <ProgressBar value={completedSubs} max={totalSubs} className="mb-2" tone={completedSubs === totalSubs ? 'success' : 'primary'} />}
            <div className="space-y-1">
              {task.subTasks.map((st) => (
                <div key={st.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-black/[0.04]">
                  <button
                    disabled={!canEdit}
                    onClick={() => toggleSubTask(task.id, st.id)}
                    className={
                      'grid h-4 w-4 place-items-center rounded border ' +
                      (st.done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-border hover:border-pertamina-red')
                    }
                  >
                    {st.done && <Check size={10} />}
                  </button>
                  <span className={'flex-1 text-sm ' + (st.done ? 'line-through text-ink-tertiary' : 'text-ink-primary')}>
                    {st.title}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => removeSubTask(task.id, st.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-tertiary hover:text-pertamina-red"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    className="input-base"
                    placeholder="Tambah sub-tugas, tekan Enter"
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && subInput.trim()) {
                        addSubTask(task.id, subInput.trim())
                        setSubInput('')
                      }
                    }}
                  />
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      if (subInput.trim()) {
                        addSubTask(task.id, subInput.trim())
                        setSubInput('')
                      }
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Comments */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">Komentar</h3>
            <div className="space-y-2 mb-2">
              {task.comments.length === 0 && (
                <div className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-[11px] text-ink-tertiary text-center">
                  Belum ada komentar
                </div>
              )}
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-2 surface rounded-lg p-2.5">
                  <Avatar name={c.author} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-medium text-ink-primary">{c.author}</span>
                      <span className="text-ink-tertiary">{relativeTime(c.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-secondary whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-2">
              <input
                className="input-base"
                placeholder="Nama"
                value={author}
                disabled={!commentPerm.allowed}
                onChange={(e) => setAuthor(e.target.value)}
              />
              <input
                className="input-base"
                placeholder={commentPerm.allowed ? 'Tulis komentar...' : commentPerm.reason ?? 'Tidak diizinkan'}
                value={comment}
                disabled={!commentPerm.allowed}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && comment.trim()) {
                    addComment(task.id, author || 'Anonim', comment.trim())
                    setComment('')
                  }
                }}
              />
              <button
                className="btn-primary justify-center"
                disabled={!commentPerm.allowed}
                onClick={() => {
                  if (comment.trim()) {
                    addComment(task.id, author || 'Anonim', comment.trim())
                    setComment('')
                  }
                }}
              >
                Kirim
              </button>
            </div>
          </section>
        </div>

        {/* Right */}
        <div className="md:col-span-2 space-y-3 md:max-h-[75vh] md:overflow-y-auto md:pr-1">
          <Select
            label="Status"
            value={task.status}
            disabled={!canMove}
            onChange={(e) => {
              const newStatus = e.target.value as Status
              const targetCol = team?.kanbanConfig?.find((c) => c.key === newStatus)
              const targetIsDone = targetCol?.isDone === true || newStatus === 'done'
              const hasEvidence = (task.attachments ?? []).some((a) => a.category === 'evidence')
              if (targetIsDone && !hasEvidence) {
                toast.error('Tambahkan minimal 1 lampiran kategori Evidence sebelum menandai Selesai')
                return
              }
              moveTask(task.id, newStatus)
            }}
            options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          />
          <Select
            label="Prioritas"
            value={task.priority}
            disabled={!canEdit}
            onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          />
          <Select
            label="Divisi Pemilik"
            value={task.teamId}
            disabled={!canEdit}
            onChange={(e) => updateTask(task.id, { teamId: e.target.value, departmentId: null })}
            options={teams.map((t) => ({ value: t.id, label: `${t.acronym} • ${t.name}` }))}
          />
          <Select
            label={
              (team?.departments?.length ?? 0) === 0
                ? 'Team (belum ada team di divisi ini)'
                : 'Team'
            }
            value={task.departmentId ?? ''}
            disabled={!canEdit || (team?.departments?.length ?? 0) === 0}
            onChange={(e) => updateTask(task.id, { departmentId: e.target.value || null })}
            options={[
              { value: '', label: (team?.departments?.length ?? 0) === 0 ? '— Tidak ada team —' : '— Belum ditentukan —' },
              ...(team?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <Users size={11} /> PIC (Penanggung Jawab)
            </span>
            <div className="flex items-center gap-2">
              <AvatarStack names={task.assignees} max={4} />
              {task.assignees.length === 0 && <span className="text-[11px] text-ink-tertiary">Belum ada</span>}
            </div>
          </div>
          <CoPicEditor task={task} canEdit={canEdit} onUpdate={(coPics) => updateTask(task.id, { coPics })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
                <Clock size={11} /> Estimasi (hari)
              </span>
              <input
                type="number"
                min={0}
                className="input-base"
                disabled={!canEdit}
                value={task.estimatedDurationDays ?? ''}
                placeholder="—"
                onChange={(e) =>
                  updateTask(task.id, {
                    estimatedDurationDays: e.target.value
                      ? Math.max(0, parseInt(e.target.value, 10))
                      : null,
                  })
                }
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
                <Flag size={11} /> Milestone
              </span>
              <label
                className={classNames(
                  'flex h-[34px] cursor-pointer items-center gap-1.5 rounded-md border px-2 text-[12px] transition',
                  task.isMilestone
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                  !canEdit && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={task.isMilestone}
                  onChange={(e) => updateTask(task.id, { isMilestone: e.target.checked })}
                  className="m-0"
                />
                {task.isMilestone ? 'Ya' : 'Tidak'}
              </label>
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <Calendar size={11} /> Deadline
            </span>
            <input
              type="date"
              className="input-base"
              disabled={!canEdit}
              value={task.deadline ? task.deadline.slice(0, 10) : ''}
              onChange={(e) => updateTask(task.id, { deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <Select
            label="Story Points"
            value={String(task.storyPoints)}
            disabled={!canEdit}
            onChange={(e) => updateTask(task.id, { storyPoints: parseInt(e.target.value, 10) })}
            options={FIBONACCI_POINTS.map((p) => ({ value: String(p), label: `${p} poin` }))}
          />
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <Tag size={11} /> Tags
            </span>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {task.tags.map((t) => (
                <TagPill key={t} label={t} onRemove={() => updateTask(task.id, { tags: task.tags.filter((x) => x !== t) })} />
              ))}
              {task.tags.length === 0 && <span className="text-[11px] text-ink-tertiary">Belum ada tag</span>}
            </div>
            <input
              className="input-base"
              placeholder={canEdit ? 'Tambah tag, tekan Enter' : 'Tidak diizinkan'}
              disabled={!canEdit}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  if (!task.tags.includes(tagInput.trim())) {
                    updateTask(task.id, { tags: [...task.tags, tagInput.trim()] })
                  }
                  setTagInput('')
                }
              }}
            />
          </div>

          <div className="surface rounded-lg p-2.5 text-[11px] text-ink-tertiary space-y-1">
            <div>Dibuat: {formatDateTime(task.createdAt)}</div>
            <div>Diperbarui: {formatDateTime(task.updatedAt)}</div>
            {task.completedAt && <div className="text-emerald-700">Selesai: {formatDateTime(task.completedAt)}</div>}
          </div>

          {task.handoffHistory.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
                <History size={11} /> Riwayat Handoff
              </div>
              <ol className="space-y-2">
                {task.handoffHistory.map((h) => {
                  const from = teams.find((t) => t.id === h.fromTeamId)
                  const to = teams.find((t) => t.id === h.toTeamId)
                  return (
                    <li key={h.id} className="surface rounded-lg p-2 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 text-ink-primary">
                        <span style={{ color: from?.color }}>{from?.acronym ?? '?'}</span>
                        <ArrowRightLeft size={10} />
                        <span style={{ color: to?.color }}>{to?.acronym ?? '?'}</span>
                        <span className="ml-auto text-ink-tertiary">{relativeTime(h.timestamp)}</span>
                      </div>
                      <div className="text-ink-secondary">{h.reason}</div>
                      <div className="text-ink-tertiary">oleh {h.by}</div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border-subtle">
            {(() => {
              const team = teams.find((x) => x.id === task.teamId)
              const col = team?.kanbanConfig?.find((c) => c.key === task.status)
              const isInDoneCol = col?.isDone === true || task.status === 'done'
              const canPromote =
                handoffPerm.allowed && isInDoneCol && !!task.projectId && task.stage !== 'close'
              const promoteReason = !handoffPerm.allowed
                ? handoffPerm.reason
                : !isInDoneCol
                  ? 'Pindahkan ke kolom Selesai dulu sebelum handover ke stage berikut'
                  : !task.projectId
                    ? 'Task belum terikat project'
                    : task.stage === 'close'
                      ? 'Sudah di stage L0 terakhir'
                      : ''
              return canPromote ? (
                <button
                  className="w-full btn-ghost"
                  onClick={() => openModal({ type: 'promote-stage', taskId: task.id })}
                >
                  <ArrowRightLeft size={13} /> Handover ke Divisi Stage Berikut
                </button>
              ) : (
                <Tooltip content={promoteReason}>
                  <button disabled className="w-full btn-ghost opacity-50 cursor-not-allowed">
                    <ArrowRightLeft size={13} /> Handover ke Divisi Stage Berikut
                  </button>
                </Tooltip>
              )
            })()}
            {task.status !== 'done' && (
              canMove ? (
                <button
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition shadow-glow-success"
                  onClick={() => {
                    const result = markDone(task.id)
                    if (!result.ok) {
                      toast.error(result.error ?? 'Gagal menandai selesai')
                      return
                    }
                    toast.success('Tugas ditandai selesai')
                  }}
                >
                  <CheckCircle2 size={13} /> Tandai Selesai
                </button>
              ) : (
                <Tooltip content={movePerm.reason ?? ''}>
                  <button disabled className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 opacity-50 cursor-not-allowed">
                    <CheckCircle2 size={13} /> Tandai Selesai
                  </button>
                </Tooltip>
              )
            )}
            {deletePerm.allowed ? (
              <button
                className="w-full btn-danger"
                onClick={() => {
                  if (confirm('Hapus tugas ini?')) {
                    deleteTask(task.id)
                    onClose()
                    toast.success('Tugas dihapus')
                  }
                }}
              >
                <Trash2 size={13} /> Hapus Tugas
              </button>
            ) : requestDeletePerm.allowed ? (
              <button
                className="w-full btn-danger"
                onClick={() => {
                  onClose()
                  openModal({ type: 'request-delete-task', taskId: task.id })
                }}
              >
                <Trash2 size={13} /> Usulkan Hapus (perlu approval Kadiv)
              </button>
            ) : (
              <Tooltip content={deletePerm.reason ?? ''}>
                <button disabled className="w-full btn-danger opacity-50 cursor-not-allowed">
                  <Trash2 size={13} /> Hapus Tugas
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function CoPicEditor({
  task,
  canEdit,
  onUpdate,
}: {
  task: import('../../types').Task
  canEdit: boolean
  onUpdate: (coPics: string[]) => void
}) {
  const [input, setInput] = useState('')
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
        <UserPlus size={11} /> Co-PIC
      </span>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {task.coPics.length === 0 && (
          <span className="text-[11px] text-ink-tertiary italic">Belum ada Co-PIC</span>
        )}
        {task.coPics.map((c) => (
          <span key={c} className="pill border border-violet-200 bg-violet-50 text-violet-700">
            {c}
            {canEdit && (
              <button
                onClick={() => onUpdate(task.coPics.filter((x) => x !== c))}
                className="ml-1 text-violet-400 hover:text-pertamina-red"
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}
      </div>
      {canEdit && (
        <input
          className="input-base"
          placeholder="Ketik nama Co-PIC lalu Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault()
              const trimmed = input.trim()
              if (task.assignees.includes(trimmed)) {
                toast.error(`"${trimmed}" sudah jadi PIC utama`)
                return
              }
              if (!task.coPics.includes(trimmed)) onUpdate([...task.coPics, trimmed])
              setInput('')
            }
          }}
        />
      )}
    </div>
  )
}

function StageMismatchWarning({ task }: { task: import('../../types').Task }) {
  const project = useProjectStore((s) => (task.projectId ? s.projects.find((p) => p.id === task.projectId) : undefined))
  if (!project || !task.stage) return null
  if (task.stage === project.currentStage) return null
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
      <span className="mt-0.5">ℹ</span>
      <div>
        Task ini stage <strong>{STAGE_LABELS[task.stage]}</strong>, tapi project{' '}
        <strong>{project.code}</strong> sekarang di stage{' '}
        <strong>{STAGE_LABELS[project.currentStage]}</strong>. Project di Board Utama akan tetap muncul
        di kolom {STAGE_LABELS[project.currentStage]}.
      </div>
    </div>
  )
}
