import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Input'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useHandoffStore } from '../../store/useHandoffStore'
import { usePermissions } from '../../hooks/usePermissions'
import { STAGE_HEX, STAGE_KEYS, STAGE_LABELS } from '../../utils/colors'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import type { BusinessStage } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  taskId: string
}

function nextStage(curr: BusinessStage): BusinessStage | null {
  const i = STAGE_KEYS.indexOf(curr)
  if (i < 0 || i >= STAGE_KEYS.length - 1) return null
  return STAGE_KEYS[i + 1]
}

export function PromoteStageModal({ open, onClose, taskId }: Props) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const teams = useTeamStore((s) => s.teams)
  const projects = useProjectStore((s) => s.projects)
  const stageOwners = useWorkflowStore((s) => s.stageOwners)
  const createHandoff = useHandoffStore((s) => s.createRequest)
  const { user, can } = usePermissions()
  const [reason, setReason] = useState('')
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null)

  const project = task ? projects.find((p) => p.id === task.projectId) : null
  const currentStage = task?.stage ?? null
  const nextStg = currentStage ? nextStage(currentStage) : null
  const nextOwners = useMemo(() => (nextStg ? stageOwners[nextStg] ?? [] : []), [nextStg, stageOwners])
  const fromTeam = teams.find((t) => t.id === task?.teamId)
  const handoffPerm = can('task.handoff', { teamId: task?.teamId })

  if (!task) return null

  if (!nextStg) {
    return (
      <Modal open={open} onClose={onClose} title="Stage Terakhir" size="sm">
        <div className="text-sm text-ink-secondary">
          Task ini sudah di stage L0 terakhir ({currentStage ? STAGE_LABELS[currentStage] : '-'}). Tidak ada stage berikutnya.
        </div>
      </Modal>
    )
  }

  if (!project) {
    return (
      <Modal open={open} onClose={onClose} title="Project tidak terikat" size="sm">
        <div className="text-sm text-ink-secondary">
          Task ini belum terikat ke project. Edit task untuk assign ke project terlebih dahulu.
        </div>
      </Modal>
    )
  }

  const targetTeam = teams.find((t) => t.id === targetTeamId) ?? (nextOwners.length === 1 ? teams.find((t) => t.id === nextOwners[0]) : null)

  const submit = () => {
    if (!user) return
    if (!handoffPerm.allowed) {
      toast.error(handoffPerm.reason ?? 'Tidak diizinkan')
      return
    }
    if (!targetTeam) {
      toast.error('Pilih divisi tujuan dulu')
      return
    }
    if (!reason.trim()) {
      toast.error('Alasan wajib diisi')
      return
    }
    // Pakai handoff flow — saat target approve, task.stage akan auto-advance & status reset ke backlog
    const req = createHandoff({
      taskId,
      toTeamId: targetTeam.id,
      reason: `[Promote ${STAGE_LABELS[currentStage!]} → ${STAGE_LABELS[nextStg]}] ${reason}`,
      requestedByUserId: user.id,
      requestedByName: user.name,
      promoteToStage: nextStg,
      resetStatusToBacklog: true,
    })
    if (!req) {
      toast.error('Gagal membuat request — mungkin sudah ada handoff aktif')
      return
    }
    toast.success('Handover dikirim ke approval')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Handover ke Divisi Stage L0 Berikut"
      description={`Task "${task.title}"`}
      size="xl"
    >
      <div className="space-y-3">
        {/* Stage transition visual */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg border p-2.5"
            style={{
              backgroundColor: `${STAGE_HEX[currentStage!]}15`,
              borderColor: `${STAGE_HEX[currentStage!]}55`,
            }}
          >
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary">Stage Saat Ini</div>
            <div className="text-[13px] font-semibold" style={{ color: STAGE_HEX[currentStage!] }}>
              {STAGE_LABELS[currentStage!]}
            </div>
            <div className="text-[10px] text-ink-tertiary mt-0.5">
              Divisi: {fromTeam?.name ?? '-'}
            </div>
          </div>
          <ArrowRight className="text-pertamina-red shrink-0" size={20} />
          <div
            className="flex-1 rounded-lg border p-2.5"
            style={{
              backgroundColor: `${STAGE_HEX[nextStg]}15`,
              borderColor: `${STAGE_HEX[nextStg]}55`,
            }}
          >
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary">Stage Berikut</div>
            <div className="text-[13px] font-semibold" style={{ color: STAGE_HEX[nextStg] }}>
              {STAGE_LABELS[nextStg]}
            </div>
            <div className="text-[10px] text-ink-tertiary mt-0.5">
              Owner: {nextOwners.length === 0 ? '⚠ belum ada' : nextOwners.map((id) => teams.find((t) => t.id === id)?.acronym).join(', ')}
            </div>
          </div>
        </div>

        {nextOwners.length === 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-700">
            Belum ada divisi owner untuk stage {STAGE_LABELS[nextStg]}. Set di Workflow Config dulu.
          </div>
        ) : nextOwners.length === 1 ? (
          <div className="rounded-md border border-border-subtle bg-white p-2 text-[12px]">
            Otomatis dikirim ke <strong>{teams.find((t) => t.id === nextOwners[0])?.name}</strong>.
          </div>
        ) : (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Pilih Divisi Tujuan</span>
            <div className="flex flex-wrap gap-1.5">
              {nextOwners.map((id) => {
                const t = teams.find((x) => x.id === id)
                if (!t) return null
                const active = (targetTeamId ?? '') === id
                return (
                  <button
                    key={id}
                    onClick={() => setTargetTeamId(id)}
                    className={classNames(
                      'rounded-md border px-2 py-1.5 text-[12px] font-medium transition',
                      active ? 'text-white' : 'text-ink-secondary bg-white border-border hover:bg-black/[0.03]',
                    )}
                    style={active ? { background: t.color, borderColor: t.color } : undefined}
                  >
                    {t.acronym} · {t.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Textarea
          label="Alasan / Catatan Promote"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ringkas kondisi task sekarang & ekspektasi untuk divisi tujuan..."
        />

        <div className="rounded-md border border-border-subtle bg-black/[0.02] p-2 text-[10px] text-ink-tertiary flex items-start gap-2">
          <ShieldCheck size={11} className="mt-0.5 shrink-0" />
          <span>
            Request masuk ke Antrian Approval: dikonfirmasi Kadiv divisi asal (sesuai workflow divisi)
            lalu diterima Kadiv divisi tujuan. Task stage berubah otomatis kalau disetujui.
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">
          Batal
        </button>
        <button onClick={submit} disabled={nextOwners.length === 0} className={classNames('btn-primary', nextOwners.length === 0 && 'opacity-50 cursor-not-allowed')}>
          Kirim Handover
        </button>
      </div>
    </Modal>
  )
}
