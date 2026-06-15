import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { useTeamStore } from '../../store/useTeamStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useSegmentRequestStore } from '../../store/useSegmentRequestStore'
import { usePermissions } from '../../hooks/usePermissions'
import { TEAM_COLOR_PALETTE } from '../../utils/colors'
import { classNames } from '../../utils/helpers'
import { uid } from '../../utils/helpers'
import { defaultKanbanConfig, ensureUniversalColumns, isValidKanbanConfig, sortedColumns } from '../../utils/kanbanDefaults'
import type { KanbanColumn } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  teamId: string
  action: 'add' | 'remove'
  columnId?: string
}

export function SegmentRequestModal({ open, onClose, teamId, action, columnId }: Props) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId))
  const tasks = useTaskStore((s) => s.tasks)
  const createRequest = useSegmentRequestStore((s) => s.createRequest)
  const { user, can } = usePermissions()
  const perm = can('segment.request', { teamId })

  const [label, setLabel] = useState('')
  const [color, setColor] = useState(TEAM_COLOR_PALETTE[1])
  const [position, setPosition] = useState<number>(team?.kanbanConfig?.length ?? 2)
  const [isTerminal, setIsTerminal] = useState(false)
  const [isInProgress, setIsInProgress] = useState(true)
  const [isDone, setIsDone] = useState(false)
  const [reason, setReason] = useState('')
  const [moveTasksTo, setMoveTasksTo] = useState<string>('backlog')

  const effectiveCfg = useMemo<KanbanColumn[]>(() => {
    if (!team) return []
    const raw = team.kanbanConfig && team.kanbanConfig.length > 0 ? team.kanbanConfig : defaultKanbanConfig()
    return ensureUniversalColumns(raw)
  }, [team])
  const targetCol = useMemo(
    () => effectiveCfg.find((c) => c.id === columnId),
    [effectiveCfg, columnId],
  )
  const tasksInTargetCol = targetCol
    ? tasks.filter((t) => t.teamId === teamId && t.status === targetCol.key)
    : []

  if (!team) {
    return (
      <Modal open={open} onClose={onClose} title="Divisi tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Tidak ada data divisi.</div>
      </Modal>
    )
  }

  if (!perm.allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="text-sm text-ink-secondary">{perm.reason}</div>
      </Modal>
    )
  }

  const otherCols = effectiveCfg.filter((c) => c.id !== columnId)
  const submit = () => {
    if (!user) return
    if (!reason.trim()) return toast.error('Alasan wajib diisi')

    if (action === 'add') {
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      if (!label.trim() || !key) return toast.error('Nama kolom wajib diisi')
      if (effectiveCfg.some((c) => c.key === key))
        return toast.error(`Key "${key}" sudah ada — gunakan nama lain`)
      const newCol = {
        id: uid('col'),
        key,
        label: label.trim(),
        color,
        position,
        isSystem: false,
        isTerminal,
        isInProgress: isInProgress && !isTerminal,
        isDone,
      }
      // Simulate after-state for validation
      const after = [...effectiveCfg, newCol]
      const v = isValidKanbanConfig(after)
      if (!v.ok) return toast.error(v.reason ?? 'Konfigurasi tidak valid')
      createRequest({
        teamId,
        teamName: team.name,
        action: 'add',
        newColumn: newCol,
        reason,
        requestedByUserId: user.id,
        requestedByName: user.name,
      })
      toast.success('Request tambah kolom dikirim untuk approval')
      onClose()
      return
    }

    // remove
    if (!targetCol) return toast.error('Kolom target tidak ditemukan')
    if (targetCol.isSystem) return toast.error('Kolom sistem tidak bisa dihapus')
    const after = effectiveCfg.filter((c) => c.id !== columnId)
    const v = isValidKanbanConfig(after)
    if (!v.ok) return toast.error(v.reason ?? 'Konfigurasi tidak valid setelah penghapusan')
    if (tasksInTargetCol.length > 0 && !moveTasksTo)
      return toast.error('Pilih kolom tujuan untuk task yang ada')
    createRequest({
      teamId,
      teamName: team.name,
      action: 'remove',
      removeColumnId: columnId!,
      moveTasksToColumnKey: tasksInTargetCol.length > 0 ? moveTasksTo : null,
      reason,
      requestedByUserId: user.id,
      requestedByName: user.name,
    })
    toast.success('Request hapus kolom dikirim untuk approval')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={action === 'add' ? `Ajukan Tambah Kolom — ${team.name}` : `Ajukan Hapus Kolom — ${targetCol?.label ?? '?'}`}
      description="Perubahan kolom perlu approval Super Admin atau Kadep."
      size="xl"
    >
      <div className="space-y-3">
        {action === 'add' ? (
          <>
            <Input
              label="Nama Kolom *"
              placeholder="contoh: QA Internal, Stage Gate, On Hold..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              hint={`Key otomatis: "${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || '—'}"`}
            />
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Warna</span>
              <div className="flex flex-wrap gap-1">
                {TEAM_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={classNames(
                      'h-6 w-6 rounded-full border-2 transition',
                      color === c ? 'border-white scale-110 shadow' : 'border-transparent opacity-80 hover:opacity-100',
                    )}
                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 10px ${c}80` : undefined }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-xs text-ink-secondary">Posisi (0=paling kiri)</span>
                <input
                  type="number"
                  min={0}
                  max={effectiveCfg.length}
                  value={position}
                  onChange={(e) => setPosition(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="input-base"
                />
              </label>
              <label className="flex items-center gap-2 mt-5 text-[12px] text-ink-secondary">
                <input type="checkbox" checked={isTerminal} onChange={(e) => setIsTerminal(e.target.checked)} className="h-3.5 w-3.5" />
                Terminal (state akhir)
              </label>
              <label className="flex items-center gap-2 mt-5 text-[12px] text-ink-secondary">
                <input type="checkbox" checked={isInProgress} disabled={isTerminal} onChange={(e) => setIsInProgress(e.target.checked)} className="h-3.5 w-3.5" />
                Sedang dikerjakan
              </label>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-ink-secondary">
              <input type="checkbox" checked={isDone} onChange={(e) => setIsDone(e.target.checked)} className="h-3.5 w-3.5" />
              Hitung sebagai "selesai" di progress engine
            </label>
          </>
        ) : (
          <>
            <div className="surface rounded-md p-2 text-[12px]">
              <div className="text-ink-tertiary">Kolom yang akan dihapus:</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: targetCol?.color }} />
                <span className="font-semibold text-ink-primary">{targetCol?.label}</span>
              </div>
            </div>
            {tasksInTargetCol.length > 0 && (
              <div className="space-y-1.5">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
                  ⚠ {tasksInTargetCol.length} task ada di kolom ini. Pilih kolom tujuan ketika approval disetujui.
                </div>
                <label className="block">
                  <span className="text-xs text-ink-secondary">Pindahkan task ke:</span>
                  <select
                    value={moveTasksTo}
                    onChange={(e) => setMoveTasksTo(e.target.value)}
                    className="input-base"
                  >
                    {sortedColumns(otherCols).map((c) => (
                      <option key={c.id} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </>
        )}

        <Textarea
          label="Alasan *"
          placeholder="Kenapa perubahan ini diperlukan?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">
          Batal
        </button>
        <button onClick={submit} className="btn-primary">
          Kirim untuk Approval
        </button>
      </div>
    </Modal>
  )
}
