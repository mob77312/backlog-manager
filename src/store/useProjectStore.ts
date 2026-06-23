import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApprovalStep, BusinessStage, KickoffMeeting, Priority, Project, ProjectCompletion, ProjectStageConfig, ProjectStatus, RiskItem, RiskLevel, RiskSeverity } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { APPROVAL_STEP_LABELS, STAGE_DEFAULT_WEIGHTS, STAGE_KEYS, STAGE_LABELS } from '../utils/colors'
import { useLogStore } from './useLogStore'
import { useNotificationStore } from './useNotificationStore'
import { useApprovalTemplateStore, DEFAULT_TEMPLATES } from './useApprovalTemplateStore'
import { SEED_PROJECTS } from './projectSeed'

/** Severity lookup matrix: probability × impact. */
const SEVERITY_MATRIX: Record<RiskLevel, Record<RiskLevel, RiskSeverity>> = {
  low: { low: 'low', medium: 'low', high: 'medium' },
  medium: { low: 'low', medium: 'medium', high: 'high' },
  high: { low: 'medium', medium: 'high', high: 'extreme' },
}

export function computeRiskSeverity(probability: RiskLevel, impact: RiskLevel): RiskSeverity {
  return SEVERITY_MATRIX[probability][impact]
}

function nextRiskCode(existing: RiskItem[]): string {
  const nums = existing
    .map((r) => {
      const m = r.code.match(/^R(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
  const max = nums.length ? Math.max(...nums) : 0
  return `R${String(max + 1).padStart(3, '0')}`
}

/**
 * Build approval flow steps berdasarkan priority project.
 * LOW       : Creator → OSM checklist → DMO checklist
 * MEDIUM    : Creator → OSM (comment) → DMO (comment)
 * HIGH      : Creator → Kickoff Meeting → OSM (comment) → DMO (comment)
 * CRITICAL  : Creator → Kickoff Meeting → Risk Assessment → OSM (comment + ack) → DMO (comment + ack)
 *
 * Catatan: Kickoff & Risk Assessment di P1 hanya sebagai placeholder step
 * (status pending, dapat di-mark complete oleh project owner). Form lengkapnya
 * akan diisi di P4 (Kickoff) dan P5 (Risk Assessment).
 */
export function buildApprovalFlow(priority: Priority): ApprovalStep[] {
  // I7: baca template configurable dari store. Fallback ke DEFAULT_TEMPLATES kalau store kosong.
  const template = useApprovalTemplateStore.getState().templates[priority] ?? DEFAULT_TEMPLATES[priority]
  const now = nowIso()
  return template.map((step, idx) => ({
    id: uid('step'),
    order: idx + 1,
    type: step.type,
    label: APPROVAL_STEP_LABELS[step.type],
    // Step pertama (creator_submit) auto-approved
    status: step.type === 'creator_submit' ? 'approved' : 'pending',
    requiredRole: step.requiredRole,
    requireComment: step.requireComment,
    requireRiskAck: step.requireRiskAck,
    approvedByUserId: null,
    approvedByName: null,
    approvedAt: step.type === 'creator_submit' ? now : null,
    comment: null,
    riskAcknowledged: false,
    acknowledgedChecklist: false,
    rejectedReason: null,
  }))
}

/** Step index berikutnya yang menunggu approval (sequential gating). */
export function getNextPendingStep(approvalFlow: ApprovalStep[]): ApprovalStep | null {
  return approvalFlow.find((s) => s.status === 'pending') ?? null
}

/** Approval flow lengkap? */
export function isApprovalFlowComplete(approvalFlow: ApprovalStep[]): boolean {
  return approvalFlow.every((s) => s.status === 'approved' || s.status === 'skipped')
}

export function buildDefaultStageConfig(
  weights: Record<BusinessStage, number> = STAGE_DEFAULT_WEIGHTS,
  stageOwners: Partial<Record<BusinessStage, string[]>> = {},
): ProjectStageConfig[] {
  return STAGE_KEYS.map((stage) => ({
    stage,
    weight: weights[stage] ?? 0,
    ownerTeamIds: stageOwners[stage] ?? [],
    status: 'not_started',
    progressOverride: null,
    enteredAt: null,
    completedAt: null,
  }))
}

interface CreateProjectInput {
  code: string
  name: string
  description?: string
  customer?: string
  priority?: Priority
  tags?: string[]
  startDate?: string | null
  targetCloseDate?: string | null
  /** P1: planned dates (untuk baseline S-Curve di P3). */
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  weights?: Record<BusinessStage, number>
  stageOwners?: Partial<Record<BusinessStage, string[]>>
  startStage?: BusinessStage
  createdByUserId: string
  createdByName: string
}

interface ProjectState {
  projects: Project[]
  getProject: (id: string | null | undefined) => Project | undefined
  createProject: (input: CreateProjectInput) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  updateStageConfig: (id: string, stage: BusinessStage, patch: Partial<ProjectStageConfig>) => void
  setWeights: (id: string, weights: Record<BusinessStage, number>) => void
  advanceStage: (id: string, byUserId: string, byName: string, reason: string) => { ok: boolean; error?: string }
  sendBackStage: (id: string, byUserId: string, byName: string, reason: string) => { ok: boolean; error?: string }
  closeProject: (id: string, byUserId: string, byName: string) => void
  /** F4: tutup project dengan form penyelesaian lengkap (BAST wajib, ≥1 evidence). */
  closeProjectWithCompletion: (id: string, completion: Omit<ProjectCompletion, 'closedAt'>) => { ok: boolean; error?: string }
  setStatus: (id: string, status: ProjectStatus) => void
  deleteProject: (id: string) => void
  clearAll: () => void
  /** I6: reset ke seed data (untuk demo). */
  resetToSeed: () => void
  /** P1: approve step approval flow. */
  approveStep: (
    projectId: string,
    stepId: string,
    byUserId: string,
    byName: string,
    payload: { comment?: string; riskAcknowledged?: boolean; acknowledgedChecklist?: boolean }
  ) => { ok: boolean; error?: string; activated?: boolean }
  /** P1: reject step → status project rejected. */
  rejectStep: (projectId: string, stepId: string, byUserId: string, byName: string, reason: string) => { ok: boolean; error?: string }
  /** I2: resubmit project yang rejected — reset step rejected ke pending, status balik ke pending_approval. */
  resubmitForApproval: (projectId: string, byUserId: string, byName: string, revisionNote: string) => { ok: boolean; error?: string }
  /** P4: simpan/update kickoff meeting data. */
  setKickoff: (projectId: string, kickoff: Omit<KickoffMeeting, 'recordedAt'>) => { ok: boolean; error?: string }
  /** P5: tambah risk item baru. */
  addRisk: (projectId: string, input: { description: string; probability: RiskLevel; impact: RiskLevel; mitigationPlan: string; riskOwner: string }, byName: string) => { ok: boolean; error?: string; risk?: RiskItem }
  updateRisk: (projectId: string, riskId: string, patch: Partial<Pick<RiskItem, 'description' | 'probability' | 'impact' | 'mitigationPlan' | 'riskOwner' | 'status'>>, byName: string) => { ok: boolean; error?: string }
  removeRisk: (projectId: string, riskId: string, byName: string) => { ok: boolean; error?: string }
}

function nextStage(curr: BusinessStage): BusinessStage | null {
  const idx = STAGE_KEYS.indexOf(curr)
  if (idx < 0 || idx >= STAGE_KEYS.length - 1) return null
  return STAGE_KEYS[idx + 1]
}

function prevStage(curr: BusinessStage): BusinessStage | null {
  const idx = STAGE_KEYS.indexOf(curr)
  if (idx <= 0) return null
  return STAGE_KEYS[idx - 1]
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      getProject: (id) => (id ? get().projects.find((p) => p.id === id) : undefined),

      createProject: (input) => {
        const stageConfig = buildDefaultStageConfig(input.weights, input.stageOwners)
        const firstStage =
          input.startStage ?? stageConfig.find((s) => s.weight > 0)?.stage ?? STAGE_KEYS[0]
        const now = nowIso()
        const startIdx = STAGE_KEYS.indexOf(firstStage)
        stageConfig.forEach((s) => {
          const idx = STAGE_KEYS.indexOf(s.stage)
          if (idx < startIdx) {
            s.status = 'skipped'
            s.progressOverride = 100
            s.enteredAt = now
            s.completedAt = now
          } else if (s.stage === firstStage) {
            s.status = 'in_progress'
            s.enteredAt = now
          }
        })
        const priority = input.priority ?? 'medium'
        // P1: bangun approval flow berdasarkan priority. Project mulai sebagai pending_approval.
        const approvalFlow = buildApprovalFlow(priority).map((step) => ({
          ...step,
          approvedByUserId: step.type === 'creator_submit' ? input.createdByUserId : step.approvedByUserId,
          approvedByName: step.type === 'creator_submit' ? input.createdByName : step.approvedByName,
        }))
        const project: Project = {
          id: uid('prj'),
          code: input.code.trim(),
          name: input.name.trim(),
          description: input.description ?? '',
          customer: input.customer ?? '',
          priority,
          status: 'pending_approval',
          currentStage: firstStage,
          stageConfig,
          stageHistory: [
            {
              id: uid('pst'),
              fromStage: null,
              toStage: firstStage,
              direction: 'forward',
              byUserId: input.createdByUserId,
              byName: input.createdByName,
              reason: 'Project dibuat',
              timestamp: now,
            },
          ],
          tags: input.tags ?? [],
          plannedStartDate: input.plannedStartDate ?? input.startDate ?? null,
          plannedEndDate: input.plannedEndDate ?? input.targetCloseDate ?? null,
          actualStartDate: null,
          actualEndDate: null,
          startDate: input.startDate ?? input.plannedStartDate ?? null,
          targetCloseDate: input.targetCloseDate ?? input.plannedEndDate ?? null,
          actualCloseDate: null,
          approvalFlow,
          kickoffMeeting: null,
          riskRegister: [],
          completion: null,
          createdByUserId: input.createdByUserId,
          createdByName: input.createdByName,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ projects: [project, ...s.projects] }))
        useLogStore.getState().addLog({
          type: 'project_submitted_for_approval',
          message: `Project "${project.name}" (${project.code}) di-submit untuk approval (${priority.toUpperCase()})`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        useNotificationStore.getState().push({
          category: 'project_approval_needed',
          title: `Project ${project.code} menunggu approval`,
          body: `${project.name} — prioritas ${priority.toUpperCase()}. Buka antrian approval untuk meninjau.`,
          targetUserId: null,
          link: { kind: 'approval-queue' },
        })
        return project
      },

      approveStep: (projectId, stepId, byUserId, byName, payload) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const step = project.approvalFlow.find((s) => s.id === stepId)
        if (!step) return { ok: false, error: 'Step tidak ditemukan' }
        if (step.status !== 'pending') return { ok: false, error: 'Step sudah diproses' }
        // Sequential gating: hanya boleh approve kalau step sebelumnya sudah approved
        const idx = project.approvalFlow.findIndex((s) => s.id === stepId)
        const prevPending = project.approvalFlow.slice(0, idx).find((s) => s.status !== 'approved' && s.status !== 'skipped')
        if (prevPending) return { ok: false, error: `Step sebelumnya belum: ${prevPending.label}` }
        // Validasi requirement
        if (step.requireComment && !(payload.comment?.trim())) return { ok: false, error: 'Komentar wajib diisi' }
        if (step.requireRiskAck && !payload.riskAcknowledged) return { ok: false, error: 'Risk Acknowledgement wajib di-centang' }
        if (project.priority === 'low' && (step.type === 'osm_approval' || step.type === 'dmo_approval' || step.type === 'kadiv_approval') && !payload.acknowledgedChecklist) {
          return { ok: false, error: 'Checklist "Saya telah mengetahui project ini" wajib' }
        }
        const now = nowIso()
        const updatedFlow = project.approvalFlow.map((s) =>
          s.id === stepId
            ? {
                ...s,
                status: 'approved' as const,
                approvedByUserId: byUserId,
                approvedByName: byName,
                approvedAt: now,
                comment: payload.comment ?? null,
                riskAcknowledged: payload.riskAcknowledged ?? false,
                acknowledgedChecklist: payload.acknowledgedChecklist ?? false,
              }
            : s,
        )
        const allApproved = isApprovalFlowComplete(updatedFlow)
        const newStatus: ProjectStatus = allApproved ? 'active' : 'pending_approval'
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, approvalFlow: updatedFlow, status: newStatus, actualStartDate: allApproved && !p.actualStartDate ? now : p.actualStartDate, updatedAt: now }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_approval_step_approved',
          message: `${byName} approve step "${step.label}" project "${project.name}"`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        if (allApproved) {
          useLogStore.getState().addLog({
            type: 'project_activated',
            message: `Project "${project.name}" sekarang AKTIF (semua approval selesai)`,
            taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
          })
          useNotificationStore.getState().push({
            category: 'project_activated',
            title: `Project ${project.code} AKTIF`,
            body: `Semua approval selesai. ${project.name} sekarang muncul di Board Utama.`,
            targetUserId: project.createdByUserId,
            link: { kind: 'project', projectId: project.id },
          })
        } else {
          useNotificationStore.getState().push({
            category: 'project_step_approved',
            title: `Step "${step.label}" disetujui`,
            body: `${project.code} · ${project.name}`,
            targetUserId: project.createdByUserId,
            link: { kind: 'project', projectId: project.id },
          })
        }
        return { ok: true, activated: allApproved }
      },

      rejectStep: (projectId, stepId, byUserId, byName, reason) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const step = project.approvalFlow.find((s) => s.id === stepId)
        if (!step) return { ok: false, error: 'Step tidak ditemukan' }
        if (step.status !== 'pending') return { ok: false, error: 'Step sudah diproses' }
        if (!reason.trim()) return { ok: false, error: 'Alasan reject wajib diisi' }
        const now = nowIso()
        const updatedFlow = project.approvalFlow.map((s) =>
          s.id === stepId
            ? { ...s, status: 'rejected' as const, approvedByUserId: byUserId, approvedByName: byName, approvedAt: now, rejectedReason: reason }
            : s,
        )
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, approvalFlow: updatedFlow, status: 'rejected', updatedAt: now }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_approval_rejected',
          message: `${byName} menolak step "${step.label}" project "${project.name}": ${reason}`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        useNotificationStore.getState().push({
          category: 'project_step_rejected',
          title: `Project ${project.code} DITOLAK`,
          body: `Step "${step.label}": ${reason}`,
          targetUserId: project.createdByUserId,
          link: { kind: 'project', projectId: project.id },
        })
        return { ok: true }
      },

      resubmitForApproval: (projectId, byUserId, byName, revisionNote) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        if (project.status !== 'rejected') return { ok: false, error: 'Hanya project yang ditolak yang dapat di-resubmit' }
        if (!revisionNote.trim()) return { ok: false, error: 'Catatan revisi wajib diisi' }
        const now = nowIso()
        // Reset hanya step rejected + step setelahnya ke pending. Step approved sebelumnya tetap.
        let firstRejectedIdx = -1
        project.approvalFlow.forEach((s, i) => {
          if (firstRejectedIdx === -1 && s.status === 'rejected') firstRejectedIdx = i
        })
        const resetFlow = project.approvalFlow.map((s, i) => {
          if (firstRejectedIdx === -1 || i < firstRejectedIdx) return s
          return {
            ...s,
            status: 'pending' as const,
            approvedByUserId: null,
            approvedByName: null,
            approvedAt: null,
            comment: null,
            riskAcknowledged: false,
            acknowledgedChecklist: false,
            rejectedReason: null,
          }
        })
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, approvalFlow: resetFlow, status: 'pending_approval', updatedAt: now }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_submitted_for_approval',
          message: `${byName} mengajukan ulang project "${project.name}": ${revisionNote}`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        useNotificationStore.getState().push({
          category: 'project_approval_needed',
          title: `Project ${project.code} di-RESUBMIT`,
          body: `Revisi: ${revisionNote}`,
          targetUserId: null,
          link: { kind: 'approval-queue' },
        })
        void byUserId
        return { ok: true }
      },

      setKickoff: (projectId, kickoff) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        if (!kickoff.meetingDate) return { ok: false, error: 'Tanggal kickoff wajib diisi' }
        if (!kickoff.agenda.trim()) return { ok: false, error: 'Agenda wajib diisi' }
        const data: KickoffMeeting = { ...kickoff, recordedAt: nowIso() }
        set((s) => ({
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, kickoffMeeting: data, updatedAt: nowIso() } : p)),
        }))
        useLogStore.getState().addLog({
          type: 'project_kickoff_recorded',
          message: `Kickoff Meeting project "${project.name}" tercatat oleh ${kickoff.recordedByName}`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return { ok: true }
      },

      addRisk: (projectId, input, byName) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        if (!input.description.trim()) return { ok: false, error: 'Deskripsi risiko wajib' }
        const now = nowIso()
        const severity = computeRiskSeverity(input.probability, input.impact)
        const risk: RiskItem = {
          id: uid('risk'),
          code: nextRiskCode(project.riskRegister),
          description: input.description.trim(),
          probability: input.probability,
          impact: input.impact,
          severity,
          mitigationPlan: input.mitigationPlan.trim(),
          riskOwner: input.riskOwner.trim(),
          status: 'open',
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, riskRegister: [...p.riskRegister, risk], updatedAt: now } : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_risk_added',
          message: `${byName} menambah risiko ${risk.code} (${severity.toUpperCase()}) di project "${project.name}"`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return { ok: true, risk }
      },

      updateRisk: (projectId, riskId, patch, byName) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const existing = project.riskRegister.find((r) => r.id === riskId)
        if (!existing) return { ok: false, error: 'Risiko tidak ditemukan' }
        const merged: RiskItem = {
          ...existing,
          ...patch,
          updatedAt: nowIso(),
        }
        // Recompute severity if probability/impact changed
        merged.severity = computeRiskSeverity(merged.probability, merged.impact)
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, riskRegister: p.riskRegister.map((r) => (r.id === riskId ? merged : r)), updatedAt: nowIso() }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_risk_updated',
          message: `${byName} mengubah risiko ${merged.code} di "${project.name}" (status: ${merged.status})`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return { ok: true }
      },

      removeRisk: (projectId, riskId, byName) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const existing = project.riskRegister.find((r) => r.id === riskId)
        if (!existing) return { ok: false, error: 'Risiko tidak ditemukan' }
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, riskRegister: p.riskRegister.filter((r) => r.id !== riskId), updatedAt: nowIso() }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_risk_removed',
          message: `${byName} menghapus risiko ${existing.code} dari "${project.name}"`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        return { ok: true }
      },

      updateProject: (id, patch) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)),
        }))
      },

      updateStageConfig: (id, stage, patch) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  stageConfig: p.stageConfig.map((sc) => (sc.stage === stage ? { ...sc, ...patch } : sc)),
                  updatedAt: nowIso(),
                }
              : p,
          ),
        }))
      },

      setWeights: (id, weights) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  stageConfig: p.stageConfig.map((sc) => ({ ...sc, weight: weights[sc.stage] ?? sc.weight })),
                  updatedAt: nowIso(),
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_weights_changed',
          message: `Bobot stage project diperbarui`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
      },

      advanceStage: (id, byUserId, byName, reason) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const next = nextStage(project.currentStage)
        if (!next) return { ok: false, error: 'Sudah di stage terakhir' }
        const now = nowIso()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  currentStage: next,
                  stageConfig: p.stageConfig.map((sc) => {
                    if (sc.stage === p.currentStage) return { ...sc, status: 'done', completedAt: now }
                    if (sc.stage === next) return { ...sc, status: 'in_progress', enteredAt: sc.enteredAt ?? now }
                    return sc
                  }),
                  stageHistory: [
                    ...p.stageHistory,
                    {
                      id: uid('pst'),
                      fromStage: p.currentStage,
                      toStage: next,
                      direction: 'forward',
                      byUserId,
                      byName,
                      reason,
                      timestamp: now,
                    },
                  ],
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_stage_advanced',
          message: `Project "${project.name}" → ${STAGE_LABELS[next]} (oleh ${byName})`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
        return { ok: true }
      },

      sendBackStage: (id, byUserId, byName, reason) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const prev = prevStage(project.currentStage)
        if (!prev) return { ok: false, error: 'Sudah di stage paling awal' }
        const now = nowIso()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  currentStage: prev,
                  stageConfig: p.stageConfig.map((sc) => {
                    if (sc.stage === p.currentStage)
                      return { ...sc, status: 'not_started', completedAt: null }
                    if (sc.stage === prev) return { ...sc, status: 'in_progress', completedAt: null }
                    return sc
                  }),
                  stageHistory: [
                    ...p.stageHistory,
                    {
                      id: uid('pst'),
                      fromStage: p.currentStage,
                      toStage: prev,
                      direction: 'backward',
                      byUserId,
                      byName,
                      reason,
                      timestamp: now,
                    },
                  ],
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_stage_sentback',
          message: `Project "${project.name}" dikembalikan ke ${STAGE_LABELS[prev]} (oleh ${byName})`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
        return { ok: true }
      },

      closeProject: (id, byUserId, byName) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return
        // Enforce: hanya bisa close kalau sudah di stage 'close'
        if (project.currentStage !== 'close') {
          console.warn(`closeProject ditolak: project ${project.code} belum di stage close (current: ${project.currentStage})`)
          return
        }
        const now = nowIso()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'closed',
                  currentStage: 'close',
                  actualCloseDate: now,
                  stageConfig: p.stageConfig.map((sc) =>
                    sc.stage === 'close' ? { ...sc, status: 'done', completedAt: now } : sc,
                  ),
                  stageHistory: [
                    ...p.stageHistory,
                    {
                      id: uid('pst'),
                      fromStage: p.currentStage,
                      toStage: 'close',
                      direction: 'forward',
                      byUserId,
                      byName,
                      reason: 'Project ditutup',
                      timestamp: now,
                    },
                  ],
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_closed',
          message: `Project "${project.name}" ditutup oleh ${byName}`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
      },

      closeProjectWithCompletion: (id, completion) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        if (project.currentStage !== 'close') {
          return { ok: false, error: 'Project harus berada di stage Close dulu sebelum tutup formal' }
        }
        if (!completion.deliverableSummary.trim()) {
          return { ok: false, error: 'Ringkasan Deliverable wajib diisi' }
        }
        if (!completion.evidence || completion.evidence.length === 0) {
          return { ok: false, error: 'Minimal 1 evidence (BAST atau dokumen serah terima) wajib diupload' }
        }
        const now = nowIso()
        const completionData: ProjectCompletion = { ...completion, closedAt: now }
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'closed',
                  completion: completionData,
                  actualCloseDate: completion.completionDate,
                  actualEndDate: completion.completionDate,
                  stageConfig: p.stageConfig.map((sc) =>
                    sc.stage === 'close' ? { ...sc, status: 'done', completedAt: now } : sc,
                  ),
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_completion_recorded',
          message: `Form penyelesaian project "${project.name}" tercatat oleh ${completion.closedByName} — outcome: ${completion.outcome}`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        useLogStore.getState().addLog({
          type: 'project_closed',
          message: `Project "${project.name}" ditutup oleh ${completion.closedByName}`,
          taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null,
        })
        useNotificationStore.getState().push({
          category: 'project_activated',
          title: `Project ${project.code} DITUTUP`,
          body: `Outcome: ${completion.outcome}. Lihat form penyelesaian di tab "Penyelesaian".`,
          targetUserId: null,
          link: { kind: 'project', projectId: project.id },
        })
        return { ok: true }
      },

      setStatus: (id, status) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, status, updatedAt: nowIso() } : p)),
        }))
      },

      deleteProject: (id) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
      },
      clearAll: () => set({ projects: [] }),
      resetToSeed: () => set({ projects: SEED_PROJECTS }),
    }),
    {
      name: 'flowdesk:projects',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        let dirty = false
        const projects = state.projects.map((p) => {
          const next = { ...p } as Project
          if (next.kickoffMeeting === undefined) { next.kickoffMeeting = null; dirty = true }
          if (next.riskRegister === undefined) { next.riskRegister = []; dirty = true }
          if (next.approvalFlow === undefined) { next.approvalFlow = []; dirty = true }
          if (next.completion === undefined) { next.completion = null; dirty = true }
          return next
        })
        if (dirty) (state as { projects: Project[] }).projects = projects
      },
    },
  ),
)
