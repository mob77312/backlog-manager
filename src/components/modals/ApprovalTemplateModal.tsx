import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { useApprovalTemplateStore, type ApprovalTemplateStep } from '../../store/useApprovalTemplateStore'
import { APPROVAL_STEP_LABELS, PRIORITY_HEX, PRIORITY_LABELS } from '../../utils/colors'
import type { ApprovalStepType, ApproverRole, Priority } from '../../types'
import { classNames } from '../../utils/helpers'

interface Props {
  open: boolean
  onClose: () => void
}

const STEP_TYPES: ApprovalStepType[] = ['creator_submit', 'kadiv_approval', 'kickoff_meeting', 'risk_assessment', 'osm_approval', 'dmo_approval']
const ROLES: ApproverRole[] = ['project_owner', 'kadiv_approver', 'osm_approver', 'dmo_approver', 'system']
const ROLE_LABELS: Record<ApproverRole, string> = {
  project_owner: 'Project Owner',
  kadiv_approver: 'Kadiv (Divisi Sendiri)',
  osm_approver: 'OSM Approver',
  dmo_approver: 'DMO Approver',
  system: 'System (auto)',
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

export function ApprovalTemplateModal({ open, onClose }: Props) {
  const templates = useApprovalTemplateStore((s) => s.templates)
  const setTemplate = useApprovalTemplateStore((s) => s.setTemplate)
  const resetToDefault = useApprovalTemplateStore((s) => s.resetToDefault)
  const [activeTier, setActiveTier] = useState<Priority>('medium')

  const current = templates[activeTier]

  const updateStep = (idx: number, patch: Partial<ApprovalTemplateStep>) => {
    const next = current.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    setTemplate(activeTier, next)
  }

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= current.length) return
    const next = current.slice()
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setTemplate(activeTier, next)
  }

  const removeStep = (idx: number) => {
    if (current[idx].type === 'creator_submit') {
      toast.error('Step Creator Submit wajib ada (tidak dapat dihapus)')
      return
    }
    if (current.length <= 2) {
      toast.error('Minimal 2 step (creator_submit + 1 approver)')
      return
    }
    const next = current.filter((_, i) => i !== idx)
    setTemplate(activeTier, next)
  }

  const addStep = () => {
    const exists = new Set(current.map((s) => s.type))
    const remaining = STEP_TYPES.filter((t) => t !== 'creator_submit' && !exists.has(t))
    if (remaining.length === 0) {
      toast.error('Semua step type sudah dipakai')
      return
    }
    const newType = remaining[0]
    const newStep: ApprovalTemplateStep = {
      type: newType,
      requiredRole:
        newType === 'osm_approval' ? 'osm_approver' :
        newType === 'dmo_approval' ? 'dmo_approver' :
        newType === 'kadiv_approval' ? 'kadiv_approver' : 'project_owner',
      requireComment: newType === 'osm_approval' || newType === 'dmo_approval' || newType === 'kadiv_approval',
      requireRiskAck: false,
    }
    setTemplate(activeTier, [...current, newStep])
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Konfigurasi Approval Templates"
      description="Atur sequence step approval per tier priority. Step Creator Submit selalu pertama dan auto-approved."
      size="2xl"
    >
      <div className="space-y-3">
        {/* Tier selector */}
        <div className="flex items-center gap-1.5">
          {PRIORITIES.map((p) => {
            const active = activeTier === p
            return (
              <button
                key={p}
                onClick={() => setActiveTier(p)}
                className={classNames(
                  'inline-flex items-center gap-1.5 rounded-md border-2 px-2.5 py-1 text-[12px] font-semibold transition',
                  active ? 'shadow-sm' : 'border-border bg-white text-ink-secondary hover:bg-black/[0.03]',
                )}
                style={active ? { borderColor: PRIORITY_HEX[p], color: PRIORITY_HEX[p], background: `${PRIORITY_HEX[p]}10` } : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_HEX[p] }} />
                {PRIORITY_LABELS[p]}
                <span className={classNames('rounded-full px-1 py-0 text-[9px]', active ? 'bg-white' : 'bg-black/[0.08] text-ink-secondary')}>
                  {templates[p].length} step
                </span>
              </button>
            )
          })}
          <button
            onClick={() => {
              if (confirm('Reset semua tier ke template default?')) {
                resetToDefault()
                toast.success('Template direset ke default')
              }
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-ink-secondary hover:text-pertamina-red hover:border-pertamina-red/40 transition"
            title="Reset semua tier ke default"
          >
            <RotateCcw size={11} />
            Reset Default
          </button>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-800">
          ⚠ Perubahan template hanya berlaku untuk project <strong>baru</strong>. Project existing tetap menggunakan flow yang sudah di-generate saat dibuat.
        </div>

        {/* Steps list */}
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          <div className="grid grid-cols-[30px_1fr_140px_90px_90px_60px] gap-2 px-2 py-1.5 bg-black/[0.03] text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
            <span className="text-center">#</span>
            <span>Step Type</span>
            <span>Required Role</span>
            <span className="text-center">Komentar?</span>
            <span className="text-center">Risk Ack?</span>
            <span></span>
          </div>
          {current.map((step, idx) => {
            const isCreator = step.type === 'creator_submit'
            return (
              <div
                key={idx}
                className={classNames(
                  'grid grid-cols-[30px_1fr_140px_90px_90px_60px] items-center gap-2 px-2 py-1.5 border-t border-border-subtle text-[11px]',
                  isCreator && 'bg-black/[0.02]',
                )}
              >
                <span className="text-center font-mono font-bold text-ink-tertiary">{idx + 1}</span>
                <Select
                  value={step.type}
                  disabled={isCreator}
                  onChange={(e) => updateStep(idx, { type: e.target.value as ApprovalStepType })}
                  options={STEP_TYPES.map((t) => ({
                    value: t,
                    label: APPROVAL_STEP_LABELS[t] + (current.some((s, i) => i !== idx && s.type === t) ? ' (duplikat)' : ''),
                  }))}
                  className="text-[11px] py-0.5"
                />
                <Select
                  value={step.requiredRole}
                  disabled={isCreator}
                  onChange={(e) => updateStep(idx, { requiredRole: e.target.value as ApproverRole })}
                  options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                  className="text-[11px] py-0.5"
                />
                <label className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={step.requireComment}
                    disabled={isCreator}
                    onChange={(e) => updateStep(idx, { requireComment: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={step.requireRiskAck}
                    disabled={isCreator}
                    onChange={(e) => updateStep(idx, { requireRiskAck: e.target.checked })}
                  />
                </label>
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0 || isCreator}
                    className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Naik"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === current.length - 1 || isCreator}
                    className="rounded p-1 text-ink-tertiary hover:text-ink-primary hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Turun"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    onClick={() => removeStep(idx)}
                    disabled={isCreator}
                    className="rounded p-1 text-ink-tertiary hover:text-pertamina-red hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Hapus step"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={addStep}
          className="w-full rounded-md border border-dashed border-pertamina-red/40 bg-pertamina-red-50/40 px-3 py-2 text-[11px] font-medium text-pertamina-red hover:bg-pertamina-red-50/60 inline-flex items-center justify-center gap-1.5"
        >
          <Plus size={12} />
          Tambah Step
        </button>

        <div className="flex items-center justify-end pt-2 border-t border-border-subtle">
          <button onClick={onClose} className="btn-primary">
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  )
}
