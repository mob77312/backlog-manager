import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { useProjectStore } from '../../store/useProjectStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useTeamStore } from '../../store/useTeamStore'
import { usePermissions } from '../../hooks/usePermissions'
import {
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

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

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
  const [startDate, setStartDate] = useState('')
  const [targetClose, setTargetClose] = useState('')
  const [startStage, setStartStage] = useState<BusinessStage>(defaultStage ?? 'lead_to_active')
  const [template, setTemplate] = useState<string>('standard')
  const [customWeights, setCustomWeights] = useState<Record<BusinessStage, number>>(STAGE_DEFAULT_WEIGHTS)
  // Per-stage owner override (kosong = pakai default stageOwners)
  const [stageOwnerOverride, setStageOwnerOverride] = useState<Partial<StageOwnerMap>>({})

  const isCustom = template === 'custom'
  const activeWeights = useMemo(() => {
    if (isCustom) return customWeights
    return PROJECT_WEIGHT_TEMPLATES.find((t) => t.key === template)?.weights ?? STAGE_DEFAULT_WEIGHTS
  }, [template, customWeights, isCustom])

  const weightSum = Object.values(activeWeights).reduce((a, b) => a + b, 0)
  const valid = code.trim() && name.trim() && isValidWeights(activeWeights)
  const perm = can('project.create')

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
      toast.error('Lengkapi field & total bobot harus = 100')
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
      startDate: startDate ? new Date(startDate).toISOString() : null,
      targetCloseDate: targetClose ? new Date(targetClose).toISOString() : null,
      weights: activeWeights,
      stageOwners: resolvedOwners,
      startStage,
      createdByUserId: user.id,
      createdByName: user.name,
    })
    toast.success(`Project "${project.name}" dibuat`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Project Baru"
      description="Tentukan kode, owner divisi per stage, dan bobot progress."
      size="2xl"
    >
      <div className="space-y-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Customer" placeholder="PHE / Indomaret / Internal" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <Select
            label="Prioritas"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          />
          <Input
            label="Tags (pisah koma)"
            placeholder="phe, fiber, pro-service"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Target Close"
            type="date"
            value={targetClose}
            onChange={(e) => setTargetClose(e.target.value)}
          />
        </div>

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
          <span className="mt-1 block text-[10px] text-ink-tertiary">
            Default Lead to Active. Pilih stage berbeda kalau project memulai dari tengah pipeline (mis. existing maintenance contract langsung di Operate).
          </span>
        </div>

        {/* Template bobot */}
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
                isCustom ? 'border-pertamina-red/40 bg-pertamina-red-50 text-pertamina-red' : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
              )}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Stage config table */}
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_minmax(0,1.2fr)] gap-2 px-3 py-2 bg-black/[0.03] text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
            <span>Stage L0</span>
            <span className="text-right">Bobot %</span>
            <span>Owner Divisi</span>
          </div>
          {STAGE_KEYS.map((stage) => {
            const owners = stageOwnerOverride[stage] && stageOwnerOverride[stage]!.length > 0
              ? stageOwnerOverride[stage]!
              : stageOwners[stage] ?? []
            return (
              <div key={stage} className="grid grid-cols-[1fr_80px_minmax(0,1.2fr)] items-center gap-2 px-3 py-2 border-t border-border-subtle text-[12px]">
                <span className="text-ink-primary">{STAGE_LABELS[stage]}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={activeWeights[stage]}
                  disabled={!isCustom}
                  onChange={(e) =>
                    setCustomWeights((w) => ({ ...w, [stage]: Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))) }))
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
                            const curr = (prev[stage] && prev[stage]!.length > 0 ? prev[stage]! : owners).filter(Boolean)
                            const next = active ? curr.filter((x) => x !== t.id) : [...curr, t.id]
                            return { ...prev, [stage]: next }
                          })
                        }
                        className={classNames(
                          'rounded-md border px-1.5 py-0.5 text-[10px] font-mono',
                          active ? 'text-white' : 'text-ink-secondary bg-white border-border hover:bg-black/[0.03]',
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

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">
          Batal
        </button>
        <button onClick={submit} disabled={!valid} className={classNames('btn-primary', !valid && 'opacity-50 cursor-not-allowed')}>
          Buat Project
        </button>
      </div>
    </Modal>
  )
}
