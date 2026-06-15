import { useMemo } from 'react'
import { useHandoffStore } from '../../store/useHandoffStore'
import { useDeleteRequestStore } from '../../store/useDeleteRequestStore'
import { ArrowRightLeft, CheckCircle2, ClipboardCheck, Clock, Inbox, Trash2, XCircle } from 'lucide-react'
import { differenceInHours } from 'date-fns'
import { classNames } from '../../utils/helpers'

function formatHours(hours: number): string {
  if (hours < 1) return `< 1 jam`
  if (hours < 24) return `${Math.round(hours)} jam`
  const days = Math.floor(hours / 24)
  const remHours = Math.round(hours % 24)
  return remHours > 0 ? `${days}h ${remHours}j` : `${days}h`
}

export function ApprovalInsights() {
  const handoffs = useHandoffStore((s) => s.requests)
  const deletes = useDeleteRequestStore((s) => s.requests)

  const insights = useMemo(() => {
    const pendingOrigin = handoffs.filter((r) => r.status === 'pending_origin').length
    const pendingTarget = handoffs.filter((r) => r.status === 'pending_target').length
    const pendingDelete = deletes.filter((r) => r.status === 'pending').length

    const approvedHandoffs = handoffs.filter((r) => r.status === 'approved' && r.originReviewedAt)
    const avgOriginHours =
      approvedHandoffs.length > 0
        ? approvedHandoffs.reduce((acc, r) => acc + differenceInHours(new Date(r.originReviewedAt!), new Date(r.createdAt)), 0) /
          approvedHandoffs.length
        : 0

    const fullyApproved = handoffs.filter((r) => r.status === 'approved' && r.targetReviewedAt)
    const avgFullHours =
      fullyApproved.length > 0
        ? fullyApproved.reduce((acc, r) => acc + differenceInHours(new Date(r.targetReviewedAt!), new Date(r.createdAt)), 0) /
          fullyApproved.length
        : 0

    const totalRequests = handoffs.length + deletes.length
    const rejected =
      handoffs.filter((r) => r.status === 'rejected').length + deletes.filter((r) => r.status === 'rejected').length
    const rejectionRate = totalRequests > 0 ? (rejected / totalRequests) * 100 : 0

    return {
      pendingOrigin,
      pendingTarget,
      pendingDelete,
      avgOriginHours,
      avgFullHours,
      rejectionRate,
      approvedCount: fullyApproved.length,
    }
  }, [handoffs, deletes])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck size={13} className="text-pertamina-red" />
          <h3 className="text-sm font-semibold text-ink-primary">Insight Approval</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Pending breakdown */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1.5">Pending Saat Ini</div>
          <div className="space-y-1.5">
            <PendingRow
              icon={<Clock size={11} />}
              tone="text-amber-700"
              bg="bg-amber-50 border-amber-200"
              label="Handoff — Persetujuan Asal"
              count={insights.pendingOrigin}
            />
            <PendingRow
              icon={<Inbox size={11} />}
              tone="text-blue-700"
              bg="bg-blue-50 border-blue-200"
              label="Handoff — Konfirmasi Tujuan"
              count={insights.pendingTarget}
            />
            <PendingRow
              icon={<Trash2 size={11} />}
              tone="text-pertamina-red"
              bg="bg-pertamina-red-50 border-pertamina-red/30"
              label="Usul Hapus Tugas"
              count={insights.pendingDelete}
            />
          </div>
        </div>

        {/* Avg time */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1.5">Rata-Rata Waktu</div>
          <div className="grid grid-cols-2 gap-1.5">
            <Metric
              label="Asal → Approval"
              value={insights.avgOriginHours > 0 ? formatHours(insights.avgOriginHours) : '—'}
              icon={<ArrowRightLeft size={11} className="text-amber-700" />}
            />
            <Metric
              label="Asal → Selesai"
              value={insights.avgFullHours > 0 ? formatHours(insights.avgFullHours) : '—'}
              icon={<CheckCircle2 size={11} className="text-emerald-700" />}
            />
          </div>
        </div>

        {/* Rejection rate */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1.5">Tingkat Penolakan</div>
          <div className="rounded-lg border border-border-subtle bg-white p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-ink-secondary inline-flex items-center gap-1">
                <XCircle size={11} className="text-pertamina-red" /> Reject Rate
              </span>
              <span
                className={classNames(
                  'text-[14px] font-semibold tabular-nums',
                  insights.rejectionRate > 30
                    ? 'text-pertamina-red'
                    : insights.rejectionRate > 15
                      ? 'text-amber-700'
                      : 'text-emerald-700',
                )}
              >
                {insights.rejectionRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-black/[0.06] overflow-hidden">
              <div
                className={classNames(
                  'h-full rounded-full transition-all',
                  insights.rejectionRate > 30
                    ? 'bg-pertamina-red'
                    : insights.rejectionRate > 15
                      ? 'bg-amber-500'
                      : 'bg-emerald-600',
                )}
                style={{ width: `${Math.min(100, insights.rejectionRate)}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-ink-tertiary">
              {insights.approvedCount} handoff selesai · idealnya &lt;15%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingRow({ icon, tone, bg, label, count }: { icon: React.ReactNode; tone: string; bg: string; label: string; count: number }) {
  return (
    <div className={classNames('flex items-center gap-2 rounded-md border px-2.5 py-1.5', bg)}>
      <span className={tone}>{icon}</span>
      <span className="flex-1 text-[11px] text-ink-secondary">{label}</span>
      <span className={classNames('text-[14px] font-semibold tabular-nums', tone)}>{count}</span>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border-subtle bg-white p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-ink-tertiary">
        {icon} {label}
      </div>
      <div className="mt-1 text-[14px] font-semibold text-ink-primary tabular-nums">{value}</div>
    </div>
  )
}
