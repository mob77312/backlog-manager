import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, ArrowRightLeft, Trash2, Paperclip, MessageSquare, History, Clock, ChevronRight } from 'lucide-react'
import type { Task } from '../../types'
import { useTeamStore } from '../../store/useTeamStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useUIStore } from '../../store/useUIStore'
import { useHandoffStore } from '../../store/useHandoffStore'
import { useDeleteRequestStore } from '../../store/useDeleteRequestStore'
import { PriorityBadge, TeamBadge, TagPill } from '../ui/Badge'
import { AvatarStack } from '../ui/Avatar'
import { Tooltip } from '../ui/Tooltip'
import { classNames, deadlineLabel } from '../../utils/helpers'
import { usePermissions } from '../../hooks/usePermissions'
import toast from 'react-hot-toast'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
}

export const TaskCard = memo(function TaskCard({ task, isDragging }: TaskCardProps) {
  const team = useTeamStore((s) => s.getTeam(task.teamId))
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const openModal = useUIStore((s) => s.openModal)
  const col = team?.kanbanConfig?.find((c) => c.key === task.status)
  const isInDoneColumn = col?.isDone === true || task.status === 'done'
  const pendingReq = useHandoffStore((s) => s.requests.find((r) => r.taskId === task.id && (r.status === 'pending_origin' || r.status === 'pending_target')))
  const pendingDelete = useDeleteRequestStore((s) => s.requests.find((r) => r.taskId === task.id && r.status === 'pending'))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { can } = usePermissions()
  const editPerm = can('task.edit', { teamId: task.teamId, departmentId: task.departmentId })
  const handoffPerm = can('task.handoff', { teamId: task.teamId, departmentId: task.departmentId })
  const deletePerm = can('task.delete', { teamId: task.teamId, departmentId: task.departmentId })
  const requestDeletePerm = can('task.requestDelete', { teamId: task.teamId, departmentId: task.departmentId })
  const canDeleteOrRequest = deletePerm.allowed || requestDeletePerm.allowed

  const dl = deadlineLabel(task.deadline)
  const completedSubs = task.subTasks.filter((s) => s.done).length
  const totalSubs = task.subTasks.length
  const hasHandoff = task.handoffHistory.length > 0

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      onClick={() => openModal({ type: 'detail-task', taskId: task.id })}
      className={classNames(
        'group relative cursor-pointer rounded-lg border border-border-subtle bg-white px-3 py-2 shadow-card transition hover:shadow-card-hover hover:border-pertamina-red/30',
        isDragging && 'rotate-1 ring-2 ring-pertamina-red/40 shadow-card-hover',
      )}
    >
      {/* Baris 1: title · priority · team badge · chips · story points */}
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-[13px] font-medium text-ink-primary truncate flex-1 min-w-0">{task.title}</h3>
        {team && <TeamBadge name={team.name} color={team.color} acronym={team.acronym} />}
        {pendingReq && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              openModal({ type: 'approval-detail', requestId: pendingReq.id })
            }}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100 shrink-0"
            title={pendingReq.status === 'pending_origin' ? 'Menunggu Kadiv asal' : 'Menunggu Kadiv tujuan'}
          >
            <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
            Approval
          </span>
        )}
        {pendingDelete && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              openModal({ type: 'delete-request-detail', requestId: pendingDelete.id })
            }}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-semibold bg-pertamina-red-50 text-pertamina-red border border-pertamina-red/30 cursor-pointer hover:bg-pertamina-red-100 shrink-0"
            title="Menunggu approval hapus"
          >
            <span className="h-1 w-1 rounded-full bg-pertamina-red animate-pulse" />
            Usul Hapus
          </span>
        )}
        {isInDoneColumn && !pendingReq && handoffPerm.allowed && task.projectId && task.stage && task.stage !== 'close' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              openModal({ type: 'promote-stage', taskId: task.id })
            }}
            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-pointer hover:bg-emerald-100 transition shrink-0"
            title="Handover ke stage berikutnya"
          >
            <ChevronRight size={9} /> Handover
          </button>
        )}
        <PriorityBadge priority={task.priority} />
        <span
          className="rounded bg-black/[0.04] px-1 py-0.5 text-[9px] font-mono text-ink-secondary border border-border-subtle shrink-0"
          title="Story points"
        >
          {task.storyPoints}sp
        </span>
      </div>

      {/* Baris 2: dept · tags · subtask progress · deadline · meta · assignees */}
      <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-tertiary min-w-0">
        {task.departmentId && team?.departments?.find((d) => d.id === task.departmentId) && (
          <span className="shrink-0 truncate max-w-[100px]" style={{ color: team.color }}>
            {team.departments.find((d) => d.id === task.departmentId)?.name}
          </span>
        )}
        {task.tags.slice(0, 2).map((t) => (
          <TagPill key={t} label={t} />
        ))}
        {task.tags.length > 2 && <span className="text-[9px] shrink-0">+{task.tags.length - 2}</span>}
        {totalSubs > 0 && (
          <span className="shrink-0 inline-flex items-center gap-0.5" title="Sub-tugas">
            ☐ {completedSubs}/{totalSubs}
          </span>
        )}
        <div className="flex-1" />
        {task.deadline && (
          <span
            className={classNames(
              'inline-flex items-center gap-0.5 rounded px-1 py-0.5 border shrink-0',
              dl.tone === 'overdue' && 'bg-pertamina-red-50 text-pertamina-red border-pertamina-red/30',
              dl.tone === 'today' && 'bg-amber-50 text-amber-700 border-amber-200',
              dl.tone === 'soon' && 'bg-amber-50 text-amber-700 border-amber-200/70',
              dl.tone === 'normal' && 'bg-black/[0.04] text-ink-secondary border-border-subtle',
            )}
          >
            <Clock size={9} />
            {dl.text}
          </span>
        )}
        {task.attachmentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 shrink-0"><Paperclip size={9} />{task.attachmentCount}</span>
        )}
        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 shrink-0"><MessageSquare size={9} />{task.commentCount}</span>
        )}
        {hasHandoff && (
          <span className="inline-flex items-center gap-0.5 text-violet-700 shrink-0" title="Pernah dihandoff">
            <History size={9} />{task.handoffHistory.length}
          </span>
        )}
        {task.assignees.length > 0 && <AvatarStack names={task.assignees} max={2} />}
      </div>

      {/* Hover action icons — always visible on mobile (no hover), hover-only on lg+ */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
        <ActionIcon
          allowed={editPerm.allowed}
          reason={editPerm.reason}
          onClick={(e) => {
            e.stopPropagation()
            openModal({ type: 'edit-task', taskId: task.id })
          }}
          title="Edit"
        >
          <Pencil size={12} />
        </ActionIcon>
        <ActionIcon
          allowed={handoffPerm.allowed && isInDoneColumn && !!task.projectId && !!task.stage && task.stage !== 'close'}
          reason={
            !handoffPerm.allowed
              ? handoffPerm.reason
              : !isInDoneColumn
                ? 'Pindahkan task ke kolom Selesai dulu sebelum handover ke divisi lain'
                : !task.projectId
                  ? 'Task belum terikat project'
                  : task.stage === 'close'
                    ? 'Sudah di stage terakhir'
                    : undefined
          }
          onClick={(e) => {
            e.stopPropagation()
            openModal({ type: 'promote-stage', taskId: task.id })
          }}
          title="Handover ke divisi stage berikut"
        >
          <ArrowRightLeft size={12} />
        </ActionIcon>
        <ActionIcon
          allowed={canDeleteOrRequest}
          reason={canDeleteOrRequest ? undefined : (deletePerm.reason ?? requestDeletePerm.reason)}
          onClick={(e) => {
            e.stopPropagation()
            // Direct delete if user has canDeleteTask permission
            if (deletePerm.allowed) {
              if (confirmDelete) {
                deleteTask(task.id)
                toast.success('Tugas dihapus')
              } else {
                setConfirmDelete(true)
                setTimeout(() => setConfirmDelete(false), 2500)
              }
              return
            }
            // Else open request-delete modal (needs Kadiv approval)
            if (pendingDelete) {
              openModal({ type: 'delete-request-detail', requestId: pendingDelete.id })
              return
            }
            openModal({ type: 'request-delete-task', taskId: task.id })
          }}
          title={
            deletePerm.allowed
              ? (confirmDelete ? 'Klik lagi untuk konfirmasi' : 'Hapus')
              : pendingDelete
                ? 'Lihat request hapus yang sedang berjalan'
                : 'Usulkan hapus (perlu approval Kadiv)'
          }
          danger
        >
          <Trash2 size={12} />
        </ActionIcon>
      </div>
    </motion.div>
  )
})

function ActionIcon({
  children,
  onClick,
  title,
  danger,
  allowed = true,
  reason,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  title: string
  danger?: boolean
  allowed?: boolean
  reason?: string
}) {
  if (!allowed) {
    return (
      <Tooltip content={reason ?? 'Tidak diizinkan'}>
        <button
          onClick={(e) => e.stopPropagation()}
          disabled
          className="rounded-md border border-border bg-white p-1.5 text-ink-tertiary opacity-50 cursor-not-allowed shadow-card"
        >
          {children}
        </button>
      </Tooltip>
    )
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className={classNames(
        'rounded-md border border-border bg-white p-1.5 text-ink-secondary shadow-card backdrop-blur transition hover:bg-pertamina-red-50 hover:text-pertamina-red hover:border-pertamina-red/40',
        danger && 'hover:text-pertamina-red hover:border-pertamina-red/40',
      )}
    >
      {children}
    </button>
  )
}
