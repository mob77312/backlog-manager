import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useSegmentRequestStore } from '../../store/useSegmentRequestStore'
import { useTeamStore } from '../../store/useTeamStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Check, X } from 'lucide-react'
import { classNames, relativeTime } from '../../utils/helpers'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  requestId: string
}

export function SegmentRequestDetailModal({ open, onClose, requestId }: Props) {
  const request = useSegmentRequestStore((s) => s.requests.find((r) => r.id === requestId))
  const approve = useSegmentRequestStore((s) => s.approveRequest)
  const reject = useSegmentRequestStore((s) => s.rejectRequest)
  const team = useTeamStore((s) => s.teams.find((t) => t.id === request?.teamId))
  const { user, can } = usePermissions()
  const approvePerm = can('segment.approve')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectMode, setRejectMode] = useState(false)

  if (!request) return null

  const targetCol = request.removeColumnId
    ? team?.kanbanConfig?.find((c) => c.id === request.removeColumnId)
    : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request Perubahan Kolom — ${request.teamName}`}
      description={`Diajukan oleh ${request.requestedByName} · ${relativeTime(request.createdAt)}`}
      size="xl"
    >
      <div className="space-y-3">
        <div className="surface rounded-md p-3 text-[13px]">
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Aksi</div>
          <div className="font-semibold text-ink-primary mb-2">
            {request.action === 'add' ? 'Tambah Kolom Baru' : 'Hapus Kolom'}
          </div>
          {request.action === 'add' && request.newColumn && (
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <Field label="Nama">{request.newColumn.label}</Field>
              <Field label="Key">{request.newColumn.key}</Field>
              <Field label="Posisi">{request.newColumn.position}</Field>
              <Field label="Warna">
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: request.newColumn.color }} />
                  {request.newColumn.color}
                </span>
              </Field>
              <Field label="Terminal">{request.newColumn.isTerminal ? 'Ya' : 'Tidak'}</Field>
              <Field label="Sedang dikerjakan">{request.newColumn.isInProgress ? 'Ya' : 'Tidak'}</Field>
            </div>
          )}
          {request.action === 'remove' && (
            <div className="text-[12px]">
              <div className="mb-1">Kolom: <span className="font-semibold text-ink-primary">{targetCol?.label ?? '(sudah dihapus)'}</span></div>
              {request.moveTasksToColumnKey && (
                <div className="text-ink-tertiary">
                  Task akan dipindahkan ke kolom dengan key: <code className="font-mono">{request.moveTasksToColumnKey}</code>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Alasan</div>
          <p className="text-sm text-ink-secondary whitespace-pre-wrap">{request.reason}</p>
        </div>

        {request.status !== 'pending' && (
          <div
            className={classNames(
              'rounded-md p-2 text-[12px]',
              request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
            )}
          >
            <strong>{request.status === 'approved' ? 'Disetujui' : 'Ditolak'}</strong> oleh {request.reviewedByName} ({relativeTime(request.reviewedAt ?? request.updatedAt)})
            {request.rejectedReason && <div className="mt-1">Alasan: {request.rejectedReason}</div>}
          </div>
        )}

        {request.status === 'pending' && approvePerm.allowed && user && (
          <div className="border-t border-border-subtle pt-3 space-y-2">
            {rejectMode ? (
              <>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Alasan menolak..."
                  className="input-base min-h-[80px]"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setRejectMode(false)} className="btn-ghost">
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (!rejectReason.trim()) return toast.error('Alasan wajib diisi')
                      reject(request.id, user.id, user.name, rejectReason)
                      toast.success('Request ditolak')
                      onClose()
                    }}
                    className="btn-danger"
                  >
                    Tolak Request
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-end gap-2">
                <button onClick={() => setRejectMode(true)} className="btn-danger">
                  <X size={13} /> Tolak
                </button>
                <button
                  onClick={() => {
                    const r = approve(request.id, user.id, user.name)
                    if (!r.ok) toast.error(r.error ?? 'Gagal')
                    else {
                      toast.success('Request disetujui — kolom diperbarui')
                      onClose()
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <Check size={13} /> Setujui
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-tertiary">{label}</div>
      <div className="text-ink-primary">{children}</div>
    </div>
  )
}
