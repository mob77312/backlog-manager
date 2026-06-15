import type { FulfilledRequirement, HandoffRequirementField } from '../../types'
import { Calendar, CheckSquare, Download, Eye, FileText, Link as LinkIcon, Paperclip, Type as TypeIcon, AlignLeft, Square } from 'lucide-react'
import { classNames, formatDateShort } from '../../utils/helpers'
import toast from 'react-hot-toast'

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, b64] = dataUrl.split(',')
    if (!b64) return null
    const mimeMatch = header.match(/data:([^;]+);base64/)
    const mime = mimeMatch?.[1] ?? 'application/octet-stream'
    const bin = atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: mime })
  } catch {
    return null
  }
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const blob = dataUrlToBlob(dataUrl)
  if (!blob) {
    toast.error('File tidak bisa diproses')
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function viewDataUrl(dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl)
  if (!blob) {
    toast.error('File tidak bisa dibuka')
    return
  }
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) toast.error('Browser memblokir pop-up. Izinkan untuk melihat file.')
  // Revoke later to allow tab to load
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

interface FillProps {
  fields: HandoffRequirementField[]
  values: Record<string, FulfilledRequirement>
  onChange: (fieldId: string, value: FulfilledRequirement | undefined) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function RequirementsForm({ fields, values, onChange }: FillProps) {
  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-subtle bg-white px-3 py-4 text-center text-[11px] text-ink-tertiary">
        Divisi tujuan belum mengatur syarat handoff. Anda dapat langsung mengirim request.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldInput
          key={f.id}
          field={f}
          value={values[f.id]}
          onChange={(v) => onChange(f.id, v)}
        />
      ))}
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: HandoffRequirementField
  value: FulfilledRequirement | undefined
  onChange: (v: FulfilledRequirement | undefined) => void
}) {
  const labelEl = (
    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
      <TypeIconForKind type={field.type} />
      <span>{field.label}</span>
      {field.required && <span className="text-pertamina-red font-semibold">*</span>}
    </span>
  )

  return (
    <label className="block">
      {labelEl}
      {field.description && <div className="mb-1.5 text-[10px] text-ink-tertiary">{field.description}</div>}

      {field.type === 'text' && (
        <input
          className="input-base"
          value={value?.value ?? ''}
          onChange={(e) => onChange(e.target.value ? { fieldId: field.id, value: e.target.value } : undefined)}
          placeholder="Tulis jawaban Anda..."
        />
      )}

      {field.type === 'longtext' && (
        <textarea
          className="input-base resize-y min-h-[70px]"
          value={value?.value ?? ''}
          onChange={(e) => onChange(e.target.value ? { fieldId: field.id, value: e.target.value } : undefined)}
          placeholder="Tulis jawaban Anda..."
        />
      )}

      {field.type === 'url' && (
        <input
          type="url"
          className="input-base"
          value={value?.value ?? ''}
          onChange={(e) => onChange(e.target.value ? { fieldId: field.id, value: e.target.value } : undefined)}
          placeholder="https://..."
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          className="input-base"
          value={value?.value ?? ''}
          onChange={(e) => onChange(e.target.value ? { fieldId: field.id, value: e.target.value } : undefined)}
        />
      )}

      {field.type === 'checkbox' && (
        <button
          type="button"
          onClick={() =>
            onChange(value?.value === 'true' ? undefined : { fieldId: field.id, value: 'true' })
          }
          className={classNames(
            'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition',
            value?.value === 'true'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
          )}
        >
          {value?.value === 'true' ? <CheckSquare size={14} /> : <Square size={14} />}
          {value?.value === 'true' ? 'Dikonfirmasi' : 'Klik untuk konfirmasi'}
        </button>
      )}

      {field.type === 'document' && (
        <div>
          {value?.fileName ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px]">
              <div className="flex items-center gap-2">
                <Paperclip size={14} className="text-emerald-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-emerald-900 font-medium">{value.fileName}</div>
                  {value.fileSize && <div className="text-[10px] text-emerald-700">{formatFileSize(value.fileSize)}</div>}
                </div>
                <button type="button" onClick={() => onChange(undefined)} className="text-ink-tertiary hover:text-pertamina-red text-[11px]">
                  Hapus
                </button>
              </div>
              {value.fileData && (
                <div className="mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => viewDataUrl(value.fileData!)}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-emerald-300 px-2 py-1 text-[11px] text-emerald-800 hover:bg-emerald-100"
                  >
                    <Eye size={11} /> Lihat
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(value.fileData!, value.fileName!)}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-emerald-300 px-2 py-1 text-[11px] text-emerald-800 hover:bg-emerald-100"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              )}
            </div>
          ) : (
            <label className="flex w-full items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-border bg-white px-3 py-3 text-[12px] text-ink-tertiary hover:border-pertamina-red/40 hover:bg-pertamina-red-50/30 hover:text-pertamina-red transition">
              <Paperclip size={14} />
              <span>Pilih file untuk diunggah</span>
              <input
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  if (f.size > MAX_FILE_BYTES) {
                    toast.error(`File terlalu besar (${formatFileSize(f.size)}). Maksimal ${formatFileSize(MAX_FILE_BYTES)}.`)
                    return
                  }
                  try {
                    const dataUrl = await fileToDataUrl(f)
                    onChange({
                      fieldId: field.id,
                      value: f.name,
                      fileName: f.name,
                      fileSize: f.size,
                      fileType: f.type || 'application/octet-stream',
                      fileData: dataUrl,
                    })
                  } catch {
                    toast.error('Gagal membaca file')
                  }
                }}
              />
            </label>
          )}
          <div className="mt-1 text-[10px] text-ink-tertiary italic">
            Maks {formatFileSize(MAX_FILE_BYTES)}. File disimpan inline di request agar approver bisa preview & download.
          </div>
        </div>
      )}
    </label>
  )
}

