import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { buildApprovalFlow, useProjectStore } from '../../store/useProjectStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useTeamStore } from '../../store/useTeamStore'
import { usePermissions } from '../../hooks/usePermissions'
import {
  APPROVAL_STEP_LABELS,
  PRIORITY_HEX,
  PRIORITY_LABELS,
  PROJECT_WEIGHT_TEMPLATES,
  STAGE_DEFAULT_WEIGHTS,
  STAGE_KEYS,
  STAGE_LABELS,
} from '../../utils/colors'
import type { BusinessStage, Priority, StageOwnerMap } from '../../types'
import { classNames } from '../../utils/helpers'
import { isValidWeights } from '../../utils/progress'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  defaultStage?: BusinessStage
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  low: 'Approval ringan — cukup checklist "telah mengetahui" dari OSM & DMO.',
  medium: 'Standar — OSM & DMO wajib memberi komentar approval.',
  high: 'Butuh Kickoff Meeting sebelum OSM & DMO approve.',
  critical: 'Kickoff Meeting + Risk Assessment, OSM & DMO wajib acknowledge risiko.',
}

export function AddProjectModal({ open, onClose, defaultStage }: Props) {
  const { user, can } = usePermissions()
  const createProject = useProjectStore((s) => s.createProject)
  const stageOwners = useWorkflowStore((s) => s.stageOwners)
  const teams = useTeamStore((s) => s.teams)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [customer, setCustomer] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tagsInput, setTagsInput] = useState('')
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  const [startStage, setStartStage] = useState<BusinessStage>(defaultStage ?? 'lead_to_active')
  const [template, setTemplate] = useState<string>('standard')
  const [customWeights, setCustomWeights] = useState<Record<BusinessStage, number>>(STAGE_DEFAULT_WEIGHTS)
  const [stageOwnerOverride, setStageOwnerOverride] = useState<Partial<StageOwnerMap>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isCustom = template === 'custom'
  const activeWeights = useMemo(() => {
    if (isCustom) return customWeights
    return PROJECT_WEIGHT_TEMPLATES.find((t) => t.key === template)?.weights ?? STAGE_DEFAULT_WEIGHTS
  }, [template, customWeights, isCustom])

  const weightSum = Object.values(activeWeights).reduce((a, b) => a + b, 0)
  const datesValid = !plannedStart || !plannedEnd || new Date(plannedStart) <= new Date(plannedEnd)
  const valid = code.trim() && name.trim() && plannedStart && plannedEnd && datesValid && isValidWeights(activeWeights)
  const perm = can('project.create')

  // Approval flow preview berdasarkan priority terpilih
  const previewFlow = useMemo(() => buildApprovalFlow(priority).filter((s) => s.type !== 'creator_submit'), [priority])

  if (!perm.allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="text-sm text-ink-secondary">{perm.reason}</div>
      </Modal>
    )
  }

  const submit = () => {
    if (!user) return
    if (!valid) {
      toast.error('Lengkapi field wajib (kode, nama, tanggal) & total bobot = 100')
      return
    }
    const resolvedOwners: Partial<StageOwnerMap> = {}
    STAGE_KEYS.forEach((s) => {
      resolvedOwners[s] = (stageOwnerOverride[s] && stageOwnerOverride[s]!.length > 0
        ? stageOwnerOverride[s]
        : stageOwners[s]) ?? []
    })
    const project = createProject({
      code,
      name,
      description,
      customer,
      priority,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      plannedStartDate: new Date(plannedStart).toISOString(),
      plannedEndDate: new Date(plannedEnd).toISOString(),
      weights: activeWeights,
      stageOwners: resolvedOwners,
      startStage,
      createdByUserId: user.id,
      createdByName: user.name,
    })
    toast.success(`Project "${project.name}" di-submit untuk approval`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Project Baru"
      description="Project akan masuk antrian approval sesuai prioritas yang dipilih sebelum aktif."
      size="2xl"
    >
      <div className="space-y-4">
        {/* === Basic info === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Kode Project *"
            placeholder="PGN-RT-PHE-001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            hint="Manual input — disarankan format PGN-{kategori}-{customer}-{nomor}"
          />
          <Input
            label="Nama Project *"
            placeholder="Pengadaan & Maintenance Radio Trunking PHE"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <Textarea
          label="Deskripsi"
          placeholder="Ringkasan scope project..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Customer"
            placeholder="PHE / Indomaret / Internal"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <Input
            label="Tags (pisah koma)"
            placeholder="phe, fiber, pro-service"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        {/* === Priority chip selector === */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Prioritas *</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITIES.map((p) => {
              const active = priority === p
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={classNames(
                    'rounded-lg border-2 px-3 py-2 text-left transition',
                    active ? 'shadow-sm' : 'border-border bg-white hover:bg-black/[0.03]',
                  )}
                  style={
                    active
                      ? { borderColor: PRIORITY_HEX[p], background: `${PRIORITY_HEX[p]}10` }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: PRIORITY_HEX[p] }}
                    />
                    <span className="text-[12px] font-semibold" style={active ? { color: PRIORITY_HEX[p] } : undefined}>
                      {PRIORITY_LABELS[p]}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] leading-snug text-ink-tertiary">
                    {PRIORITY_DESCRIPTIONS[p]}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* === Approval flow preview === */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Info size={14} className="text-amber-700" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Alur Approval Yang Akan Dibuat
            </span>
          </div>
          <ol className="flex flex-wrap items-center gap-1.5">
            {previewFlow.map((step, idx) => (
              <li key={step.id} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-primary">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">
                    {idx + 1}
                  </span>
                  {APPROVAL_STEP_LABELS[step.type]}
                  {step.requireComment && (
                    <span className="text-[9px] text-amber-700">+komentar</span>
                  )}
                  {step.requireRiskAck && (
                    <ShieldAlert size={10} className="text-pertamina-red" />
                  )}
                </span>
                {idx < previewFlow.length - 1 && (
                  <span className="text-amber-400">→</span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-2 text-[10px] text-amber-800/80">
            Setelah submit, project status = <strong>Menunggu Approval</strong>. Project baru akan tampil di Board Utama setelah <strong>semua step</strong> di atas disetujui.
          </div>
        </div>

        {/* === Planned dates === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Tanggal Mulai (Planned) *"
            type="date"
            value={plannedStart}
            onChange={(e) => setPlannedStart(e.target.value)}
            hint="Baseline untuk S-Curve planned progress"
          />
          <Input
            label="Target Selesai (Planned) *"
            type="date"
            value={plannedEnd}
            onChange={(e) => setPlannedEnd(e.target.value)}
            hint="Baseline untuk S-Curve planned progress"
          />
        </div>
        {!datesValid && (
          <div className="flex items-center gap-1.5 text-[11px] text-pertamina-red">
            <AlertTriangle size={12} />
            Tanggal mulai harus ≤ target selesai
          </div>
        )}

        {/* === Advanced (stage config) === */}
        <div>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] font-medium text-ink-secondary hover:text-ink-primary underline-offset-2 hover:underline"
          >
            {showAdvanced ? 'Sembunyikan' : 'Tampilkan'} pengaturan stage L0 & bobot →
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border border-border-subtle bg-black/[0.02] p-3">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">
                Mulai di Stage L0
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STAGE_KEYS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStartStage(s)}
                    className={classNames(
                      'rounded-md border px-2 py-1 text-[11px] font-medium transition',
                      startStage === s
                        ? 'border-pertamina-red/40 bg-pertamina-red-50 text-pertamina-red'
                        : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                    )}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Template Bobot</span>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_WEIGHT_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTemplate(t.key)}
                    className={classNames(
                      'rounded-md border px-2 py-1 text-[11px] font-medium transition',
                      template === t.key
                        ? 'border-pertamina-red/40 bg-pertamina-red-50 text-pertamina-red'
                        : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                    )}
                    title={t.description}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setTemplate('custom')
                    if (!isCustom) setCustomWeights(activeWeights)
                  }}
                  className={classNames(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition',
                    isCustom
                      ? 'border-pertamina-red/40 bg-pertamina-red-50 text-pertamina-red'
                      : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border-subtle overflow-hidden bg-white">
              <div className="grid grid-cols-[1fr_80px_minmax(0,1.2fr)] gap-2 px-3 py-2 bg-black/[0.03] text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                <span>Stage L0</span>
                <span className="text-right">Bobot %</span>
                <span>Owner Divisi</span>
              </div>
              {STAGE_KEYS.map((stage) => {
                const owners =
                  stageOwnerOverride[stage] && stageOwnerOverride[stage]!.length > 0
                    ? stageOwnerOverride[stage]!
                    : stageOwners[stage] ?? []
                return (
                  <div
                    key={stage}
                    className="grid grid-cols-[1fr_80px_minmax(0,1.2fr)] items-center gap-2 px-3 py-2 border-t border-border-subtle text-[12px]"
                  >
                    <span className="text-ink-primary">{STAGE_LABELS[stage]}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activeWeights[stage]}
                      disabled={!isCustom}
                      onChange={(e) =>
                        setCustomWeights((w) => ({
                          ...w,
                          [stage]: Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))),
                        }))
                      }
                      className="input-base text-right py-1"
                    />
                    <div className="flex flex-wrap gap-1">
                      {teams.map((t) => {
                        const active = owners.includes(t.id)
                        return (
                          <button
                            key={t.id}
                            onClick={() =>
                              setStageOwnerOverride((prev) => {
                                const curr = (prev[stage] && prev[stage]!.length > 0
                                  ? prev[stage]!
                                  : owners
                                ).filter(Boolean)
                                const next = active ? curr.filter((x) => x !== t.id) : [...curr, t.id]
                                return { ...prev, [stage]: next }
                              })
                            }
                            className={classNames(
                              'rounded-md border px-1.5 py-0.5 text-[10px] font-mono',
                              active
                                ? 'text-white'
                                : 'text-ink-secondary bg-white border-border hover:bg-black/[0.03]',
                            )}
                            style={active ? { background: t.color, borderColor: t.color } : undefined}
                          >
                            {t.acronym}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div
                className={classNames(
                  'flex items-center justify-between px-3 py-2 text-[11px] border-t border-border-subtle',
                  weightSum === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                )}
              >
                <span>Total bobot</span>
                <span className="font-mono font-semibold">{weightSum} / 100</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
        <button onClick={onClose} className="btn-ghost">
          Batal
        </button>
        <button
          onClick={submit}
          disabled={!valid}
          className={classNames('btn-primary inline-flex items-center gap-1.5', !valid && 'opacity-50 cursor-not-allowed')}
        >
          <CheckCircle2 size={14} />
          Submit untuk Approval
        </button>
      </div>
    </Modal>
  )
}
