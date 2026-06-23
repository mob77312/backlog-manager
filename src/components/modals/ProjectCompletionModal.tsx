import { useRef, useState } from 'react'
import { CheckCircle2, FileText, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { useProjectStore } from '../../store/useProjectStore'
import { usePermissions } from '../../hooks/usePermissions'
import { ATTACHMENT_MAX_FILE_BYTES } from '../../utils/colors'
import type { CompletionAttachment, CompletionOutcome } from '../../types'
import { classNames } from '../../utils/helpers'
import { uid } from '../../utils/helpers'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
}

const OUTCOMES: Array<{ value: CompletionOutcome; label: string; color: string; description: string }> = [
  { value: 'successful', label: 'Successful', color: '#059669', description: 'Project selesai sesuai scope, deliverable diterima customer.' },
  { value: 'partial', label: 'Partial', color: '#d97706', description: 'Sebagian deliverable belum sesuai — perlu follow-up post-close.' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444', description: 'Project dibatalkan sebelum selesai (force majeure, business decision, dll).' },
]

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

export function ProjectCompletionModal({ open, onClose, projectId }: Props) {
  const { user } = usePermissions()
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId))
  const closeProjectWithCompletion = useProjectStore((s) => s.closeProjectWithCompletion)

  const [outcome, setOutcome] = useState<CompletionOutcome>('successful')
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10))
  const [deliverableSummary, setDeliverableSummary] = useState('')
  const [lessonsLearned, setLessonsLearned] = useState('')
  const [stakeholderFeedback, setStakeholderFeedback] = useState('')
  const [evidence, setEvidence] = useState<CompletionAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!project) {
    return (
      <Modal open={open} onClose={onClose} title="Project tidak ditemukan" size="sm">
        <div className="text-sm text-ink-secondary">Project tidak tersedia.</div>
      </Modal>
    )
  }

  const valid =
    deliverableSummary.trim().length > 0 &&
    completionDate &&
    evidence.length > 0

  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.size > ATTACHMENT_MAX_FILE_BYTES) {
        toast.error(`"${file.name}" melebihi ${(ATTACHMENT_MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`)
        continue
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        setEvidence((prev) => [
          ...prev,
          {
            id: uid('cmpl'),
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            dataUrl,
          },
        ])
      } catch {
        toast.error(`Gagal baca "${file.name}"`)
      }
    }
  }

  const removeEvidence = (id: string) => setEvidence((prev) => prev.filter((e) => e.id !== id))

  const submit = () => {
    if (!user) return
    if (!valid) {
      toast.error('Lengkapi: ringkasan deliverable, tanggal, dan minimal 1 evidence')
      return
    }
    const result = closeProjectWithCompletion(project.id, {
      outcome,
      completionDate: new Date(completionDate).toISOString(),
      deliverableSummary,
      lessonsLearned,
      stakeholderFeedback,
      evidence,
      closedByUserId: user.id,
      closedByName: user.name,
    })
    if (!result.ok) {
      toast.error(result.error ?? 'Gagal tutup project')
      return
    }
    toast.success(`Project "${project.name}" DITUTUP — outcome: ${outcome}`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Form Penyelesaian Project"
      description={`${project.code} · ${project.name}`}
      size="2xl"
    >
      <div className="space-y-3">
        {/* Outcome selector */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Outcome Project *</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {OUTCOMES.map((o) => {
              const active = outcome === o.value
              return (
                <button
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  className={classNames(
                    'rounded-lg border-2 px-3 py-2 text-left transition',
                    active ? 'shadow-sm' : 'border-border bg-white hover:bg-black/[0.03]',
                  )}
                  style={active ? { borderColor: o.color, background: `${o.color}10` } : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                    <span className="text-[12px] font-semibold" style={active ? { color: o.color } : undefined}>
                      {o.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-ink-tertiary">{o.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            label="Tanggal Penyelesaian *"
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
          />
          <div className="rounded-md border border-border-subtle bg-bg-column/40 px-3 py-2 text-[11px]">
            <div className="font-semibold text-ink-tertiary uppercase tracking-wider mb-0.5">Closed By</div>
            <div className="text-ink-primary font-medium">{user?.name ?? '—'}</div>
          </div>
        </div>

        <Textarea
          label="Ringkasan Deliverable *"
          placeholder="List output konkret yang diserahkan ke customer: BAST, dokumen handover, asset list, dll."
          rows={3}
          value={deliverableSummary}
          onChange={(e) => setDeliverableSummary(e.target.value)}
        />

        {/* Evidence upload */}
        <div className="rounded-lg border border-pertamina-red/30 bg-pertamina-red-50/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-pertamina-red">
              Evidence / BAST * ({evidence.length} file)
            </span>
            <span className="text-[10px] text-ink-tertiary">Minimal 1 dokumen wajib</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-md border border-dashed border-pertamina-red/40 bg-white px-3 py-2 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-50 inline-flex items-center justify-center gap-1.5"
          >
            <Upload size={12} />
            Upload BAST / Dokumen Serah Terima
          </button>
          <div className="mt-1 text-[10px] text-ink-tertiary text-center">
            Maks {(ATTACHMENT_MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB/file. Disarankan PDF.
          </div>

          {evidence.length > 0 && (
            <div className="mt-2 space-y-1">
              {evidence.map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-md border border-border-subtle bg-white px-2 py-1.5 text-[11px]">
                  <FileText size={12} className="text-pertamina-red shrink-0" />
                  <span className="flex-1 truncate text-ink-primary">{e.name}</span>
                  <span className="text-[10px] text-ink-tertiary shrink-0">{formatBytes(e.size)}</span>
                  <button
                    onClick={() => removeEvidence(e.id)}
                    className="rounded p-0.5 text-ink-tertiary hover:text-pertamina-red transition"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="Lessons Learned"
          placeholder="Apa yang berjalan baik? Apa yang bisa diperbaiki untuk project sejenis di masa depan?"
          rows={3}
          value={lessonsLearned}
          onChange={(e) => setLessonsLearned(e.target.value)}
        />

        <Textarea
          label="Stakeholder Feedback"
          placeholder="Feedback / testimoni dari customer / sponsor / OSM/DMO."
          rows={2}
          value={stakeholderFeedback}
          onChange={(e) => setStakeholderFeedback(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <button onClick={onClose} className="btn-ghost">
            Batal
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            className={classNames(
              'btn-primary inline-flex items-center gap-1.5',
              !valid && 'opacity-50 cursor-not-allowed',
            )}
            title={!valid ? 'Lengkapi field wajib + upload ≥1 evidence' : ''}
          >
            <CheckCircle2 size={14} />
            Tutup Project Sekarang
          </button>
        </div>

        {!valid && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            <Trash2 size={9} className="hidden" />
            ⚠ Form belum lengkap: {!deliverableSummary.trim() && '• ringkasan deliverable '}
            {!completionDate && '• tanggal '}
            {evidence.length === 0 && '• minimal 1 evidence BAST'}
          </div>
        )}
      </div>
    </Modal>
  )
}