function TypeIconForKind({ type }: { type: HandoffRequirementField['type'] }) {
  const cls = 'text-ink-tertiary'
  switch (type) {
    case 'text': return <TypeIcon size={11} className={cls} />
    case 'longtext': return <AlignLeft size={11} className={cls} />
    case 'url': return <LinkIcon size={11} className={cls} />
    case 'date': return <Calendar size={11} className={cls} />
    case 'checkbox': return <CheckSquare size={11} className={cls} />
    case 'document': return <FileText size={11} className={cls} />
  }
}

interface DisplayProps {
  fields: HandoffRequirementField[]
  values: Record<string, FulfilledRequirement>
}

/**
 * Read-only display of fulfilled requirements (for approver / requester view).
 */
export function RequirementsDisplay({ fields, values }: DisplayProps) {
  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-subtle bg-white px-3 py-3 text-[11px] text-ink-tertiary text-center">
        Tidak ada syarat handoff yang diberlakukan.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {fields.map((f) => {
        const v = values[f.id]
        const filled = !!v
        return (
          <div key={f.id} className="rounded-lg border border-border-subtle bg-white p-2.5">
            <div className="flex items-center gap-2">
              <TypeIconForKind type={f.type} />
              <span className="text-[12px] font-medium text-ink-primary">{f.label}</span>
              {f.required && <span className="text-pertamina-red text-[10px] font-semibold">*</span>}
              <span className="ml-auto text-[10px] text-ink-tertiary">
                {filled ? '✓ Diisi' : f.required ? '⚠ Belum diisi' : '— Opsional, dilewati'}
              </span>
            </div>
            {filled && <FulfillmentValue field={f} value={v} />}
          </div>
        )
      })}
    </div>
  )
}

function FulfillmentValue({ field, value }: { field: HandoffRequirementField; value: FulfilledRequirement }) {
  if (field.type === 'checkbox') {
    return (
      <div className="mt-1 flex items-center gap-1 text-[12px] text-emerald-700">
        <CheckSquare size={12} /> Dikonfirmasi
      </div>
    )
  }
  if (field.type === 'document') {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
        <Paperclip size={12} className="text-emerald-700" />
        <span className="font-medium text-ink-primary">{value.fileName ?? value.value}</span>
        {value.fileSize && <span className="text-[10px] text-ink-tertiary">({formatFileSize(value.fileSize)})</span>}
        {value.fileData ? (
          <span className="inline-flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => viewDataUrl(value.fileData!)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 text-[10px] text-ink-secondary hover:border-pertamina-red/40 hover:bg-pertamina-red-50 hover:text-pertamina-red transition"
              title="Buka di tab baru"
            >
              <Eye size={10} /> Lihat
            </button>
            <button
              type="button"
              onClick={() => downloadDataUrl(value.fileData!, value.fileName ?? 'file')}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 text-[10px] text-ink-secondary hover:border-pertamina-red/40 hover:bg-pertamina-red-50 hover:text-pertamina-red transition"
              title="Download file"
            >
              <Download size={10} /> Download
            </button>
          </span>
        ) : (
          <span className="text-[10px] text-ink-tertiary italic ml-auto">
            (file metadata saja — data tidak tersedia)
          </span>
        )}
      </div>
    )
  }
  if (field.type === 'url') {
    return (
      <a
        href={value.value}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-[12px] text-pertamina-red hover:underline break-all"
      >
        <LinkIcon size={11} /> {value.value}
      </a>
    )
  }
  if (field.type === 'date') {
    return <div className="mt-1 text-[12px] text-ink-primary">{formatDateShort(value.value)}</div>
  }
  return <div className="mt-1 text-[12px] text-ink-secondary whitespace-pre-wrap">{value.value}</div>
}
