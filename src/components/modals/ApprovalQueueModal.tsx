import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useApprovalQueue } from '../../hooks/useApprovalQueue'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { useSegmentRequestStore } from '../../store/useSegmentRequestStore'
import { useProjectStore, getNextPendingStep } from '../../store/useProjectStore'
import { usePermissions } from '../../hooks/usePermissions'
import { ArrowRightLeft, CheckCircle2, Clock, FileCheck2, Inbox, ShieldAlert, Trash2, XCircle, Settings2 } from 'lucide-react'
import { classNames, relativeTime } from '../../utils/helpers'
import { APPROVAL_STEP_LABELS, PRIORITY_HEX, PRIORITY_LABELS } from '../../utils/colors'
import type { ApprovalStep, DeleteRequest, DeleteRequestStatus, HandoffRequest, HandoffRequestStatus, Project, SegmentChangeRequest, SegmentChangeStatus } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'actionable' | 'mine'

export function ApprovalQueueModal({ open, onClose }: Props) {
  const { originStage, targetStage, deleteStage, mine, myDeletes, actionableCount } = useApprovalQueue()
  const { user, can } = usePermissions()
  const segmentApprovePerm = can('segment.approve')
  const osmPerm = can('project.approveAsOSM')
  const dmoPerm = can('project.approveAsDMO')
  const kadivPerm = can('project.approveAsKadiv')
  const allSegmentRequests = useSegmentRequestStore((s) => s.requests)
  const allProjects = useProjectStore((s) => s.projects)
  const pendingSegments = allSegmentRequests.filter((r) => r.status === 'pending')
  const mySegments = user ? allSegmentRequests.filter((r) => r.requestedByUserId === user.id) : []

  // P1: project approval queue — filter by step type + user permission
  const pendingProjects = allProjects.filter((p) => p.status === 'pending_approval')
  const kadivPendingProjects = pendingProjects.filter((p) => {
    const next = getNextPendingStep(p.approvalFlow)
    return next?.type === 'kadiv_approval'
  })
  const osmPendingProjects = pendingProjects.filter((p) => {
    const next = getNextPendingStep(p.approvalFlow)
    return next?.type === 'osm_approval'
  })
  const dmoPendingProjects = pendingProjects.filter((p) => {
    const next = getNextPendingStep(p.approvalFlow)
    return next?.type === 'dmo_approval'
  })
  const ownerPendingProjects = user
    ? pendingProjects.filter((p) => {
        const next = getNextPendingStep(p.approvalFlow)
        const isOwnerStep = next?.type === 'kickoff_meeting' || next?.type === 'risk_assessment'
        return isOwnerStep && (p.createdByUserId === user.id || can('project.edit').allowed)
      })
    : []
  const myProjects = user ? allProjects.filter((p) => p.createdByUserId === user.id && p.status === 'pending_approval') : []

  const [tab, setTab] = useState<Tab>('actionable')
  const mineCount = mine.length + myDeletes.length + mySegments.length + myProjects.length
  const projectActionableCount =
    (kadivPerm.allowed ? kadivPendingProjects.length : 0) +
    (osmPerm.allowed ? osmPendingProjects.length : 0) +
    (dmoPerm.allowed ? dmoPendingProjects.length : 0) +
    ownerPendingProjects.length
  const totalActionable =
    actionableCount + (segmentApprovePerm.allowed ? pendingSegments.length : 0) + projectActionableCount

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Antrian Approval"
      description="Request handoff antar divisi yang perlu ditinjau"
      size="xl"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <TabButton active={tab === 'actionable'} onClick={() => setTab('actionable')} count={totalActionable}>
            Perlu Tindakan
          </TabButton>
          <TabButton active={tab === 'mine'} onClick={() => setTab('mine')} count={mineCount}>
            Saya Ajukan
          </TabButton>
        </div>

        {tab === 'actionable' ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {ownerPendingProjects.length > 0 && (
              <ProjectSection
                title="Project: Tindakan Project Owner"
                hint="Tandai Kickoff Meeting / Risk Assessment yang sudah dilakukan untuk project yang Anda buat."
                icon={<FileCheck2 size={13} className="text-violet-700" />}
                projects={ownerPendingProjects}
                emptyText=""
              />
            )}
            {kadivPerm.allowed && (
              <ProjectSection
                title="Project: Persetujuan Kadiv"
                hint="Sebagai Kadiv, review project yang baru di-submit oleh divisi Anda sebelum eskalasi ke OSM/DMO."
                icon={<FileCheck2 size={13} className="text-violet-700" />}
                projects={kadivPendingProjects}
                emptyText="Tidak ada project menunggu approval Kadiv."
              />
            )}
            {osmPerm.allowed && (
              <ProjectSection
                title="Project: OSM Approval"
                hint="Sebagai OSM Approver, tinjau project yang menunggu persetujuan Anda."
                icon={<FileCheck2 size={13} className="text-emerald-700" />}
                projects={osmPendingProjects}
                emptyText="Tidak ada project menunggu OSM approval."
              />
            )}
            {dmoPerm.allowed && (
              <ProjectSection
                title="Project: DMO Approval"
                hint="Sebagai DMO Approver, tinjau project yang menunggu persetujuan akhir."
                icon={<FileCheck2 size={13} className="text-blue-700" />}
                projects={dmoPendingProjects}
                emptyText="Tidak ada project menunggu DMO approval."
              />
            )}
            <Section
              title="Persetujuan Asal"
              hint="Sebagai Kadiv divisi asal, Anda perlu menyetujui sebelum diteruskan."
              icon={<ShieldAlert size={13} className="text-amber-700" />}
              requests={originStage}
              emptyText="Tidak ada request menunggu persetujuan asal."
            />
            <Section
              title="Konfirmasi Tujuan"
              hint="Sebagai Kadiv divisi tujuan, konfirmasi penerimaan + pilih team & assignee."
              icon={<Inbox size={13} className="text-blue-700" />}
              requests={targetStage}
              emptyText="Tidak ada project masuk menunggu konfirmasi Anda."
            />
            <DeleteSection
              title="Usulan Hapus Tugas"
              hint="Sebagai Kadiv, setujui atau tolak permintaan hapus tugas dari anggota divisi Anda."
              icon={<Trash2 size={13} className="text-pertamina-red" />}
              requests={deleteStage}
              emptyText="Tidak ada usulan hapus menunggu approval."
            />
            {segmentApprovePerm.allowed && (
              <SegmentSection
                title="Perubahan Kolom Kanban"
                hint="Sebagai Super Admin atau Kadep, setujui atau tolak request tambah/hapus kolom di divisi."
                icon={<Settings2 size={13} className="text-amber-700" />}
                requests={pendingSegments}
                emptyText="Tidak ada request perubahan kolom menunggu approval."
              />
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                Project Saya ({myProjects.length})
              </div>
              <div className="space-y-2">
                {myProjects.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-[12px] text-ink-tertiary">
                    Belum ada project pending Anda buat.
                  </div>
                ) : (
                  myProjects.map((p) => <ProjectRow key={p.id} project={p} />)
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                Handoff ({mine.length})
              </div>
              <div className="space-y-2">
                {mine.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-[12px] text-ink-tertiary">
                    Belum pernah mengajukan handoff.
                  </div>
                ) : (
                  mine.map((r) => <RequestRow key={r.id} request={r} />)
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                Usul Hapus ({myDeletes.length})
              </div>
              <div className="space-y-2">
                {myDeletes.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-[12px] text-ink-tertiary">
                    Belum pernah mengusulkan penghapusan.
                  </div>
                ) : (
                  myDeletes.map((r) => <DeleteRow key={r.id} request={r} />)
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                Perubahan Kolom ({mySegments.length})
              </div>
              <div className="space-y-2">
                {mySegments.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border-subtle px-4 py-6 text-center text-[12px] text-ink-tertiary">
                    Belum pernah mengajukan perubahan kolom.
                  </div>
                ) : (
                  mySegments.map((r) => <SegmentRow key={r.id} request={r} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function TabButton({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition',
        active
          ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red'
          : 'border-border bg-white text-ink-secondary hover:text-ink-primary hover:bg-black/[0.03]',
      )}
    >
      {children}
      <span
        className={classNames(
          'inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-semibold min-w-[18px]',
          active ? 'bg-pertamina-red text-white' : 'bg-black/[0.08] text-ink-secondary',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function Section({
  title,
  hint,
  icon,
  requests,
  emptyText,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  requests: HandoffRequest[]
  emptyText: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h4 className="text-[12px] font-semibold tracking-tight text-ink-primary">{title}</h4>
        <span className="text-[10px] text-ink-tertiary">· {requests.length} item</span>
      </div>
      <div className="text-[11px] text-ink-tertiary mb-2">{hint}</div>
      <div className="space-y-2">
        {requests.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-center text-[11px] text-ink-tertiary">
            {emptyText}
          </div>
        ) : (
          requests.map((r) => <RequestRow key={r.id} request={r} />)
        )}
      </div>
    </div>
  )
}

function RequestRow({ request }: { request: HandoffRequest }) {
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)
  const fromTeam = teams.find((t) => t.id === request.fromTeamId)
  const toTeam = teams.find((t) => t.id === request.toTeamId)
  return (
    <button
      onClick={() => openModal({ type: 'approval-detail', requestId: request.id })}
      className="w-full text-left rounded-lg border border-border-subtle bg-white px-3 py-2.5 hover:border-pertamina-red/40 hover:bg-pertamina-red-50/30 transition"
    >
      <div className="flex items-start gap-3">
        <StatusIcon status={request.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-ink-primary font-medium truncate">
            {request.taskTitle}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span className="font-mono font-bold" style={{ color: fromTeam?.color }}>{fromTeam?.acronym ?? '?'}</span>
            <ArrowRightLeft size={11} className="text-ink-tertiary" />
            <span className="font-mono font-bold" style={{ color: toTeam?.color }}>{toTeam?.acronym ?? '?'}</span>
            <span className="text-ink-tertiary">· oleh {request.requestedByName}</span>
          </div>
          {request.reason && (
            <div className="mt-1 text-[11px] text-ink-secondary line-clamp-2">{request.reason}</div>
          )}
        </div>
        <div className="text-right">
          <StatusChip status={request.status} />
          <div className="mt-1 text-[10px] text-ink-tertiary">{relativeTime(request.createdAt)}</div>
        </div>
      </div>
    </button>
  )
}

function StatusIcon({ status }: { status: HandoffRequestStatus }) {
  switch (status) {
    case 'pending_origin':
      return <Clock size={14} className="mt-0.5 text-amber-700" />
    case 'pending_target':
      return <Inbox size={14} className="mt-0.5 text-blue-700" />
    case 'approved':
      return <CheckCircle2 size={14} className="mt-0.5 text-emerald-700" />
    case 'rejected':
      return <XCircle size={14} className="mt-0.5 text-pertamina-red" />
  }
}

function StatusChip({ status }: { status: HandoffRequestStatus }) {
  const map: Record<HandoffRequestStatus, { label: string; cls: string }> = {
    pending_origin: { label: 'Menunggu Kadiv Asal', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    pending_target: { label: 'Menunggu Kadiv Tujuan', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Ditolak', cls: 'bg-pertamina-red-50 text-pertamina-red border-pertamina-red/30' },
  }
  const m = map[status]
  return <span className={classNames('chip border whitespace-nowrap', m.cls)}>{m.label}</span>
}

function DeleteSection({
  title,
  hint,
  icon,
  requests,
  emptyText,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  requests: DeleteRequest[]
  emptyText: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h4 className="text-[12px] font-semibold tracking-tight text-ink-primary">{title}</h4>
        <span className="text-[10px] text-ink-tertiary">· {requests.length} item</span>
      </div>
      <div className="text-[11px] text-ink-tertiary mb-2">{hint}</div>
      <div className="space-y-2">
        {requests.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-center text-[11px] text-ink-tertiary">
            {emptyText}
          </div>
        ) : (
          requests.map((r) => <DeleteRow key={r.id} request={r} />)
        )}
      </div>
    </div>
  )
}

function DeleteRow({ request }: { request: DeleteRequest }) {
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)
  const team = teams.find((t) => t.id === request.taskTeamId)
  return (
    <button
      onClick={() => openModal({ type: 'delete-request-detail', requestId: request.id })}
      className="w-full text-left rounded-lg border border-border-subtle bg-white px-3 py-2.5 hover:border-pertamina-red/40 hover:bg-pertamina-red-50/30 transition"
    >
      <div className="flex items-start gap-3">
        <DeleteStatusIcon status={request.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-ink-primary font-medium truncate">
            {request.taskTitle}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <Trash2 size={11} className="text-pertamina-red" />
            <span className="font-mono font-bold" style={{ color: team?.color }}>{team?.acronym ?? '?'}</span>
            <span className="text-ink-tertiary">· oleh {request.requestedByName}</span>
          </div>
          {request.reason && <div className="mt-1 text-[11px] text-ink-secondary line-clamp-2">{request.reason}</div>}
        </div>
        <div className="text-right">
          <DeleteStatusChip status={request.status} />
          <div className="mt-1 text-[10px] text-ink-tertiary">{relativeTime(request.createdAt)}</div>
        </div>
      </div>
    </button>
  )
}

function DeleteStatusIcon({ status }: { status: DeleteRequestStatus }) {
  if (status === 'pending') return <Clock size={14} className="mt-0.5 text-pertamina-red" />
  if (status === 'approved') return <CheckCircle2 size={14} className="mt-0.5 text-emerald-700" />
  return <XCircle size={14} className="mt-0.5 text-pertamina-red" />
}

function DeleteStatusChip({ status }: { status: DeleteRequestStatus }) {
  const map: Record<DeleteRequestStatus, { label: string; cls: string }> = {
    pending: { label: 'Menunggu Kadiv', cls: 'bg-pertamina-red-50 text-pertamina-red border-pertamina-red/30' },
    approved: { label: 'Disetujui · Dihapus', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Ditolak', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  }
  const m = map[status]
  return <span className={classNames('chip border whitespace-nowrap', m.cls)}>{m.label}</span>
}

function SegmentSection({
  title,
  hint,
  icon,
  requests,
  emptyText,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  requests: SegmentChangeRequest[]
  emptyText: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h4 className="text-[12px] font-semibold tracking-tight text-ink-primary">{title}</h4>
        <span className="text-[10px] text-ink-tertiary">· {requests.length} item</span>
      </div>
      <div className="text-[11px] text-ink-tertiary mb-2">{hint}</div>
      <div className="space-y-2">
        {requests.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-center text-[11px] text-ink-tertiary">
            {emptyText}
          </div>
        ) : (
          requests.map((r) => <SegmentRow key={r.id} request={r} />)
        )}
      </div>
    </div>
  )
}

function SegmentRow({ request }: { request: SegmentChangeRequest }) {
  const openModal = useUIStore((s) => s.openModal)
  return (
    <button
      onClick={() => openModal({ type: 'segment-request-detail', requestId: request.id })}
      className="w-full text-left rounded-lg border border-border-subtle bg-white px-3 py-2.5 hover:border-pertamina-red/40 hover:bg-pertamina-red-50/30 transition"
    >
      <div className="flex items-start gap-3">
        <SegmentStatusIcon status={request.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-ink-primary font-medium truncate">
            {request.action === 'add' ? 'Tambah Kolom ' : 'Hapus Kolom '}
            {request.newColumn ? `"${request.newColumn.label}"` : ''}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <Settings2 size={11} className="text-amber-700" />
            <span className="text-ink-tertiary">di</span>
            <span className="font-medium text-ink-primary">{request.teamName}</span>
            <span className="text-ink-tertiary">· oleh {request.requestedByName}</span>
          </div>
          {request.reason && <div className="mt-1 text-[11px] text-ink-secondary line-clamp-2">{request.reason}</div>}
        </div>
        <div className="text-right">
          <SegmentStatusChip status={request.status} />
          <div className="mt-1 text-[10px] text-ink-tertiary">{relativeTime(request.createdAt)}</div>
        </div>
      </div>
    </button>
  )
}

function SegmentStatusIcon({ status }: { status: SegmentChangeStatus }) {
  if (status === 'pending') return <Clock size={14} className="mt-0.5 text-amber-700" />
  if (status === 'approved') return <CheckCircle2 size={14} className="mt-0.5 text-emerald-700" />
  return <XCircle size={14} className="mt-0.5 text-pertamina-red" />
}

function SegmentStatusChip({ status }: { status: SegmentChangeStatus }) {
  const map: Record<SegmentChangeStatus, { label: string; cls: string }> = {
    pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Ditolak', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  }
  const m = map[status]
  return <span className={classNames('chip border whitespace-nowrap', m.cls)}>{m.label}</span>
}

function ProjectSection({
  title,
  hint,
  icon,
  projects,
  emptyText,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  projects: Project[]
  emptyText: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h4 className="text-[12px] font-semibold tracking-tight text-ink-primary">{title}</h4>
        <span className="text-[10px] text-ink-tertiary">· {projects.length} item</span>
      </div>
      <div className="text-[11px] text-ink-tertiary mb-2">{hint}</div>
      <div className="space-y-2">
        {projects.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-center text-[11px] text-ink-tertiary">
            {emptyText}
          </div>
        ) : (
          projects.map((p) => <ProjectRow key={p.id} project={p} />)
        )}
      </div>
    </div>
  )
}

function ProjectRow({ project }: { project: Project }) {
  const openModal = useUIStore((s) => s.openModal)
  const nextStep: ApprovalStep | null = getNextPendingStep(project.approvalFlow)
  return (
    <button
      onClick={() => openModal({ type: 'project-approval', projectId: project.id })}
      className="w-full text-left rounded-lg border border-border-subtle bg-white px-3 py-2.5 hover:border-pertamina-red/40 hover:bg-pertamina-red-50/30 transition"
    >
      <div className="flex items-start gap-3">
        <Clock size={14} className="mt-0.5 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-ink-primary font-medium truncate">
            <span className="font-mono text-[10px] text-ink-tertiary">{project.code}</span>
            <span className="truncate">{project.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-bold uppercase"
              style={{ background: `${PRIORITY_HEX[project.priority]}18`, color: PRIORITY_HEX[project.priority] }}
            >
              {PRIORITY_LABELS[project.priority]}
            </span>
            <span className="text-ink-tertiary">·</span>
            <span className="text-ink-secondary">
              Step: {nextStep ? APPROVAL_STEP_LABELS[nextStep.type] : '—'}
            </span>
            <span className="text-ink-tertiary">· oleh {project.createdByName}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="chip border whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200">
            Menunggu Approval
          </span>
          <div className="mt-1 text-[10px] text-ink-tertiary">{relativeTime(project.createdAt)}</div>
        </div>
      </div>
    </button>
  )
}
