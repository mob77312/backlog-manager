import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useHandoffStore } from '../../store/useHandoffStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Input'
import { ArrowRightLeft, CheckCircle2, ClipboardCheck, Clock, MessageSquareWarning, ShieldAlert, XCircle, ChevronsRight } from 'lucide-react'
import { classNames, formatDateTime, relativeTime } from '../../utils/helpers'
import { STAGE_HEX, STAGE_LABELS } from '../../utils/colors'
import { PriorityBadge } from '../ui/Badge'
import { RequirementsDisplay } from './RequirementsForm'
import type { FulfilledRequirement } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  requestId: string
}

export function ApprovalDetailModal({ open, onClose, requestId }: Props) {
  const request = useHandoffStore((s) => s.requests.find((r) => r.id === requestId))
  const approveOrigin = useHandoffStore((s) => s.approveOrigin)
  const rejectOrigin = useHandoffStore((s) => s.rejectOrigin)
  const confirmTarget = useHandoffStore((s) => s.confirmTarget)
  const rejectTarget = useHandoffStore((s) => s.rejectTarget)
  const teams = useTeamStore((s) => s.teams)
  const users = useAuthStore((s) => s.users)
  const task = useTaskStore((s) => (request ? s.tasks.find((t) => t.id === request.taskId) : undefined))
  const { user, role } = usePermissions()

  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectMode, setRejectMode] = useState(false)
  const [chosenDept, setChosenDept] = useState<string>('')
  const [chosenAssignee, setChosenAssignee] = useState<string>('')

  if (!request) return null

  const fromTeam = teams.find((t) => t.id === request.fromTeamId)
  const toTeam = teams.find((t) => t.id === request.toTeamId)
  const config = useWorkflowStore.getState().config
  const originStageDef = config.stages.find((s) => s.side === 'origin')
  const targetStageDef = config.stages.find((s) => s.side === 'target')
  const scopeOwnDivision = role?.scopeRestriction === 'own_division'

  const isOriginApprover =
    !!role && role.permissions.canApproveHandoff &&
    (originStageDef?.approverRoleIds.includes(role.id) ?? false) &&
    (!scopeOwnDivision || user?.teamId === request.fromTeamId)
  const isTargetApprover =
    !!role && role.permissions.canApproveHandoff &&
    (targetStageDef?.approverRoleIds.includes(role.id) ?? false) &&
    (!scopeOwnDivision || user?.teamId === request.toTeamId)

  const canActOnOrigin = request.status === 'pending_origin' && isOriginApprover
  const canActOnTarget = request.status === 'pending_target' && isTargetApprover

  // For target stage: candidate assignees = users in target divisi (anyone with a role that has canEditTask)
  const targetCandidates = users.filter((u) => u.active && u.teamId === request.toTeamId)

  const handleApprove = () => {
    if (!user) return
    if (canActOnOrigin) {
      approveOrigin(request.id, user.id, user.name, note.trim() || undefined)
      toast.success('Request disetujui & diteruskan ke Kadiv tujuan')
      onClose()
      return
    }
    if (canActOnTarget) {
      if (!chosenDept) return toast.error('Pilih team tujuan')
      const assignee = targetCandidates.find((u) => u.id === chosenAssignee)
      confirmTarget(
        request.id,
        user.id,
        user.name,
        chosenDept,
        assignee?.id ?? null,
        assignee?.name ?? null,
        note.trim() || undefined,
      )
      toast.success(`✓ Handoff dikonfirmasi & tugas dipindah ke ${toTeam?.name}`)
      onClose()
      return
    }
  }

  const handleReject = () => {
    if (!user) return
    if (!rejectReason.trim()) return toast.error('Alasan penolakan wajib diisi')
    if (canActOnOrigin) {
      rejectOrigin(request.id, user.id, user.name, rejectReason.trim())
      toast.success('Request ditolak — requester akan diberitahu')
      onClose()
      return
    }
    if (canActOnTarget) {
      rejectTarget(request.id, user.id, user.name, rejectReason.trim())
      toast.success('Request ditolak — requester akan diberitahu')
      onClose()
      return
    }
  }

  const fromDept = fromTeam?.departments?.find((d) => d.id === request.fromDepartmentId)
  const toDept = toTeam?.departments?.find((d) => d.id === request.toDepartmentId)
  const assigneeUser = users.find((u) => u.id === request.toAssigneeUserId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        request.promoteToStage
          ? request.status === 'pending_target'
            ? 'Konfirmasi Handover Promote Stage L0'
            : 'Review Request Handover Promote'
          : request.status === 'pending_target'
            ? 'Konfirmasi Project Masuk'
            : 'Review Request Handoff'
      }
      description={request.taskTitle}
      size="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Left: context */}
        <div className="md:col-span-3 space-y-3">
          {request.promoteToStage && task?.stage && (
            <div
              className="rounded-lg border p-2.5 flex items-center gap-2 text-[12px]"
              style={{
                backgroundColor: `${STAGE_HEX[request.promoteToStage]}10`,
                borderColor: `${STAGE_HEX[request.promoteToStage]}55`,
              }}
            >
              <ChevronsRight size={14} className="text-pertamina-red shrink-0" />
              <span className="font-semibold text-ink-primary">PROMOTE</span>
              <span className="text-ink-tertiary">·</span>
              <span style={{ color: STAGE_HEX[task.stage] }} className="font-medium">
                {STAGE_LABELS[task.stage]}
              </span>
              <ArrowRightLeft size={11} className="text-ink-tertiary" />
              <span style={{ color: STAGE_HEX[request.promoteToStage] }} className="font-semibold">
                {STAGE_LABELS[request.promoteToStage]}
              </span>
              {request.resetStatusToBacklog && (
                <span className="ml-auto text-[10px] rounded-md bg-amber-100 text-amber-700 px-1.5 py-0.5 font-medium">
                  Status reset → Backlog
                </span>
              )}
            </div>
          )}
          {/* Routing */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="surface rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Divisi Asal</div>
              <div className="font-mono text-sm font-bold" style={{ color: fromTeam?.color }}>{fromTeam?.acronym}</div>
              <div className="text-[11px] text-ink-secondary">{fromTeam?.name}</div>
              {fromDept && <div className="text-[10px] text-ink-tertiary mt-1">Dept: {fromDept.name}</div>}
            </div>
            <ArrowRightLeft size={18} className="text-pertamina-red" />
            <div className="surface rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Divisi Tujuan</div>
              <div className="font-mono text-sm font-bold" style={{ color: toTeam?.color }}>{toTeam?.acronym}</div>
              <div className="text-[11px] text-ink-secondary">{toTeam?.name}</div>
              {toDept && <div className="text-[10px] text-ink-tertiary mt-1">Dept: {toDept.name}</div>}
            </div>
          </div>

          {/* Task summary */}
          {task && (
            <div className="surface rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Detail Tugas</div>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-primary">{task.title}</div>
                  {task.description && <div className="mt-1 text-[12px] text-ink-secondary line-clamp-3">{task.description}</div>}
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
              {task.deadline && (
                <div className="mt-2 text-[11px] text-ink-tertiary">
                  Deadline: {formatDateTime(task.deadline)}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="surface rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Alasan / Konteks</div>
            <div className="text-[13px] text-ink-secondary whitespace-pre-wrap">{request.reason}</div>
            <div className="mt-2 text-[11px] text-ink-tertiary">
              Diajukan oleh <strong className="text-ink-primary">{request.requestedByName}</strong> · {relativeTime(request.createdAt)}
            </div>
          </div>

          {/* Requirement fulfillments */}
          {(request.requirementSnapshot?.length ?? 0) > 0 && (
            <div className="surface rounded-lg p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <ClipboardCheck size={13} className="text-pertamina-red" />
                <span className="text-[10px] uppercase tracking-widest text-ink-tertiary">
                  Syarat Handoff {toTeam?.name}
                </span>
                <span className="ml-auto text-[10px] text-ink-tertiary">
                  {request.fulfillments?.length ?? 0}/{request.requirementSnapshot?.length ?? 0} diisi
                </span>
              </div>
              <RequirementsDisplay
                fields={request.requirementSnapshot ?? []}
                values={(request.fulfillments ?? []).reduce<Record<string, FulfilledRequirement>>(
                  (acc, f) => {
                    acc[f.fieldId] = f
                    return acc
                  },
                  {},
                )}
              />
            </div>
          )}

          {/* Timeline */}
          <div className="surface rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">Timeline</div>
            <ol className="relative border-l border-border-subtle pl-4 space-y-2">
              <TimelineStep
                icon={<Clock size={11} />}
                color="text-amber-700"
                title="Request dibuat"
                time={request.createdAt}
                detail={`oleh ${request.requestedByName}`}
              />
              {request.originReviewedAt && (
                <TimelineStep
                  icon={request.rejectedStage === 'origin' ? <XCircle size={11} /> : <CheckCircle2 size={11} />}
                  color={request.rejectedStage === 'origin' ? 'text-pertamina-red' : 'text-emerald-700'}
                  title={
                    request.rejectedStage === 'origin'
                      ? `Ditolak Kadiv ${fromTeam?.acronym}`
                      : `Disetujui Kadiv ${fromTeam?.acronym}`
                  }
                  time={request.originReviewedAt}
                  detail={`oleh ${request.originReviewedByName}${request.originDecisionNote ? ` · "${request.originDecisionNote}"` : ''}`}
                />
              )}
              {request.targetReviewedAt && (
                <TimelineStep
                  icon={request.rejectedStage === 'target' ? <XCircle size={11} /> : <CheckCircle2 size={11} />}
                  color={request.rejectedStage === 'target' ? 'text-pertamina-red' : 'text-emerald-700'}
                  title={
                    request.rejectedStage === 'target'
                      ? `Ditolak Kadiv ${toTeam?.acronym}`
                      : `Diterima Kadiv ${toTeam?.acronym}`
                  }
                  time={request.targetReviewedAt}
                  detail={`oleh ${request.targetReviewedByName}${assigneeUser ? ` · assignee: ${assigneeUser.name}` : ''}${request.targetDecisionNote ? ` · "${request.targetDecisionNote}"` : ''}`}
                />
              )}
              {request.rejectedReason && (
                <div className="text-[11px] text-pertamina-red ml-2">
                  Alasan penolakan: {request.rejectedReason}
                </div>
              )}
            </ol>
          </div>
        </div>

        {/* Right: actions */}
        <div className="md:col-span-2 space-y-3">
          {request.status === 'approved' && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
              ✓ Handoff selesai. Tugas sudah pindah ke {toTeam?.name}.
            </div>
          )}
          {request.status === 'rejected' && (
            <div className="rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 text-sm text-pertamina-red">
              ✕ Request ini ditolak.
              {request.rejectedReason && <div className="mt-1 text-[12px]">Alasan: {request.rejectedReason}</div>}
            </div>
          )}

          {(canActOnOrigin || canActOnTarget) ? (
            <>
              {canActOnTarget && (
                <>
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-[12px] text-blue-700">
                    <strong>Project masuk ke divisi Anda.</strong> Pilih team & person yang akan menangani.
                  </div>
                  <Select
                    label="Team Tujuan"
                    value={chosenDept}
                    onChange={(e) => {
                      setChosenDept(e.target.value)
                      setChosenAssignee('')
                    }}
                    options={[
                      { value: '', label: '— Pilih team —' },
                      ...(toTeam?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                  <Select
                    label="Assignee"
                    value={chosenAssignee}
                    onChange={(e) => setChosenAssignee(e.target.value)}
                    options={[
                      { value: '', label: '— Tanpa assignee spesifik —' },
                      ...targetCandidates.map((u) => ({
                        value: u.id,
                        label: u.name,
                      })),
                    ]}
                  />
                </>
              )}

              {!rejectMode ? (
                <>
                  <Textarea
                    label="Catatan (opsional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tambahkan catatan untuk pihak lain..."
                  />
                  <div className="flex gap-2 pt-2 border-t border-border-subtle">
                    <button className="btn-danger flex-1" onClick={() => setRejectMode(true)}>
                      <XCircle size={14} /> Tolak
                    </button>
                    <button
                      className="btn-primary flex-1"
                      onClick={handleApprove}
                      disabled={canActOnTarget && !chosenDept}
                    >
                      <CheckCircle2 size={14} /> {canActOnOrigin ? 'Setujui' : 'Konfirmasi'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Textarea
                    label="Alasan penolakan (wajib)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Jelaskan kenapa request ini ditolak..."
                  />
                  <div className="flex gap-2 pt-2 border-t border-border-subtle">
                    <button className="btn-ghost flex-1" onClick={() => setRejectMode(false)}>
                      Batal
                    </button>
                    <button className="btn-danger flex-1" onClick={handleReject}>
                      Konfirmasi Tolak
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            request.status !== 'approved' && request.status !== 'rejected' && (
              <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[12px] text-ink-secondary flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 text-pertamina-red" />
                <div>
                  Anda hanya bisa melihat request ini. {request.status === 'pending_origin'
                    ? `Persetujuan ada di tangan Kadiv ${fromTeam?.acronym}.`
                    : `Konfirmasi ada di tangan Kadiv ${toTeam?.acronym}.`}
                </div>
              </div>
            )
          )}

          <button className="btn-ghost w-full" onClick={onClose}>Tutup</button>

          {(request.status === 'pending_origin' || request.status === 'pending_target') && !canActOnOrigin && !canActOnTarget && user?.id === request.requestedByUserId && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-700 flex items-start gap-1.5">
              <MessageSquareWarning size={12} className="mt-0.5" />
              Anda sebagai pengaju akan dapat notifikasi saat request disetujui atau ditolak.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function TimelineStep({ icon, color, title, time, detail }: { icon: React.ReactNode; color: string; title: string; time: string; detail?: string }) {
  return (
    <li className="relative">
      <span className={classNames('absolute -left-[22px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white border border-border', color)}>
        {icon}
      </span>
      <div className="text-[12px] text-ink-primary font-medium">{title}</div>
      <div className="text-[10px] text-ink-tertiary">
        {relativeTime(time)} · {formatDateTime(time)}
      </div>
      {detail && <div className="text-[11px] text-ink-secondary mt-0.5">{detail}</div>}
    </li>
  )
}
