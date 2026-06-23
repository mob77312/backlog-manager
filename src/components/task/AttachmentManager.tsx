import { useMemo, useRef, useState } from 'react'
import { Download, File, FilePlus2, GitBranch, Paperclip, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTaskStore, countProjectAttachments } from '../../store/useTaskStore'
import { usePermissions } from '../../hooks/usePermissions'
import {
  ATTACHMENT_CATEGORY_COLORS,
  ATTACHMENT_CATEGORY_DESCRIPTIONS,
  ATTACHMENT_CATEGORY_KEYS,
  ATTACHMENT_CATEGORY_LABELS,
  ATTACHMENT_MAX_FILES_PER_PROJECT,
  ATTACHMENT_MAX_FILE_BYTES,
} from '../../utils/colors'
import type { AttachmentCategory, Task, TaskAttachment } from '../../types'
import { classNames, relativeTime } from '../../utils/helpers'

interface Props {
  task: Task
  canEdit: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Group attachments by chain root (versionOfId ?? id), latest version on top. */
function groupByChain(attachments: TaskAttachment[]) {
  const chains = new Map<string, TaskAttachment[]>()
  attachments.forEach((a) => {
    const root = a.versionOfId ?? a.id
    if (!chains.has(root)) chains.set(root, [])
    chains.get(root)!.push(a)
  })
  // Sort each chain by version desc (latest first)
  const result: Array<{ rootId: string; versions: TaskAttachment[] }> = []
  chains.forEach((versions, rootId) => {
    versions.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    result.push({ rootId, versions })
  })
  // Sort chains by most-recent upload
  result.sort((a, b) => b.versions[0].uploadedAt.localeCompare(a.versions[0].uploadedAt))
  return result
}

export function AttachmentManager({ task, canEdit }: Props) {
  const { user } = usePermissions()
  const addAttachment = useTaskStore((s) => s.addAttachment)
  const removeAttachment = useTaskStore((s) => s.removeAttachment)
  const tasks = useTaskStore((s) => s.tasks)
  const [activeCategory, setActiveCategory] = useState<AttachmentCategory>('reference')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const versionInputRef = useRef<HTMLInputElement>(null)
  const [versionTarget, setVersionTarget] = useState<TaskAttachment | null>(null)

  const grouped = useMemo(() => {
    const byCategory: Record<AttachmentCategory, TaskAttachment[]> = {
      reference: [], execution: [], evidence: [], result: [],
    }
    task.attachments.forEach((a) => { byCategory[a.category].push(a) })
    return byCategory
  }, [task.attachments])

  const projectTotal = useMemo(
    () => countProjectAttachments(tasks, task.projectId),
    [tasks, task.projectId],
  )
  const projectFull = projectTotal >= ATTACHMENT_MAX_FILES_PER_PROJECT

  const evidenceCount = grouped.evidence.length

  const handleUpload = async (files: FileList | null, category: AttachmentCategory, versionOfId: string | null = null) => {
    if (!files || !user) return
    for (const file of Array.from(files)) {
      if (file.size > ATTACHMENT_MAX_FILE_BYTES) {
        toast.error(`"${file.name}" melebihi batas ${(ATTACHMENT_MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`)
        continue
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        const result = addAttachment(task.id, {
          category,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          uploadedByUserId: user.id,
          uploadedByName: user.name,
          versionOfId,
        })
        if (!result.ok) {
          toast.error(result.error || `Gagal upload "${file.name}"`)
        } else {
          toast.success(
            versionOfId
              ? `Versi ${result.attachment?.version} ditambah`
              : `Lampiran ditambah ke ${ATTACHMENT_CATEGORY_LABELS[category]}`,
          )
        }
      } catch (err) {
        toast.error(`Gagal baca file "${file.name}"`)
        console.error(err)
      }
    }
    setVersionTarget(null)
  }

  const downloadAttachment = (att: TaskAttachment) => {
    const link = document.createElement('a')
    link.href = att.dataUrl
    link.download = att.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Paperclip size={12} className="text-ink-tertiary" />
          <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary">
            Lampiran ({task.attachments.length})
          </h3>
        </div>
        <span className={classNames(
          'text-[10px] font-mono',
          projectFull ? 'text-pertamina-red' : 'text-ink-tertiary',
        )}>
          {projectTotal}/{ATTACHMENT_MAX_FILES_PER_PROJECT} per project
        </span>
      </div>

      {/* Category tabs */}
      <div className="mb-2 flex flex-wrap gap-1">
        {ATTACHMENT_CATEGORY_KEYS.map((cat) => {
          const count = grouped[cat].length
          const color = ATTACHMENT_CATEGORY_COLORS[cat]
          const active = activeCategory === cat
          const isEvidence = cat === 'evidence'
          const evidenceEmpty = isEvidence && count === 0
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={classNames(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition',
                active ? `${color.bg} ${color.text} ${color.border}` : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
              )}
              style={active ? { borderColor: color.hex } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color.hex }} />
              {ATTACHMENT_CATEGORY_LABELS[cat]}
              <span className={classNames(
                'rounded-full px-1 py-0 text-[9px] font-bold',
                active ? 'bg-white/60' : 'bg-black/[0.06]',
                evidenceEmpty && 'text-pertamina-red',
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Description for active category */}
      <p className="mb-2 text-[10px] text-ink-tertiary italic leading-snug">
        {ATTACHMENT_CATEGORY_DESCRIPTIONS[activeCategory]}
      </p>

      {/* Evidence reminder */}
      {activeCategory === 'evidence' && evidenceCount === 0 && (
        <div className="mb-2 rounded-md border border-pertamina-red/30 bg-pertamina-red-50/50 px-2 py-1.5 text-[10px] text-pertamina-red">
          ⚠ Minimal 1 Evidence wajib sebelum tugas dapat ditandai <strong>Selesai</strong>.
        </div>
      )}

      {/* Upload button */}
      {canEdit && (
        <div className="mb-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files, activeCategory)
              e.target.value = ''
            }}
          />
          <input
            ref={versionInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (versionTarget) handleUpload(e.target.files, versionTarget.category, versionTarget.id)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={projectFull}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-[11px] font-medium transition w-full justify-center',
              projectFull
                ? 'border-border bg-black/[0.03] text-ink-tertiary cursor-not-allowed'
                : 'border-pertamina-red/40 bg-pertamina-red-50/40 text-pertamina-red hover:bg-pertamina-red-50',
            )}
          >
            <Upload size={12} />
            {projectFull ? 'Quota project penuh' : `Upload ke ${ATTACHMENT_CATEGORY_LABELS[activeCategory]}`}
          </button>
          <div className="mt-1 text-[10px] text-ink-tertiary text-center">
            Maks {(ATTACHMENT_MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB/file
          </div>
        </div>
      )}

      {/* Attachments list */}
      <div className="space-y-1.5">
        {grouped[activeCategory].length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-center text-[11px] text-ink-tertiary">
            Belum ada lampiran di kategori ini
          </div>
        ) : (
          groupByChain(grouped[activeCategory]).map(({ rootId, versions }) => (
            <AttachmentChain
              key={rootId}
              versions={versions}
              canEdit={canEdit}
              onDownload={downloadAttachment}
              onRemove={(id) => removeAttachment(task.id, id)}
              onAddVersion={(latest) => {
                setVersionTarget(latest)
                setTimeout(() => versionInputRef.current?.click(), 0)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

function AttachmentChain({
  versions,
  canEdit,
  onDownload,
  onRemove,
  onAddVersion,
}: {
  versions: TaskAttachment[]
  canEdit: boolean
  onDownload: (a: TaskAttachment) => void
  onRemove: (id: string) => void
  onAddVersion: (latest: TaskAttachment) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const latest = versions[0]
  const olderCount = versions.length - 1
  const color = ATTACHMENT_CATEGORY_COLORS[latest.category]

  return (
    <div className="rounded-md border border-border-subtle bg-white p-2">
      <div className="flex items-start gap-2">
        <div
          className="grid h-6 w-6 place-items-center rounded shrink-0"
          style={{ background: `${color.hex}15`, color: color.hex }}
        >
          <File size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-primary">
            <span className="truncate">{latest.name}</span>
            <span
              className="shrink-0 rounded-md border px-1 py-0 text-[9px] font-mono font-bold"
              style={{ borderColor: color.hex, color: color.hex }}
            >
              {latest.version}
            </span>
          </div>
          <div className="text-[10px] text-ink-tertiary">
            {formatBytes(latest.size)} · oleh {latest.uploadedByName} · {relativeTime(latest.uploadedAt)}
          </div>
          {latest.description && (
            <div className="mt-0.5 text-[10px] text-ink-secondary italic">{latest.description}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => onDownload(latest)}
            className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-ink-primary transition"
            title="Download"
          >
            <Download size={12} />
          </button>
          {canEdit && (
            <button
              onClick={() => onAddVersion(latest)}
              className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-pertamina-red transition"
              title="Upload versi baru"
            >
              <FilePlus2 size={12} />
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                if (confirm(`Hapus "${latest.name} ${latest.version}"?`)) onRemove(latest.id)
              }}
              className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.04] hover:text-pertamina-red transition"
              title="Hapus"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {olderCount > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-ink-tertiary hover:text-ink-primary transition"
          >
            <GitBranch size={10} />
            {expanded ? 'Sembunyikan' : 'Lihat'} {olderCount} versi lama
          </button>
          {expanded && (
            <div className="mt-1 space-y-1 border-t border-border-subtle pt-1.5">
              {versions.slice(1).map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[11px] hover:bg-black/[0.03]">
                  <span
                    className="shrink-0 rounded-md border px-1 py-0 text-[9px] font-mono font-bold"
                    style={{ borderColor: color.hex, color: color.hex }}
                  >
                    {v.version}
                  </span>
                  <span className="truncate text-ink-secondary flex-1">{v.name}</span>
                  <span className="shrink-0 text-[10px] text-ink-tertiary">{formatBytes(v.size)}</span>
                  <button
                    onClick={() => onDownload(v)}
                    className="rounded p-0.5 text-ink-tertiary hover:text-ink-primary transition"
                    title="Download"
                  >
                    <Download size={11} />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => {
                        if (confirm(`Hapus versi ${v.version}?`)) onRemove(v.id)
                      }}
                      className="rounded p-0.5 text-ink-tertiary hover:text-pertamina-red transition"
                      title="Hapus versi ini"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
