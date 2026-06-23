import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Input'
import { getNextPendingStep, useProjectStore } from '../../store/useProjectStore'
import { usePermissions } from '../../hooks/usePermissions'
import {
  APPROVAL_STEP_LABELS,
  APPROVAL_STEP_STATUS_COLORS,
  APPROVAL_STEP_STATUS_LABELS,
  PRIORITY_HEX,
  PRIORITY_LABELS,
} from '../../utils/colors'
import type { ApprovalStep } from '../../types'
import { classNames, relativeTime } from '../../utils/helpers'
import { KickoffPanel } from '../project/KickoffPanel'
import { RiskRegisterPanel } from '../project/RiskRegisterPanel'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
}

export function ProjectApprovalModal({ open, onClose, projectId }: Props) {
  const { user, can } = usePermissions()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
  const approveStep = useProjectStore((s) => s.approveStep)
  const rejectStep = useProjectStore((s) => s.rejectStep)

  const nextStep = useMemo(() => (project ? getNextPendingStep(project.approvalFlow) : null), [project])

  const [comment, setComment] = useState('')
  const [riskAck, setRiskAck] = useState(false)
  const [checklistAck, setChecklistAck] = useState(false)
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  if (!project) {
    return (
      <Modal open={open} onClose={onClose} title="Project tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Project sudah dihapus atau ID tidak valid.</div>
      </Modal>
    )
  }

  const priority = project.priority
  const isKadivStep = nextStep?.type === 'kadiv_approval'
  const isOsmStep = nextStep?.type === 'osm_approval'
  const isDmoStep = nextStep?.type === 'dmo_approval'
  const isProjectOwnerStep =
    nextStep?.type === 'kickoff_meeting' || nextStep?.type === 'risk_assessment'

  // Permission gate: hanya role yang tepat boleh aksi step ini
  const permResult = useMemo(() => {
    if (!nextStep) return { allowed: false, reason: 'Tidak ada step pending' }
    if (isKadivStep) {
      // Kadiv harus berasal dari divisi yang sama dengan creator project
      const creator = project.createdByUserId
      void creator
      return can('project.approveAsKadiv', { teamId: user?.teamId ?? null })
    }
    if (isOsmStep) return can('project.approveAsOSM')
    if (isDmoStep) return can('project.approveAsDMO')
    if (isProjectOwnerStep) {
      // Project Owner = pembuat project atau role dengan canEditProject
      const isOwner = user?.id === project.createdByUserId
      const canEdit = can('project.edit').allowed
      if (isOwner || canEdit) return { allowed: true, reason: undefined }
      return { allowed: false, reason: 'Hanya Project Owner yang dapat mark step ini' }
    }
    return { allowed: false, reason: 'Step tidak dapat diproses' }
  }, [nextStep, isKadivStep, isOsmStep, isDmoStep, isProjectOwnerStep, can, user, project])

  const handleApprove = () => {
    if (!user || !nextStep) return
    const result = approveStep(project.id, nextStep.id, user.id, user.name, {
      comment: comment.trim() || undefined,
      riskAcknowledged: riskAck,
      acknowledgedChecklist: checklistAck,
    })
    if (!result.ok) {
      toast.error(result.error || 'Gagal approve step')
      return
    }
    if (result.activated) {
      toast.success(`Project "${project.name}" sekarang AKTIF`)
    } else {
      toast.success(`Step "${nextStep.label}" disetujui`)
    }
    onClose()
  }

  const handleReject = () => {
    if (!user || !nextStep) return
    if (!rejectReason.trim()) {
      toast.error('Alasan reject wajib diisi')
      return
    }
    const result = rejectStep(project.id, nextStep.id, user.id, user.name, rejectReason)
    if (!result.ok) {
      toast.error(result.error || 'Gagal reject step')
      return
    }
    toast.success(`Project "${project.name}" ditolak`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approval Project"
      description={`${project.code} · ${project.name}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* === Project header === */}
        <div className="rounded-lg border border-border-subtle bg-black/[0.02] px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-ink-tertiary">
                <span className="font-mono">{project.code}</span>
                <span>·</span>
                <span>{project.customer || 'Internal'}</span>
              </div>
              <div className="mt-0.5 truncate text-[14px] font-semibold text-ink-primary">
                {project.name}
              </div>
              {project.description && (
                <p className="mt-1 text-[12px] text-ink-secondary line-clamp-2">{project.description}</p>
              )}
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[11px] font-bold"
              style={{ borderColor: PRIORITY_HEX[priority], color: PRIORITY_HEX[priority] }}
            >
              {PRIORITY_LABELS[priority].toUpperCase()}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-tertiary">
            <span>Mulai: {project.plannedStartDate ? new Date(project.plannedStartDate).toLocaleDateString() : '—'}</span>
            <span>·</span>
            <span>Target: {project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : '—'}</span>
            <span>·</span>
            <span>oleh {project.createdByName}</span>
          </div>
        </div>

        {/* === Approval flow timeline === */}
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Alur Approval ({project.approvalFlow.length} step)
          </div>
          <div className="space-y-1.5">
            {project.approvalFlow.map((step) => (
              <StepRow key={step.id} step={step} isCurrent={step.id === nextStep?.id} />
            ))}
          </div>
        </div>

        {/* === Action panel === */}
        {!nextStep && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-[12px] text-emerald-800">
            Semua step approval sudah selesai. Project sudah aktif atau ditolak.
          </div>
        )}

        {nextStep && !permResult.allowed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] text-amber-800">
            <ShieldAlert size={12} className="-mt-0.5 mr-1 inline" />
            {permResult.reason || 'Anda tidak memiliki akses ke step ini.'}
          </div>
        )}

        {nextStep && permResult.allowed && mode === null && nextStep.type === 'kickoff_meeting' && (
          <KickoffPanel
            project={project}
            onApproved={() => {
              if (!user) return
              const result = approveStep(project.id, nextStep.id, user.id, user.name, {})
              if (!result.ok) toast.error(result.error ?? 'Gagal approve step')
              else onClose()
            }}
            onCancel={() => setMode('reject')}
          />
        )}

        {nextStep && permResult.allowed && mode === null && nextStep.type === 'risk_assessment' && (
          <RiskRegisterPanel
            project={project}
            asApprovalStep
            onApproved={() => {
              if (!user) return
              const result = approveStep(project.id, nextStep.id, user.id, user.name, {})
              if (!result.ok) toast.error(result.error ?? 'Gagal approve step')
              else {
                toast.success('Risk Assessment selesai')
                onClose()
              }
            }}
            onCancel={() => setMode('reject')}
          />
        )}

        {nextStep && permResult.allowed && mode === null && nextStep.type !== 'kickoff_meeting' && nextStep.type !== 'risk_assessment' && (
          <div className="rounded-lg border border-border-subtle bg-white p-3">
            <div className="mb-2 text-[12px] font-semibold text-ink-primary">
              Aksi: {APPROVAL_STEP_LABELS[nextStep.type]}
            </div>
            <div className="text-[11px] text-ink-secondary">
              {actionHint(nextStep, priority)}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setMode('approve')}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
              <button
                onClick={() => setMode('reject')}
                className="rounded-md border border-pertamina-red/40 bg-white px-3 py-1.5 text-[12px] font-medium text-pertamina-red hover:bg-pertamina-red-50/60 transition"
              >
                <XCircle size={14} className="-mt-0.5 mr-1 inline" />
                Reject
              </button>
            </div>
          </div>
        )}

        {nextStep && permResult.allowed && mode === 'approve' && (
          <ApprovePanel
            step={nextStep}
            priority={priority}
            comment={comment}
            setComment={setComment}
            riskAck={riskAck}
            setRiskAck={setRiskAck}
            checklistAck={checklistAck}
            setChecklistAck={setChecklistAck}
            onCancel={() => setMode(null)}
            onSubmit={handleApprove}
          />
        )}

        {nextStep && permResult.allowed && mode === 'reject' && (
          <RejectPanel
            step={nextStep}
            reason={rejectReason}
            setReason={setRejectReason}
            onCancel={() => setMode(null)}
            onSubmit={handleReject}
          />
        )}
      </div>
    </Modal>
  )
}

function actionHint(step: ApprovalStep, priority: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (step.type) {
    case 'kadiv_approval':
      if (priority === 'low') return 'Sebagai Kadiv divisi creator, centang checklist konfirmasi project ini.'
      if (priority === 'critical') return 'Sebagai Kadiv, berikan komentar dan acknowledge risiko project critical ini.'
      return 'Sebagai Kadiv divisi creator, berikan komentar approval. Step ini adalah review internal divisi sebelum eskalasi ke OSM/DMO.'
    case 'kickoff_meeting':
      return 'Catat Kickoff Meeting (agenda, attendees, keputusan, action items).'
    case 'risk_assessment':
      return 'Susun Risk Register — minimal 1 risiko dengan severity (probability × impact) + mitigation plan.'
    case 'osm_approval':
      if (priority === 'low') return 'Centang checklist konfirmasi sebagai OSM Approver.'
      if (priority === 'critical') return 'Berikan komentar approval + acknowledgement bahwa risiko sudah ditinjau.'
      return 'Berikan komentar approval sebagai OSM Approver.'
    case 'dmo_approval':
      if (priority === 'low') return 'Centang checklist konfirmasi sebagai DMO Approver.'
      if (priority === 'critical') return 'Berikan komentar approval + acknowledgement bahwa risiko sudah ditinjau.'
      return 'Berikan komentar approval sebagai DMO Approver.'
    default:
      return ''
  }
}

function StepRow({ step, isCurrent }: { step: ApprovalStep; isCurrent: boolean }) {
  const color = APPROVAL_STEP_STATUS_COLORS[step.status]
  return (
    <div
      className={classNames(
        'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]',
        isCurrent
          ? 'border-amber-300 bg-amber-50/70'
          : 'border-border-subtle bg-white',
      )}
    >
      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: `${color}22`, color }}>
        {step.status === 'approved' ? (
          <CheckCircle2 size={11} />
        ) : step.status === 'rejected' ? (
          <XCircle size={11} />
        ) : (
          <Clock size={11} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-medium text-ink-primary">
          <span>{step.order}.</span>
          <span>{step.label}</span>
          {isCurrent && (
            <span className="rounded-full bg-amber-200 px-1.5 py-0 text-[9px] font-bold uppercase text-amber-800">
              Sekarang
            </span>
          )}
        </div>
        {step.approvedByName && (
          <div className="text-[10px] text-ink-tertiary">
            oleh {step.approvedByName} · {step.approvedAt ? relativeTime(step.approvedAt) : ''}
          </div>
        )}
        {step.comment && (
          <div className="mt-0.5 italic text-ink-secondary">"{step.comment}"</div>
        )}
        {step.rejectedReason && (
          <div className="mt-0.5 text-pertamina-red">Reject: {step.rejectedReason}</div>
        )}
      </div>
      <span
        className="rounded-full px-1.5 py-0 text-[9px] font-semibold uppercase"
        style={{ color, background: `${color}15` }}
      >
        {APPROVAL_STEP_STATUS_LABELS[step.status]}
      </span>
    </div>
  )
}

function ApprovePanel({
  step,
  priority,
  comment,
  setComment,
  riskAck,
  setRiskAck,
  checklistAck,
  setChecklistAck,
  onCancel,
  onSubmit,
}: {
  step: ApprovalStep
  priority: 'low' | 'medium' | 'high' | 'critical'
  comment: string
  setComment: (v: string) => void
  riskAck: boolean
  setRiskAck: (v: boolean) => void
  checklistAck: boolean
  setChecklistAck: (v: boolean) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const isLowChecklist =
    priority === 'low' && (step.type === 'osm_approval' || step.type === 'dmo_approval' || step.type === 'kadiv_approval')
  const needsComment = step.requireComment
  const needsRiskAck = step.requireRiskAck

  const valid =
    (!isLowChecklist || checklistAck) &&
    (!needsComment || comment.trim().length > 0) &&
    (!needsRiskAck || riskAck)

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      <div className="mb-2 text-[12px] font-semibold text-emerald-800">
        Approve: {APPROVAL_STEP_LABELS[step.type]}
      </div>

      {isLowChecklist && (
        <label className="mb-2 flex items-start gap-2 text-[12px] text-ink-primary">
          <input
            type="checkbox"
            checked={checklistAck}
            onChange={(e) => setChecklistAck(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Saya telah <strong>mengetahui</strong> project ini dan menyetujui sebagai{' '}
            {step.type === 'osm_approval' ? 'OSM Approver' :
              step.type === 'dmo_approval' ? 'DMO Approver' : 'Kadiv'}.
          </span>
        </label>
      )}

      {needsComment && (
        <div className="mb-2">
          <Textarea
            label={`Komentar Approval ${needsComment ? '*' : ''}`}
            placeholder="Catatan approval, kondisi, atau saran..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {needsRiskAck && (
        <label className="mb-2 flex items-start gap-2 rounded-md border border-pertamina-red/30 bg-pertamina-red-50/40 p-2 text-[12px]">
          <input
            type="checkbox"
            checked={riskAck}
            onChange={(e) => setRiskAck(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-pertamina-red">
            <strong>Risk Acknowledgement</strong> — Saya telah meninjau Risk Assessment project ini dan menerima eksposur risiko yang melekat.
          </span>
        </label>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Batal
        </button>
        <button
          onClick={onSubmit}
          disabled={!valid}
          className={classNames('btn-primary inline-flex items-center gap-1.5', !valid && 'opacity-50 cursor-not-allowed')}
        >
          <CheckCircle2 size={14} />
          Konfirmasi Approve
        </button>
      </div>
    </div>
  )
}

function RejectPanel({
  step,
  reason,
  setReason,
  onCancel,
  onSubmit,
}: {
  step: ApprovalStep
  reason: string
  setReason: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="rounded-lg border border-pertamina-red/30 bg-pertamina-red-50/40 p-3">
      <div className="mb-2 text-[12px] font-semibold text-pertamina-red">
        Reject: {APPROVAL_STEP_LABELS[step.type]}
      </div>
      <div className="mb-2 text-[11px] text-ink-secondary">
        Menolak step ini akan menandai project sebagai <strong>Ditolak</strong>. Project tidak akan diaktifkan.
      </div>
      <Textarea
        label="Alasan Reject *"
        placeholder="Jelaskan alasan penolakan..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Batal
        </button>
        <button
          onClick={onSubmit}
          disabled={!reason.trim()}
          className={classNames(
            'rounded-md border border-pertamina-red bg-pertamina-red px-3 py-1.5 text-[12px] font-medium text-white hover:bg-pertamina-red/90 transition inline-flex items-center gap-1.5',
            !reason.trim() && 'opacity-50 cursor-not-allowed',
          )}
        >
          <XCircle size={14} />
          Konfirmasi Reject
        </button>
      </div>
    </div>
  )
}
