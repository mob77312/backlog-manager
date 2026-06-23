import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { computeRiskSeverity, useProjectStore } from '../../store/useProjectStore'
import { usePermissions } from '../../hooks/usePermissions'
import {
  RISK_LEVEL_LABELS,
  RISK_SEVERITY_HEX,
  RISK_SEVERITY_LABELS,
  RISK_STATUS_HEX,
  RISK_STATUS_LABELS,
} from '../../utils/colors'
import type { Project, RiskItem, RiskLevel, RiskStatus } from '../../types'
import { classNames } from '../../utils/helpers'

interface Props {
  project: Project
  /** Optional: tampil sebagai bagian step approval — kalau true, ada tombol "Selesai & Approve". */
  asApprovalStep?: boolean
  onApproved?: () => void
  onCancel?: () => void
}

const LEVELS: RiskLevel[] = ['low', 'medium', 'high']
const STATUSES: RiskStatus[] = ['open', 'mitigated', 'accepted', 'closed']

export function RiskRegisterPanel({ project, asApprovalStep = false, onApproved, onCancel }: Props) {
  const { user } = usePermissions()
  const addRisk = useProjectStore((s) => s.addRisk)
  const updateRisk = useProjectStore((s) => s.updateRisk)
  const removeRisk = useProjectStore((s) => s.removeRisk)

  const [showForm, setShowForm] = useState(project.riskRegister.length === 0)
  const [desc, setDesc] = useState('')
  const [probability, setProbability] = useState<RiskLevel>('medium')
  const [impact, setImpact] = useState<RiskLevel>('medium')
  const [mitigation, setMitigation] = useState('')
  const [owner, setOwner] = useState('')

  const previewSeverity = computeRiskSeverity(probability, impact)

  const submitAddRisk = () => {
    if (!user) return
    if (!desc.trim()) {
      toast.error('Deskripsi risiko wajib')
      return
    }
    const result = addRisk(
      project.id,
      {
        description: desc,
        probability,
        impact,
        mitigationPlan: mitigation,
        riskOwner: owner,
      },
      user.name,
    )
    if (!result.ok) {
      toast.error(result.error ?? 'Gagal menambah risiko')
      return
    }
    toast.success(`Risiko ${result.risk?.code} ditambah`)
    setDesc('')
    setMitigation('')
    setOwner('')
    setProbability('medium')
    setImpact('medium')
    setShowForm(false)
  }

  const finishApproval = () => {
    if (project.riskRegister.length === 0) {
      toast.error('Minimal 1 risiko wajib dicatat sebelum approve step')
      return
    }
    onApproved?.()
  }

  return (
    <div
      className={classNames(
        'rounded-lg border p-3',
        asApprovalStep ? 'border-pertamina-red/30 bg-pertamina-red-50/30' : 'border-border-subtle bg-white',
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <ShieldAlert size={14} className="text-pertamina-red" />
        <span className="text-[12px] font-semibold text-pertamina-red">
          Risk Register ({project.riskRegister.length})
        </span>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-pertamina-red/40 bg-white px-2 py-0.5 text-[10px] font-medium text-pertamina-red hover:bg-pertamina-red-50/60"
          >
            <Plus size={11} /> Tambah Risiko
          </button>
        )}
      </div>

      {/* Risk table */}
      {project.riskRegister.length === 0 ? (
        <div className="mb-2 rounded-md border border-dashed border-border-subtle px-3 py-3 text-center text-[11px] text-ink-tertiary">
          Belum ada risiko terdaftar. Tambah minimal 1 risiko untuk project CRITICAL.
        </div>
      ) : (
        <div className="mb-2 rounded-md border border-border-subtle bg-white overflow-hidden">
          <div className="grid grid-cols-[50px_1fr_70px_70px_80px_80px] gap-2 px-2 py-1.5 bg-black/[0.03] text-[9px] font-semibold uppercase tracking-wider text-ink-tertiary">
            <span>Kode</span>
            <span>Deskripsi</span>
            <span className="text-center">Prob</span>
            <span className="text-center">Impact</span>
            <span className="text-center">Severity</span>
            <span>Status</span>
          </div>
          {project.riskRegister.map((r) => (
            <RiskRow
              key={r.id}
              risk={r}
              onUpdate={(patch) => user && updateRisk(project.id, r.id, patch, user.name)}
              onRemove={() => {
                if (!user) return
                if (confirm(`Hapus risiko ${r.code}?`)) removeRisk(project.id, r.id, user.name)
              }}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded-md border border-pertamina-red/40 bg-white p-2.5">
          <div className="mb-2 text-[11px] font-semibold text-pertamina-red">Tambah Risiko Baru</div>
          <Textarea
            label="Deskripsi Risiko *"
            placeholder="Mis: Keterlambatan supplier radio module dapat menggeser go-live"
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Select
              label="Probability"
              value={probability}
              onChange={(e) => setProbability(e.target.value as RiskLevel)}
              options={LEVELS.map((l) => ({ value: l, label: RISK_LEVEL_LABELS[l] }))}
            />
            <Select
              label="Impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value as RiskLevel)}
              options={LEVELS.map((l) => ({ value: l, label: RISK_LEVEL_LABELS[l] }))}
            />
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Severity (auto)</span>
              <div
                className="h-[34px] rounded-md border-2 px-2 flex items-center text-[12px] font-bold uppercase"
                style={{
                  borderColor: RISK_SEVERITY_HEX[previewSeverity],
                  color: RISK_SEVERITY_HEX[previewSeverity],
                  background: `${RISK_SEVERITY_HEX[previewSeverity]}12`,
                }}
              >
                {RISK_SEVERITY_LABELS[previewSeverity]}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <Textarea
              label="Mitigation Plan"
              placeholder="Rencana mitigasi: alternative supplier, parallel sourcing, etc."
              rows={2}
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
            />
          </div>
          <div className="mt-2">
            <Input
              label="Risk Owner"
              placeholder="Nama PIC yang menangani risiko ini"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">
              Batal
            </button>
            <button onClick={submitAddRisk} className="btn-primary inline-flex items-center gap-1.5">
              <Plus size={13} /> Tambah ke Register
            </button>
          </div>
        </div>
      )}

      {/* Approval action */}
      {asApprovalStep && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {onCancel && (
            <button onClick={onCancel} className="btn-ghost">
              Batal
            </button>
          )}
          <button
            onClick={finishApproval}
            disabled={project.riskRegister.length === 0}
            className={classNames(
              'btn-primary inline-flex items-center gap-1.5',
              project.riskRegister.length === 0 && 'opacity-50 cursor-not-allowed',
            )}
          >
            <CheckCircle2 size={14} />
            Selesai & Tandai Step Approved
          </button>
        </div>
      )}
    </div>
  )
}

function RiskRow({
  risk,
  onUpdate,
  onRemove,
}: {
  risk: RiskItem
  onUpdate: (patch: Partial<RiskItem>) => void
  onRemove: () => void
}) {
  const sevHex = RISK_SEVERITY_HEX[risk.severity]
  const statusHex = RISK_STATUS_HEX[risk.status]
  return (
    <div className="grid grid-cols-[50px_1fr_70px_70px_80px_80px] items-start gap-2 px-2 py-2 border-t border-border-subtle text-[11px]">
      <span className="font-mono font-bold text-ink-primary">{risk.code}</span>
      <div className="min-w-0">
        <div className="text-ink-primary truncate">{risk.description}</div>
        {risk.mitigationPlan && (
          <div className="mt-0.5 text-[10px] text-ink-tertiary truncate" title={risk.mitigationPlan}>
            → {risk.mitigationPlan}
          </div>
        )}
        {risk.riskOwner && (
          <div className="mt-0.5 text-[10px] text-ink-tertiary">Owner: {risk.riskOwner}</div>
        )}
      </div>
      <Select
        value={risk.probability}
        onChange={(e) => onUpdate({ probability: e.target.value as RiskLevel })}
        options={LEVELS.map((l) => ({ value: l, label: RISK_LEVEL_LABELS[l] }))}
        className="text-[10px] py-0"
      />
      <Select
        value={risk.impact}
        onChange={(e) => onUpdate({ impact: e.target.value as RiskLevel })}
        options={LEVELS.map((l) => ({ value: l, label: RISK_LEVEL_LABELS[l] }))}
        className="text-[10px] py-0"
      />
      <span
        className="inline-flex items-center justify-center rounded-md border-2 px-1 py-0.5 text-[10px] font-bold uppercase"
        style={{ borderColor: sevHex, color: sevHex, background: `${sevHex}12` }}
      >
        {RISK_SEVERITY_LABELS[risk.severity]}
      </span>
      <div className="flex items-center gap-1">
        <Select
          value={risk.status}
          onChange={(e) => onUpdate({ status: e.target.value as RiskStatus })}
          options={STATUSES.map((s) => ({ value: s, label: RISK_STATUS_LABELS[s] }))}
          className="text-[10px] py-0 flex-1"
        />
        <button
          onClick={onRemove}
          className="rounded p-0.5 text-ink-tertiary hover:text-pertamina-red transition shrink-0"
          title="Hapus risiko"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <span
        className="hidden h-1 rounded-full"
        style={{ background: statusHex }}
        aria-hidden
      />
      <AlertTriangle size={0} className="hidden" />
    </div>
  )
}
