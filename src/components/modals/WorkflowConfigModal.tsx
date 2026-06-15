import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { useRoleStore } from '../../store/useRoleStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { usePermissions } from '../../hooks/usePermissions'
import { ArrowRight, GitBranch, Info, RotateCcw, ShieldAlert } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function WorkflowConfigModal({ open, onClose }: Props) {
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
  const config = useWorkflowStore((s) => s.config)
  const setApprovers = useWorkflowStore((s) => s.setApprovers)
  const setStageName = useWorkflowStore((s) => s.setStageName)
  const resetDefault = useWorkflowStore((s) => s.resetDefault)
  const roles = useRoleStore((s) => s.roles)

  const eligibleRoles = roles.filter((r) => r.permissions.canApproveHandoff)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Konfigurasi Workflow Approval"
      description="Atur role mana yang berhak approve di setiap tahap handoff"
      size="xl"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[12px] text-ink-secondary leading-relaxed flex items-start gap-2">
          <Info size={14} className="mt-0.5 text-pertamina-red shrink-0" />
          <div>
            Setiap handoff melewati 2 tahap: <strong>Persetujuan Asal</strong> (Kadiv divisi asal) → <strong>Konfirmasi Tujuan</strong> (Kadiv divisi tujuan, pilih team & assignee).
            Anda dapat mengubah role mana yang bertindak sebagai approver di tiap tahap.
            Hanya role dengan permission <em>"Menjadi approver handoff"</em> yang muncul sebagai pilihan.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StageSummary stageId="wf_origin" side="origin" />
          <ArrowRight className="text-pertamina-red shrink-0" size={20} />
          <StageSummary stageId="wf_target" side="target" />
        </div>

        <div className="space-y-3">
          {config.stages.map((stage) => (
            <div key={stage.id} className="surface rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <GitBranch size={13} className="text-pertamina-red" />
                  <span className="text-[10px] uppercase tracking-widest text-ink-tertiary">
                    Tahap {stage.side === 'origin' ? 'Asal' : 'Tujuan'}
                  </span>
                </div>
                {stage.requireAssignment && (
                  <span className="chip bg-blue-50 text-blue-700 border border-blue-200">
                    + Pilih Team & Assignee
                  </span>
                )}
              </div>
              <Input
                label="Nama Tahap"
                value={stage.name}
                onChange={(e) => setStageName(stage.id, e.target.value)}
              />
              <div className="mt-3">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Role yang dapat approve</span>
                <div className="space-y-1">
                  {eligibleRoles.length === 0 ? (
                    <div className="rounded-md border border-dashed border-pertamina-red/30 bg-pertamina-red-50/40 p-3 text-[11px] text-pertamina-red">
                      Belum ada role dengan permission <em>"Menjadi approver handoff"</em>. Buka Master Role untuk mengaktifkan.
                    </div>
                  ) : (
                    eligibleRoles.map((r) => {
                      const checked = stage.approverRoleIds.includes(r.id)
                      return (
                        <label
                          key={r.id}
                          className={classNames(
                            'flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer',
                            checked ? 'border-emerald-300 bg-emerald-50' : 'border-border-subtle bg-white hover:bg-black/[0.03]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...stage.approverRoleIds, r.id]))
                                : stage.approverRoleIds.filter((id) => id !== r.id)
                              if (next.length === 0) {
                                toast.error('Minimal satu role harus dipilih')
                                return
                              }
                              setApprovers(stage.id, next)
                            }}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="flex-1 text-[12px] text-ink-primary">{r.name}</span>
                          <span className="text-[10px] text-ink-tertiary">rank {r.rank}</span>
                          <span className="text-[10px] text-ink-tertiary">
                            {r.scopeRestriction === 'own_division' ? '· divisi sendiri' : '· lintas divisi'}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle">
          <button
            className="btn-ghost text-[12px]"
            onClick={() => {
              if (confirm('Reset workflow ke konfigurasi default?')) {
                resetDefault()
                toast.success('Workflow direset ke default')
              }
            }}
          >
            <RotateCcw size={12} /> Reset Default
          </button>
          <button className="btn-primary" onClick={onClose}>Selesai</button>
        </div>
      </div>
    </Modal>
  )
}

function StageSummary({ stageId, side }: { stageId: string; side: 'origin' | 'target' }) {
  const stage = useWorkflowStore((s) => s.config.stages.find((st) => st.id === stageId))
  const roles = useRoleStore((s) => s.roles)
  if (!stage) return null
  const approvers = roles.filter((r) => stage.approverRoleIds.includes(r.id))
  return (
    <div className="flex-1 rounded-lg border border-border-subtle bg-white p-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-tertiary">{side === 'origin' ? 'Tahap 1 · Asal' : 'Tahap 2 · Tujuan'}</div>
      <div className="mt-1 text-[13px] font-semibold text-ink-primary">{stage.name}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {approvers.length === 0 ? (
          <span className="text-[10px] text-pertamina-red">Belum ada approver!</span>
        ) : (
          approvers.map((r) => (
            <span
              key={r.id}
              className="chip border"
              style={{
                backgroundColor: `${r.color}1a`,
                color: r.color,
                borderColor: `${r.color}55`,
              }}
            >
              {r.name}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
