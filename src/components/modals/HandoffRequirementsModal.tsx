import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useTeamStore } from '../../store/useTeamStore'
import { usePermissions } from '../../hooks/usePermissions'
import { classNames } from '../../utils/helpers'
import {
  Calendar,
  CheckSquare,
  FileText,
  Link as LinkIcon,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Type as TypeIcon,
  AlignLeft,
  X as XIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import type { HandoffRequirementField, RequirementFieldType, Team } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  teamId: string
}

const TYPE_META: Record<RequirementFieldType, { label: string; icon: React.ReactNode; hint: string }> = {
  text: { label: 'Teks Singkat', icon: <TypeIcon size={12} />, hint: 'Jawaban 1 baris' },
  longtext: { label: 'Teks Panjang', icon: <AlignLeft size={12} />, hint: 'Paragraf bebas' },
  document: { label: 'Dokumen / File', icon: <FileText size={12} />, hint: 'Upload file (PDF, DOCX, dll.)' },
  url: { label: 'URL / Link', icon: <LinkIcon size={12} />, hint: 'Tautan ke resource eksternal' },
  checkbox: { label: 'Checklist (Ya/Tidak)', icon: <CheckSquare size={12} />, hint: 'Konfirmasi persetujuan' },
  date: { label: 'Tanggal', icon: <Calendar size={12} />, hint: 'Pilih tanggal' },
}

export function HandoffRequirementsModal({ open, onClose, teamId }: Props) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId))
  const { can } = usePermissions()
  if (!open) return null
  if (!team) {
    return (
      <Modal open={open} onClose={onClose} title="Divisi tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Divisi sudah dihapus atau tidak tersedia.</div>
      </Modal>
    )
  }
  const perm = can('team.editHandoffRequirements', { teamId: team.id })
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
  return <Editor open={open} onClose={onClose} teamId={teamId} />
}

