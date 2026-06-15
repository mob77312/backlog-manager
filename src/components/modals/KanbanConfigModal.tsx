import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useTeamStore } from '../../store/useTeamStore'
import { useSegmentRequestStore } from '../../store/useSegmentRequestStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Lock, Pencil, Plus, Trash2, ShieldCheck } from 'lucide-react'
import { classNames } from '../../utils/helpers'
import { defaultKanbanConfig, ensureUniversalColumns, sortedColumns } from '../../utils/kanbanDefaults'
import { Tooltip } from '../ui/Tooltip'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  teamId: string
}

export function KanbanConfigModal({ open, onClose, teamId }: Props) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId))
  const renameKanbanColumn = useTeamStore((s) => s.renameKanbanColumn)
  const openModal = useUIStore((s) => s.openModal)
  const allSegRequests = useSegmentRequestStore((s) => s.requests)
  const pendingForTeam = useMemo(
    () => allSegRequests.filter((r) => r.teamId === teamId && r.status === 'pending'),
    [allSegRequests, teamId],
  )
  const { can } = usePermissions()
  const reqPerm = can('segment.request', { teamId })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')

  if (!team) {
    return (
      <Modal open={open} onClose={onClose} title="Divisi tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Tidak ada data divisi.</div>
      </Modal>
    )
  }

  // Defensive fallback: kalau kanbanConfig kosong/undefined (data lama), pakai default
  const rawCfg = team.kanbanConfig && team.kanbanConfig.length > 0 ? team.kanbanConfig : defaultKanbanConfig()
  const cols = sortedColumns(ensureUniversalColumns(rawCfg))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Atur Kolom Kanban — ${team.name}`}
      description="Rename instant. Tambah & hapus kolom perlu approval Super Admin atau Kadep."
      size="xl"
    >
      <div className="space-y-2">
        {pendingForTeam.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
            <span className="font-semibold">{pendingForTeam.length}</span> request perubahan kolom menunggu approval.
            <button
              onClick={() => openModal({ type: 'approval-queue' })}
              className="ml-2 underline hover:no-underline"
            >
              Lihat di Approval Queue
            </button>
          </div>
        )}

        {cols.map((col) => (
          <div
            key={col.id}
            className={classNames(
              'flex items-center gap-2 rounded-lg border px-3 py-2',
              col.isSystem ? 'border-amber-200 bg-amber-50/40' : 'border-border-subtle bg-white',
            )}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: col.color, boxShadow: `0 0 8px ${col.color}80` }}
            />
            {editingId === col.id ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => {
                  if (labelDraft.trim() && labelDraft !== col.label) {
                    renameKanbanColumn(teamId, col.id, labelDraft.trim())
                    toast.success('Nama kolom diperbarui')
                  }
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="input-base flex-1"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(col.id)
                  setLabelDraft(col.label)
                }}
                className="flex-1 text-left text-[13px] font-medium text-ink-primary hover:text-pertamina-red transition"
                title="Klik untuk rename (instant)"
              >
                {col.label}
              </button>
            )}
            <span className="text-[10px] text-ink-tertiary font-mono">key={col.key}</span>
            {col.isSystem && (
              <Tooltip content="Kolom sistem (universal) — tidak bisa dihapus">
                <Lock size={11} className="text-amber-700" />
              </Tooltip>
            )}
            {col.isTerminal && (
              <span className="rounded bg-emerald-100 px-1 text-[9px] text-emerald-700 font-semibold">TERMINAL</span>
            )}
            <button
              onClick={() => {
                setEditingId(col.id)
                setLabelDraft(col.label)
              }}
              className="rounded p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-ink-primary"
              title="Rename"
            >
              <Pencil size={11} />
            </button>
            {!col.isSystem && (
              reqPerm.allowed ? (
                <button
                  onClick={() => openModal({ type: 'segment-request', teamId, action: 'remove', columnId: col.id })}
                  className="rounded p-1 text-ink-tertiary hover:bg-pertamina-red-50 hover:text-pertamina-red"
                  title="Ajukan hapus kolom"
                >
                  <Trash2 size={11} />
                </button>
              ) : (
                <Tooltip content={reqPerm.reason ?? ''}>
                  <button disabled className="rounded p-1 text-ink-tertiary opacity-40 cursor-not-allowed">
                    <Trash2 size={11} />
                  </button>
                </Tooltip>
              )
            )}
          </div>
        ))}

        {reqPerm.allowed ? (
          <button
            onClick={() => openModal({ type: 'segment-request', teamId, action: 'add' })}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-pertamina-red/40 bg-pertamina-red-50 px-3 py-2 text-[12px] font-medium text-pertamina-red hover:bg-pertamina-red-100 transition"
          >
            <Plus size={12} /> Ajukan Tambah Kolom Baru
          </button>
        ) : (
          <Tooltip content={reqPerm.reason ?? ''}>
            <button disabled className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-white px-3 py-2 text-[12px] font-medium text-ink-tertiary opacity-50 cursor-not-allowed">
              <Plus size={12} /> Ajukan Tambah Kolom Baru
            </button>
          </Tooltip>
        )}

        <div className="mt-2 flex items-start gap-2 rounded-md border border-border-subtle bg-black/[0.02] p-2 text-[10px] text-ink-tertiary">
          <ShieldCheck size={11} className="mt-0.5 shrink-0" />
          <span>
            <strong>Backlog</strong> selalu wajib & tidak bisa dihapus. Minimal harus ada 1 kolom terminal
            (Selesai/Cancel). Tambah/hapus kolom perlu approval Super Admin atau Kadep.
          </span>
        </div>
      </div>
    </Modal>
  )
}
