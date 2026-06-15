import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Input'
import { useDeleteRequestStore } from '../../store/useDeleteRequestStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useTaskStore } from '../../store/useTaskStore'
import { usePermissions } from '../../hooks/usePermissions'
import { AlertTriangle, CheckCircle2, Clock, MessageSquareWarning, ShieldAlert, Trash2, XCircle } from 'lucide-react'
import { classNames, formatDateTime, relativeTime } from '../../utils/helpers'
import { PriorityBadge } from '../ui/Badge'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  requestId: string
}

export function DeleteRequestDetailModal({ open, onClose, requestId }: Props) {
  const request = useDeleteRequestStore((s) => s.requests.find((r) => r.id === requestId))
  const approve = useDeleteRequestStore((s) => s.approve)
  const reject = useDeleteRequestStore((s) => s.reject)
  const team = useTeamStore((s) => (request ? s.getTeam(request.taskTeamId) : undefined))
  const dept = useTeamStore((s) =>
    request?.taskDepartmentId ? s.getDepartment(request.taskTeamId, request.taskDepartmentId) : undefined,
  )
  const task = useTaskStore((s) => (request ? s.tasks.find((t) => t.id === request.taskId) : undefined))
  const { user, can } = usePermissions()
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectMode, setRejectMode] = useState(false)

  if (!request) return null

  const canAct =
    request.status === 'pending' &&
    can('task.delete', { teamId: request.taskTeamId, departmentId: request.taskDepartmentId }).allowed

  const handleApprove = () => {
    if (!user) return
    approve(request.id, user.id, user.name, note.trim() || undefined)
    toast.success('Request hapus disetujui — tugas dihapus')
    onClose()
  }

  const handleReject = () => {
    if (!user) return
    if (!rejectReason.trim()) return toast.error('Alasan penolakan wajib diisi')
    reject(request.id, user.id, user.name, rejectReason.trim())
    toast.success('Request hapus ditolak')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approval Request Hapus Tugas"
      description={request.taskTitle}
      size="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 space-y-3">
          {/* Task summary */}
          <div className="surface rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Tugas yang Akan Dihapus</div>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-primary">{request.taskTitle}</div>
                {task?.description && (
                  <div className="mt-1 text-[12px] text-ink-secondary line-clamp-3">{task.description}</div>
                )}
                <div className="mt-1 text-[11px] text-ink-tertiary">
                  {team?.acronym} • {team?.name}
                  {dept && ` → ${dept.name}`}
                </div>
              </div>
              {task && <PriorityBadge priority={task.priority} />}
            </div>
            {!task && (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800">
                Catatan: tugas sudah tidak ada di sistem (mungkin sudah dihapus oleh route lain).
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="surface rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Alasan Penghapusan</div>
            <div className="text-[13px] text-ink-secondary whitespace-pre-wrap">{request.reason}</div>
            <div className="mt-2 text-[11px] text-ink-tertiary">
              Diajukan oleh <strong className="text-ink-primary">{request.requestedByName}</strong> · {relativeTime(request.createdAt)}
            </div>
          </div>

          {/* Timeline */}
          <div className="surface rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">Timeline</div>
            <ol className="relative border-l border-border-subtle pl-4 space-y-2">
              <li className="relative">
                <span className="absolute -left-[22px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white border border-border text-amber-700">
                  <Clock size={11} />
                </span>
                <div className="text-[12px] text-ink-primary font-medium">Request dibuat</div>
                <div className="text-[10px] text-ink-tertiary">{relativeTime(request.createdAt)} · {formatDateTime(request.createdAt)}</div>
                <div className="text-[11px] text-ink-secondary mt-0.5">oleh {request.requestedByName}</div>
              </li>
              {request.reviewedAt && (
                <li className="relative">
                  <span className={classNames('absolute -left-[22px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white border border-border', request.status === 'rejected' ? 'text-pertamina-red' : 'text-emerald-700')}>
                    {request.status === 'rejected' ? <XCircle size={11} /> : <CheckCircle2 size={11} />}
                  </span>
                  <div className="text-[12px] text-ink-primary font-medium">
                    {request.status === 'rejected' ? 'Ditolak Kadiv' : 'Disetujui Kadiv — tugas dihapus'}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">{relativeTime(request.reviewedAt)} · {formatDateTime(request.reviewedAt)}</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    oleh {request.reviewedByName}
                    {request.decisionNote ? ` · "${request.decisionNote}"` : ''}
                  </div>
                </li>
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
              ✓ Disetujui. Tugas telah dihapus.
            </div>
          )}
          {request.status === 'rejected' && (
            <div className="rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 text-sm text-pertamina-red">
              ✕ Request ditolak. Tugas tetap aktif.
              {request.rejectedReason && <div className="mt-1 text-[12px]">Alasan: {request.rejectedReason}</div>}
            </div>
          )}

          {canAct ? (
            <>
              <div className="rounded-lg border border-pertamina-red/30 bg-pertamina-red-50/70 p-3 text-[12px] text-pertamina-red flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  Tindakan ini <strong>permanen</strong>. Setelah disetujui, tugas akan langsung dihapus dan tidak bisa dipulihkan.
                </div>
              </div>

              {!rejectMode ? (
                <>
                  <Textarea
                    label="Catatan persetujuan (opsional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tambahkan catatan untuk requester..."
                  />
                  <div className="flex gap-2 pt-2 border-t border-border-subtle">
                    <button className="btn-ghost flex-1" onClick={() => setRejectMode(true)}>
                      <XCircle size={14} /> Tolak
                    </button>
                    <button className="btn-danger flex-1" onClick={handleApprove}>
                      <Trash2 size={14} /> Setujui & Hapus
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Textarea
                    label="Alasan penolakan (wajib)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Jelaskan kenapa request hapus ini ditolak..."
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
            request.status === 'pending' && (
              <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[12px] text-ink-secondary flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 text-pertamina-red" />
                <div>Hanya Kadiv {team?.acronym} (atau Super Admin) yang dapat menyetujui penghapusan ini.</div>
              </div>
            )
          )}

          <button className="btn-ghost w-full" onClick={onClose}>Tutup</button>

          {request.status === 'pending' && user?.id === request.requestedByUserId && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-700 flex items-start gap-1.5">
              <MessageSquareWarning size={12} className="mt-0.5" />
              Anda akan dapat notifikasi saat Kadiv menyetujui atau menolak.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