function Editor({ open, onClose, teamId }: Props) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId))!
  const allTeams = useTeamStore((s) => s.teams)
  const addRequirement = useTeamStore((s) => s.addRequirement)
  const updateRequirement = useTeamStore((s) => s.updateRequirement)
  const removeRequirement = useTeamStore((s) => s.removeRequirement)
  const reorderRequirements = useTeamStore((s) => s.reorderRequirements)

  const otherDivisions = allTeams.filter((t) => t.id !== team.id)
  const fields = team.handoffRequirements ?? []
  const [draft, setDraft] = useState<{
    label: string
    type: RequirementFieldType
    required: boolean
    description: string
    applicableFromTeamIds: string[]
  }>({
    label: '',
    type: 'document',
    required: true,
    description: '',
    applicableFromTeamIds: [],
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const handleAdd = () => {
    if (!draft.label.trim()) return toast.error('Label syarat wajib diisi')
    if (fields.some((f) => f.label.toLowerCase() === draft.label.trim().toLowerCase())) {
      return toast.error('Label syarat sudah ada')
    }
    addRequirement(team.id, {
      label: draft.label,
      type: draft.type,
      required: draft.required,
      description: draft.description,
      applicableFromTeamIds: draft.applicableFromTeamIds,
    })
    setDraft({ label: '', type: 'document', required: true, description: '', applicableFromTeamIds: [] })
    toast.success('Syarat ditambahkan')
  }

  const toggleDraftSource = (id: string) => {
    setDraft((d) => ({
      ...d,
      applicableFromTeamIds: d.applicableFromTeamIds.includes(id)
        ? d.applicableFromTeamIds.filter((x) => x !== id)
        : [...d.applicableFromTeamIds, id],
    }))
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...fields]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    reorderRequirements(team.id, next.map((f) => f.id))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Syarat Handoff — ${team.name}`}
      description="Daftar syarat yang harus diisi user saat mengajukan handoff ke divisi ini"
      size="2xl"
    >
      <div className="space-y-4">
        {/* Info banner */}
        <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[12px] text-ink-secondary leading-relaxed flex items-start gap-2">
          <ShieldCheck size={14} className="mt-0.5 text-pertamina-red shrink-0" />
          <div>
            Saat user dari divisi lain mengajukan handoff ke <strong>{team.name}</strong>, mereka harus mengisi form dengan field di bawah ini.
            Yang ditandai <span className="chip bg-pertamina-red-50 text-pertamina-red border border-pertamina-red/30">Wajib</span> harus diisi sebelum request bisa dikirim.
          </div>
        </div>

        {/* List fields */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
              Daftar Syarat ({fields.length})
            </span>
          </div>
          <div className="space-y-2">
            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-subtle bg-white px-3 py-6 text-center text-[12px] text-ink-tertiary">
                Belum ada syarat. Tambahkan di bawah untuk memulai.
              </div>
            ) : (
              fields.map((f, idx) => (
                <FieldRow
                  key={f.id}
                  field={f}
                  index={idx}
                  total={fields.length}
                  otherDivisions={otherDivisions}
                  editing={editingId === f.id}
                  confirmDelete={confirmDel === f.id}
                  onEdit={() => setEditingId(f.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(patch) => {
                    updateRequirement(team.id, f.id, patch)
                    setEditingId(null)
                    toast.success('Syarat diperbarui')
                  }}
                  onDelete={() => {
                    if (confirmDel === f.id) {
                      removeRequirement(team.id, f.id)
                      toast.success('Syarat dihapus')
                      setConfirmDel(null)
                    } else {
                      setConfirmDel(f.id)
                      window.setTimeout(() => setConfirmDel((c) => (c === f.id ? null : c)), 2500)
                    }
                  }}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                />
              ))
            )}
          </div>
        </div>

        {/* Add new field */}
        <div className="rounded-lg border border-border-subtle bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Plus size={13} className="text-pertamina-red" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-primary">Tambah Syarat Baru</span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_220px] gap-3">
              <Input
                label="Label / Pertanyaan"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder='Contoh: "Dokumen BRD" atau "Test Plan & Test Cases"'
              />
              <Select
                label="Tipe Field"
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as RequirementFieldType }))}
                options={Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            </div>
            <Textarea
              label="Deskripsi / Petunjuk (opsional)"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Jelaskan format yang diharapkan atau contoh isian..."
            />

            <SourceFilterPicker
              otherDivisions={otherDivisions}
              selectedIds={draft.applicableFromTeamIds}
              onToggle={toggleDraftSource}
              onSetAll={() => setDraft((d) => ({ ...d, applicableFromTeamIds: [] }))}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[12px] text-ink-secondary">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
                  className="h-4 w-4 accent-pertamina-red"
                />
                Wajib diisi
              </label>
              <button className="btn-primary" onClick={handleAdd}>
                <Plus size={13} /> Tambah ke Daftar
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button className="btn-ghost" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface FieldRowProps {
  field: HandoffRequirementField
  index: number
  total: number
  otherDivisions: Team[]
  editing: boolean
  confirmDelete: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (patch: Partial<Omit<HandoffRequirementField, 'id'>>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function FieldRow({ field, index, total, otherDivisions, editing, confirmDelete, onEdit, onCancelEdit, onSave, onDelete, onMoveUp, onMoveDown }: FieldRowProps) {
  const [draft, setDraft] = useState<HandoffRequirementField>({ ...field })
  const meta = TYPE_META[field.type]

  const toggleDraftSource = (id: string) => {
    setDraft((d) => ({
      ...d,
      applicableFromTeamIds: (d.applicableFromTeamIds ?? []).includes(id)
        ? d.applicableFromTeamIds.filter((x) => x !== id)
        : [...(d.applicableFromTeamIds ?? []), id],
    }))
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-pertamina-red/40 bg-pertamina-red-50/30 p-3 space-y-2">
        <div className="grid grid-cols-[1fr_180px] gap-2">
          <Input label="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
          <Select
            label="Tipe"
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as RequirementFieldType }))}
            options={Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
        <Textarea label="Deskripsi" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
        <SourceFilterPicker
          otherDivisions={otherDivisions}
          selectedIds={draft.applicableFromTeamIds ?? []}
          onToggle={toggleDraftSource}
          onSetAll={() => setDraft((d) => ({ ...d, applicableFromTeamIds: [] }))}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[12px] text-ink-secondary">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
              className="h-4 w-4 accent-pertamina-red"
            />
            Wajib diisi
          </label>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-[12px]" onClick={onCancelEdit}>
              <XIcon size={12} /> Batal
            </button>
            <button
              className="btn-primary text-[12px]"
              onClick={() => {
                if (!draft.label.trim()) return toast.error('Label wajib diisi')
                onSave({
                  label: draft.label.trim(),
                  type: draft.type,
                  required: draft.required,
                  description: draft.description,
                  applicableFromTeamIds: draft.applicableFromTeamIds ?? [],
                })
              }}
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    )
  }

  const applicable = field.applicableFromTeamIds ?? []
  const applicableTeams = applicable.length > 0
    ? otherDivisions.filter((t) => applicable.includes(t.id))
    : []

  return (
    <div className="group rounded-lg border border-border-subtle bg-white px-3 py-2 flex items-start gap-2">
      <div className="flex flex-col text-ink-tertiary mt-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded p-0.5 hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Naik"
        >
          <ChevronUp size={11} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded p-0.5 hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Turun"
        >
          <ChevronDown size={11} />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-ink-primary">{field.label}</span>
          <span className="chip border bg-slate-50 text-slate-700 border-slate-200 inline-flex items-center gap-1">
            {meta.icon} {meta.label}
          </span>
          {field.required ? (
            <span className="chip bg-pertamina-red-50 text-pertamina-red border border-pertamina-red/30">Wajib</span>
          ) : (
            <span className="chip bg-slate-100 text-slate-600 border border-slate-200">Opsional</span>
          )}
        </div>
        {field.description && (
          <div className="mt-1 text-[11px] text-ink-tertiary">{field.description}</div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-ink-tertiary uppercase tracking-widest">Berlaku untuk:</span>
          {applicableTeams.length === 0 ? (
            <span className="chip bg-blue-50 text-blue-700 border border-blue-200">Semua Divisi Asal</span>
          ) : (
            applicableTeams.map((t) => (
              <span
                key={t.id}
                className="chip border"
                style={{
                  backgroundColor: `${t.color}1a`,
                  color: t.color,
                  borderColor: `${t.color}55`,
                }}
              >
                {t.acronym}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onClick={onEdit} className="rounded-md p-1.5 text-ink-secondary hover:bg-pertamina-red-50 hover:text-pertamina-red" title="Edit">
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          className={classNames(
            'rounded-md p-1.5 hover:bg-pertamina-red-50 hover:text-pertamina-red',
            confirmDelete ? 'bg-pertamina-red-50 text-pertamina-red opacity-100' : 'text-ink-secondary',
          )}
          title={confirmDelete ? 'Klik lagi untuk konfirmasi' : 'Hapus'}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function SourceFilterPicker({
  otherDivisions,
  selectedIds,
  onToggle,
  onSetAll,
}: {
  otherDivisions: Team[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSetAll: () => void
}) {
  const allMode = selectedIds.length === 0
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-secondary">Berlaku untuk Divisi Asal</span>
        <span className="text-[10px] text-ink-tertiary">
          {allMode ? 'Semua divisi' : `${selectedIds.length} divisi dipilih`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onSetAll}
          className={classNames(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
            allMode
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
          )}
        >
          Semua Divisi
        </button>
        {otherDivisions.map((t) => {
          const selected = !allMode && selectedIds.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition flex items-center gap-1.5"
              style={
                selected
                  ? { borderColor: `${t.color}88`, backgroundColor: `${t.color}1f`, color: t.color }
                  : { borderColor: 'rgba(15,23,42,0.1)', color: '#475569', backgroundColor: 'white' }
              }
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
              {t.acronym} — {t.name}
            </button>
          )
        })}
      </div>
      <div className="mt-1 text-[10px] text-ink-tertiary italic">
        {allMode
          ? 'Syarat ini akan muncul saat divisi mana pun mengajukan handoff ke sini.'
          : 'Syarat ini hanya muncul untuk divisi yang dipilih di atas.'}
      </div>
    </div>
  )
}
