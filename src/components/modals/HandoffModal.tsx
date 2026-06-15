import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useHandoffStore } from '../../store/useHandoffStore'
import { Textarea } from '../ui/Input'
import { ArrowRightLeft, ClipboardCheck, Info, ShieldAlert } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import { usePermissions } from '../../hooks/usePermissions'
import { RequirementsForm } from './RequirementsForm'
import type { FulfilledRequirement } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  taskId: string
}

export function HandoffModal({ open, onClose, taskId }: Props) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const teams = useTeamStore((s) => s.teams)
  const fromTeam = useTeamStore((s) => s.getTeam(task?.teamId))
  const existingReq = useHandoffStore((s) => (taskId ? s.getByTask(taskId) : undefined))
  const createRequest = useHandoffStore((s) => s.createRequest)
  const { user, can } = usePermissions()
  const perm = task ? can('task.handoff', { teamId: task.teamId }) : { allowed: false, reason: 'Tugas tidak ditemukan' }

  const [toTeamId, setToTeamId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [fulfillments, setFulfillments] = useState<Record<string, FulfilledRequirement>>({})

  const toTeam = useMemo(() => teams.find((t) => t.id === toTeamId), [teams, toTeamId])
  const fromTeamIdValue = task?.teamId
  const requirements = useMemo(() => {
    const all = toTeam?.handoffRequirements ?? []
    if (!fromTeamIdValue) return all
    return all.filter((f) => {
      const applicable = f.applicableFromTeamIds ?? []
      return applicable.length === 0 || applicable.includes(fromTeamIdValue)
    })
  }, [toTeam, fromTeamIdValue])
  const missingRequired = useMemo(
    () => requirements.filter((f) => f.required && !fulfillments[f.id]),
    [requirements, fulfillments],
  )

  if (!task) return null

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

  if (existingReq) {
    return (
      <Modal open={open} onClose={onClose} title="Sudah ada request handoff aktif" size="md">
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-ink-primary">
            <Info size={16} className="mt-0.5 text-amber-700" />
            <div>
              Tugas ini sudah memiliki request handoff yang sedang menunggu approval.
              <div className="mt-1 text-[12px] text-ink-secondary">
                Status: <strong>{existingReq.status === 'pending_origin' ? 'Menunggu Kadiv asal' : 'Menunggu Kadiv tujuan'}</strong>
              </div>
              <div className="text-[12px] text-ink-secondary">Diajukan oleh: {existingReq.requestedByName}</div>
            </div>
          </div>
          <button className="btn-ghost w-full" onClick={onClose}>Tutup</button>
        </div>
      </Modal>
    )
  }

  const targetTeams = teams.filter((t) => t.id !== task.teamId)

  const handleSubmit = () => {
    if (!toTeamId || !user || !toTeam) return
    if (missingRequired.length > 0) {
      toast.error(`Lengkapi ${missingRequired.length} syarat wajib dulu`)
      return
    }
    const req = createRequest({
      taskId: task.id,
      toTeamId,
      reason: reason.trim(),
      requestedByUserId: user.id,
      requestedByName: user.name,
      requirementSnapshot: [...requirements],
      fulfillments: Object.values(fulfillments),
    })
    if (!req) {
      toast.error('Gagal membuat request')
      return
    }
    toast.success(`Request handoff ke ${toTeam.name} dikirim ke Kadiv ${fromTeam?.acronym} untuk persetujuan`, { duration: 4000 })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Handoff ke Divisi Lain" size="2xl">
      <div className="space-y-4">
        <div className="surface rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Tugas</div>
          <div className="text-sm font-medium text-ink-primary">{task.title}</div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="surface rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Dari Divisi</div>
            <div className="font-mono text-xs font-bold" style={{ color: fromTeam?.color }}>{fromTeam?.acronym}</div>
            <div className="text-[11px] text-ink-secondary">{fromTeam?.name}</div>
          </div>
          <ArrowRightLeft size={18} className="text-pertamina-red" />
          <div className="surface rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Ke Divisi</div>
            {toTeam ? (
              <>
                <div className="font-mono text-xs font-bold" style={{ color: toTeam.color }}>{toTeam.acronym}</div>
                <div className="text-[11px] text-ink-secondary">{toTeam.name}</div>
              </>
            ) : (
              <div className="text-[11px] text-ink-tertiary italic">Pilih divisi di bawah</div>
            )}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Pilih Divisi Tujuan</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {targetTeams.map((t) => {
              const active = t.id === toTeamId
              const applicable = (t.handoffRequirements ?? []).filter((f) => {
                const apps = f.applicableFromTeamIds ?? []
                return apps.length === 0 || (fromTeamIdValue && apps.includes(fromTeamIdValue))
              })
              const reqCount = applicable.length
              const requiredCount = applicable.filter((f) => f.required).length
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setToTeamId(t.id)
                    setFulfillments({})
                  }}
                  className={classNames(
                    'rounded-lg border p-3 text-left transition',
                    active ? 'shadow-glow' : 'hover:bg-black/[0.04]',
                  )}
                  style={{
                    borderColor: active ? t.color : 'rgba(15,23,42,0.1)',
                    backgroundColor: active ? `${t.color}1f` : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}80` }} />
                    <span className="font-mono text-[11px] font-bold" style={{ color: t.color }}>{t.acronym}</span>
                  </div>
                  <div className="mt-1 text-xs text-ink-primary truncate">{t.name}</div>
                  <div className="text-[10px] text-ink-tertiary truncate">
                    {t.departments?.length ?? 0} team
                    {reqCount > 0 && (
                      <> · {requiredCount}/{reqCount} syarat</>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Requirements form */}
        {toTeam && (
          <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/20 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <ClipboardCheck size={13} className="text-pertamina-red" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-primary">
                Syarat dari {toTeam.name}
              </span>
              {requirements.length > 0 && (
                <span className="text-[10px] text-ink-tertiary">
                  · {requirements.filter((f) => f.required).length} wajib · {requirements.filter((f) => !f.required).length} opsional
                </span>
              )}
            </div>
            <RequirementsForm
              fields={requirements}
              values={fulfillments}
              onChange={(fieldId, v) => {
                setFulfillments((prev) => {
                  const next = { ...prev }
                  if (v === undefined) delete next[fieldId]
                  else next[fieldId] = v
                  return next
                })
              }}
            />
            {requirements.length > 0 && missingRequired.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                ⚠ Masih ada <strong>{missingRequired.length} syarat wajib</strong> yang belum diisi.
              </div>
            )}
          </div>
        )}

        <Textarea
          label="Alasan handoff / konteks untuk reviewer"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Jelaskan kenapa tugas ini perlu pindah ke divisi tujuan..."
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button
            className="btn-primary"
            disabled={!toTeamId || !reason.trim() || !user || missingRequired.length > 0}
            onClick={handleSubmit}
          >
            Kirim Request
          </button>
        </div>
      </div>
    </Modal>
  )
}
