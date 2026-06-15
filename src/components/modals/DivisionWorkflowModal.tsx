import { Modal } from '../ui/Modal'
import { useTeamStore } from '../../store/useTeamStore'
import { useRoleStore } from '../../store/useRoleStore'
import { usePermissions } from '../../hooks/usePermissions'
import { GitBranch, Info, ShieldCheck } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  teamId: string
}

export function DivisionWorkflowModal({ open, onClose, teamId }: Props) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId))
  const updateTeam = useTeamStore((s) => s.updateTeam)
  const roles = useRoleStore((s) => s.roles)
  const { user, can } = usePermissions()
  const editPerm = can('team.edit', { teamId })

  if (!team) {
    return (
      <Modal open={open} onClose={onClose} title="Divisi tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Tidak ada data divisi.</div>
      </Modal>
    )
  }

  const isMyTeam = user?.teamId === teamId
  if (!editPerm.allowed && !isMyTeam) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="text-sm text-ink-secondary">{editPerm.reason}</div>
      </Modal>
    )
  }

  const wf = team.divisionWorkflow
  const eligibleRoles = roles.filter((r) => r.permissions.canApproveHandoff)

  const setApprovers = (ids: string[]) => {
    if (ids.length === 0) {
      toast.error('Minimal satu role harus dipilih')
      return
    }
    updateTeam(teamId, { divisionWorkflow: { ...wf, approverRoleIds: ids } })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Alur Approval Divisi — ${team.name}`}
      description="Atur role yang berhak approve promote task ke stage L0 berikut, khusus untuk divisi ini."
      size="xl"
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[12px] text-ink-secondary leading-relaxed flex items-start gap-2">
          <Info size={14} className="mt-0.5 text-pertamina-red shrink-0" />
          <div>
            Saat task selesai (masuk kolom Selesai), user di divisi ini bisa klik tombol <strong>Promote</strong> untuk
            meneruskan ke stage L0 berikut. Workflow di sini menentukan siapa di {team.name} yang harus
            approve sebelum request diteruskan ke divisi tujuan.
          </div>
        </div>

        <div className="surface rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wf.requireApproval}
              onChange={(e) => updateTeam(teamId, { divisionWorkflow: { ...wf, requireApproval: e.target.checked } })}
              className="h-4 w-4 accent-pertamina-red"
            />
            <span className="text-[13px] font-medium text-ink-primary">Wajib approval internal sebelum promote</span>
          </label>
          <p className="text-[11px] text-ink-tertiary pl-6">
            {wf.requireApproval
              ? 'Request promote masuk antrian, harus disetujui role di bawah dulu.'
              : 'Promote langsung diteruskan tanpa cek internal — divisi tujuan tetap perlu konfirmasi terima.'}
          </p>

          <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-border-subtle">
            <input
              type="checkbox"
              checked={wf.autoFlagOnDone}
              onChange={(e) => updateTeam(teamId, { divisionWorkflow: { ...wf, autoFlagOnDone: e.target.checked } })}
              className="h-4 w-4 accent-pertamina-red"
            />
            <span className="text-[13px] font-medium text-ink-primary">
              Otomatis tampilkan tombol Promote saat task Selesai
            </span>
          </label>
          <p className="text-[11px] text-ink-tertiary pl-6">
            Default: ON. Matikan jika ingin Promote hanya dimulai manual dari Project Detail.
          </p>
        </div>

        <div className="surface rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <GitBranch size={13} className="text-pertamina-red" />
            <span className="text-[10px] uppercase tracking-widest text-ink-tertiary">
              Approver di Divisi {team.acronym}
            </span>
            <span className="ml-auto text-[10px] text-ink-tertiary">{wf.approverRoleIds.length} role aktif</span>
          </div>
          {eligibleRoles.length === 0 ? (
            <div className="rounded-md border border-dashed border-pertamina-red/30 bg-pertamina-red-50/40 p-3 text-[11px] text-pertamina-red">
              Belum ada role dengan permission <em>"Menjadi approver handoff"</em>. Buka Master Role untuk mengaktifkan.
            </div>
          ) : (
            <div className="space-y-1">
              {eligibleRoles.map((r) => {
                const checked = wf.approverRoleIds.includes(r.id)
                return (
                  <label
                    key={r.id}
                    className={classNames(
                      'flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer',
                      checked
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-border-subtle bg-white hover:bg-black/[0.03]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...wf.approverRoleIds, r.id]))
                          : wf.approverRoleIds.filter((id) => id !== r.id)
                        setApprovers(next)
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="flex-1 text-[12px] text-ink-primary">{r.name}</span>
                    <span className="text-[10px] text-ink-tertiary">rank {r.rank}</span>
                    {checked && <ShieldCheck size={11} className="text-emerald-600" />}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onClose} className="btn-primary">
          Selesai
        </button>
      </div>
    </Modal>
  )
}
