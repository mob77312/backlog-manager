import { Modal } from '../ui/Modal'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useTeamStore } from '../../store/useTeamStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Briefcase, ShieldAlert, Info } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import { STAGE_DESCRIPTIONS, STAGE_HEX, STAGE_KEYS, STAGE_LABELS } from '../../utils/colors'

interface Props {
  open: boolean
  onClose: () => void
}

export function StageOwnersModal({ open, onClose }: Props) {
  const { can } = usePermissions()
  if (!open) return null
  const perm = can('workflow.configure')
  if (!perm.allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="flex items-start gap-2 rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 text-sm text-ink-primary">
          <ShieldAlert size={16} className="mt-0.5 text-pertamina-red" />
          <div>{perm.reason}</div>
        </div>
      </Modal>
    )
  }
  return <Inner open={open} onClose={onClose} />
}

function Inner({ open, onClose }: Props) {
  const stageOwners = useWorkflowStore((s) => s.stageOwners)
  const setStageOwners = useWorkflowStore((s) => s.setStageOwners)
  const teams = useTeamStore((s) => s.teams)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stage Owners"
      description="Tentukan divisi mana yang memegang otoritas di setiap stage L0 Board Utama"
      size="xl"
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[12px] text-ink-secondary leading-relaxed flex items-start gap-2">
          <Info size={14} className="mt-0.5 text-pertamina-red shrink-0" />
          <div>
            Divisi yang ditandai sebagai owner berhak <strong>edit & advance project</strong> di stage tsb.
            Divisi lain hanya bisa <strong>view</strong>. Handover/promote stage akan otomatis mengarah ke owner stage berikutnya.
          </div>
        </div>

        {STAGE_KEYS.map((stage) => {
          const owners = stageOwners[stage] ?? []
          return (
            <div key={stage} className="rounded-md border border-border-subtle bg-white p-3">
              <div className="flex items-start gap-2 mb-2">
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white"
                  style={{ backgroundColor: STAGE_HEX[stage] }}
                >
                  <Briefcase size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink-primary">{STAGE_LABELS[stage]}</div>
                  <div className="text-[10px] text-ink-tertiary leading-tight mt-0.5">{STAGE_DESCRIPTIONS[stage]}</div>
                </div>
                <span
                  className={classNames(
                    'shrink-0 text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded',
                    owners.length === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {owners.length} divisi
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {teams.map((t) => {
                  const active = owners.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        setStageOwners(
                          stage,
                          active ? owners.filter((id) => id !== t.id) : [...owners, t.id],
                        )
                      }
                      className={classNames(
                        'rounded-md border px-2 py-1.5 text-[11px] font-medium transition flex items-center gap-1.5 min-w-0',
                        active ? 'text-white shadow-sm' : 'text-ink-secondary bg-white border-border hover:bg-black/[0.03]',
                      )}
                      style={active ? { background: t.color, borderColor: t.color } : undefined}
                      title={`${t.acronym} · ${t.name}`}
                    >
                      <span className="font-mono font-bold shrink-0">{t.acronym}</span>
                      <span className="truncate text-[10px] opacity-80">{t.name}</span>
                    </button>
                  )
                })}
              </div>
              {owners.length === 0 && (
                <div className="mt-2 text-[10px] text-amber-700 italic">
                  ⚠ Stage ini tanpa owner — handover ke stage ini akan ditolak.
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
        <button onClick={onClose} className="btn-primary">
          Selesai
        </button>
      </div>
    </Modal>
  )
}
