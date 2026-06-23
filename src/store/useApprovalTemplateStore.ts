import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApprovalStepType, ApproverRole, Priority } from '../types'

export interface ApprovalTemplateStep {
  type: ApprovalStepType
  requiredRole: ApproverRole
  requireComment: boolean
  requireRiskAck: boolean
}

export type ApprovalTemplateMap = Record<Priority, ApprovalTemplateStep[]>

/**
 * Default template — Kadiv Approval di-insert sebagai approval level internal pertama.
 * Flow: Creator → Kadiv → [Kickoff] → [Risk] → OSM → DMO
 *   - LOW      : Kadiv (checklist) → OSM (checklist) → DMO (checklist)
 *   - MEDIUM   : Kadiv (komentar)  → OSM (komentar)  → DMO (komentar)
 *   - HIGH     : Kadiv (komentar)  → Kickoff → OSM (komentar) → DMO (komentar)
 *   - CRITICAL : Kadiv (komentar+ack) → Kickoff → Risk → OSM (ack) → DMO (ack)
 */
export const DEFAULT_TEMPLATES: ApprovalTemplateMap = {
  low: [
    { type: 'creator_submit', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'kadiv_approval', requiredRole: 'kadiv_approver', requireComment: false, requireRiskAck: false },
    { type: 'osm_approval', requiredRole: 'osm_approver', requireComment: false, requireRiskAck: false },
    { type: 'dmo_approval', requiredRole: 'dmo_approver', requireComment: false, requireRiskAck: false },
  ],
  medium: [
    { type: 'creator_submit', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'kadiv_approval', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: false },
    { type: 'osm_approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: false },
    { type: 'dmo_approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: false },
  ],
  high: [
    { type: 'creator_submit', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'kadiv_approval', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: false },
    { type: 'kickoff_meeting', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'osm_approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: false },
    { type: 'dmo_approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: false },
  ],
  critical: [
    { type: 'creator_submit', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'kadiv_approval', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: true },
    { type: 'kickoff_meeting', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'risk_assessment', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false },
    { type: 'osm_approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: true },
    { type: 'dmo_approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: true },
  ],
}

interface ApprovalTemplateState {
  templates: ApprovalTemplateMap
  setTemplate: (priority: Priority, steps: ApprovalTemplateStep[]) => void
  resetToDefault: () => void
}

export const useApprovalTemplateStore = create<ApprovalTemplateState>()(
  persist(
    (set) => ({
      templates: DEFAULT_TEMPLATES,
      setTemplate: (priority, steps) =>
        set((s) => ({ templates: { ...s.templates, [priority]: steps } })),
      resetToDefault: () => set({ templates: DEFAULT_TEMPLATES }),
    }),
    { name: 'flowdesk:approval-templates' },
  ),
)
