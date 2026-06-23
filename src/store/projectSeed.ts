import type { ApprovalStep, BusinessStage, Project, ProjectStageConfig, RiskItem } from '../types'
import { STAGE_DEFAULT_WEIGHTS, STAGE_KEYS } from '../utils/colors'

/**
 * Seed projects realistik untuk demo. Mencakup berbagai kombinasi priority × status:
 *  - LOW   active        : sudah lewat OSM/DMO checklist
 *  - MEDIUM pending_OSM   : menunggu OSM approval
 *  - HIGH  pending_kickoff: butuh Kickoff Meeting sebelum OSM
 *  - CRITICAL active      : Kickoff + Risk Assessment + OSM/DMO ack semua selesai
 *  - MEDIUM rejected      : ditolak DMO, siap di-resubmit
 *
 * Stage owner default: ITD untuk Build/Operate, BIZ untuk Lead/Plan, QAT/NET pendukung.
 * Tidak ada nama divisi hardcoded di approval flow — pakai generic role keys.
 */

const TODAY = new Date()
const isoDaysAgo = (n: number) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
const isoDaysAhead = (n: number) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

const STAGE_OWNERS_DEFAULT: Partial<Record<BusinessStage, string[]>> = {
  lead_to_active: ['team_biz'],
  plan_to_build: ['team_biz', 'team_itd'],
  build_to_operate: ['team_itd', 'team_net'],
  operate_to_assure: ['team_net', 'team_qat'],
  close: ['team_biz'],
}

function buildStageConfig(
  startStage: BusinessStage,
  currentStage: BusinessStage,
  weights: Record<BusinessStage, number> = STAGE_DEFAULT_WEIGHTS,
): ProjectStageConfig[] {
  const startIdx = STAGE_KEYS.indexOf(startStage)
  const currIdx = STAGE_KEYS.indexOf(currentStage)
  return STAGE_KEYS.map((stage) => {
    const idx = STAGE_KEYS.indexOf(stage)
    let status: ProjectStageConfig['status'] = 'not_started'
    let enteredAt: string | null = null
    let completedAt: string | null = null
    if (idx < startIdx) {
      status = 'skipped'
      enteredAt = isoDaysAgo(60)
      completedAt = isoDaysAgo(60)
    } else if (idx < currIdx) {
      status = 'done'
      enteredAt = isoDaysAgo(40 - idx * 6)
      completedAt = isoDaysAgo(30 - idx * 6)
    } else if (idx === currIdx) {
      status = 'in_progress'
      enteredAt = isoDaysAgo(14)
    }
    return {
      stage,
      weight: weights[stage] ?? 0,
      ownerTeamIds: STAGE_OWNERS_DEFAULT[stage] ?? [],
      status,
      progressOverride: null,
      enteredAt,
      completedAt,
    }
  })
}

interface ApprovalStepSeed {
  type: ApprovalStep['type']
  label: string
  requiredRole: ApprovalStep['requiredRole']
  requireComment: boolean
  requireRiskAck: boolean
  status: ApprovalStep['status']
  approverName?: string
  comment?: string
  riskAck?: boolean
  checklist?: boolean
  rejectedReason?: string
  approvedDaysAgo?: number
}

function buildApprovalFromSeeds(seeds: ApprovalStepSeed[]): ApprovalStep[] {
  return seeds.map((s, i) => ({
    id: `seed_step_${i + 1}_${Date.now()}`,
    order: i + 1,
    type: s.type,
    label: s.label,
    status: s.status,
    requiredRole: s.requiredRole,
    requireComment: s.requireComment,
    requireRiskAck: s.requireRiskAck,
    approvedByUserId: s.approverName ? 'seed' : null,
    approvedByName: s.approverName ?? null,
    approvedAt: s.approvedDaysAgo != null ? isoDaysAgo(s.approvedDaysAgo) : null,
    comment: s.comment ?? null,
    riskAcknowledged: s.riskAck ?? false,
    acknowledgedChecklist: s.checklist ?? false,
    rejectedReason: s.rejectedReason ?? null,
  }))
}

const RISK_SAMPLE: RiskItem[] = [
  {
    id: 'seed_risk_1',
    code: 'R001',
    description: 'Keterlambatan supply radio module dari vendor utama (lead time 12 minggu)',
    probability: 'high',
    impact: 'high',
    severity: 'extreme',
    mitigationPlan: 'Identifikasi vendor alternatif + early PO 3 bulan sebelum kebutuhan. Buffer 4 minggu di timeline.',
    riskOwner: 'Procurement Lead',
    status: 'mitigated',
    createdAt: isoDaysAgo(30),
    updatedAt: isoDaysAgo(10),
  },
  {
    id: 'seed_risk_2',
    code: 'R002',
    description: 'Cuaca ekstrim di lokasi PHE Site-12 menghambat instalasi tower',
    probability: 'medium',
    impact: 'high',
    severity: 'high',
    mitigationPlan: 'Reschedule fase instalasi di luar musim hujan + standby weather monitoring.',
    riskOwner: 'Site Manager',
    status: 'open',
    createdAt: isoDaysAgo(28),
    updatedAt: isoDaysAgo(28),
  },
  {
    id: 'seed_risk_3',
    code: 'R003',
    description: 'Perubahan regulasi frekuensi dari Kominfo mid-project',
    probability: 'low',
    impact: 'high',
    severity: 'medium',
    mitigationPlan: 'Pre-clearance dengan regulator + insert clause di kontrak.',
    riskOwner: 'Compliance Officer',
    status: 'accepted',
    createdAt: isoDaysAgo(25),
    updatedAt: isoDaysAgo(5),
  },
]

export const SEED_PROJECTS: Project[] = [
  // ============ 1) MEDIUM, pending OSM approval ============
  {
    id: 'seed_prj_1',
    code: 'PGN-NET-INDM-001',
    name: 'Upgrade Backbone WAN Indomaret Phase-2',
    description: 'Migrasi link 50 toko Indomaret cluster Jabodetabek dari MPLS legacy ke SD-WAN dengan dual provider failover.',
    customer: 'Indomaret',
    priority: 'medium',
    status: 'pending_approval',
    currentStage: 'lead_to_active',
    stageConfig: buildStageConfig('lead_to_active', 'lead_to_active'),
    stageHistory: [],
    tags: ['indomaret', 'sdwan', 'wan'],
    plannedStartDate: isoDaysAhead(7),
    plannedEndDate: isoDaysAhead(90),
    actualStartDate: null,
    actualEndDate: null,
    startDate: isoDaysAhead(7),
    targetCloseDate: isoDaysAhead(90),
    actualCloseDate: null,
    approvalFlow: buildApprovalFromSeeds([
      { type: 'creator_submit', label: 'Submit oleh Creator', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Andi Wijaya', approvedDaysAgo: 2 },
      { type: 'kadiv_approval', label: 'Persetujuan Kadiv', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: false, status: 'pending' },
      { type: 'osm_approval', label: 'OSM Approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: false, status: 'pending' },
      { type: 'dmo_approval', label: 'DMO Approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: false, status: 'pending' },
    ]),
    kickoffMeeting: null,
    riskRegister: [],
    completion: null,
    createdByUserId: 'seed',
    createdByName: 'Andi Wijaya',
    createdAt: isoDaysAgo(2),
    updatedAt: isoDaysAgo(2),
  },

  // ============ 2) HIGH, pending Kickoff ============
  {
    id: 'seed_prj_2',
    code: 'PGN-RT-PHE-001',
    name: 'Pengadaan & Instalasi Radio Trunking PHE',
    description: 'Deploy 8 tower radio trunking di area kerja PHE WMO untuk mendukung komunikasi field crew offshore.',
    customer: 'PHE',
    priority: 'high',
    status: 'pending_approval',
    currentStage: 'lead_to_active',
    stageConfig: buildStageConfig('lead_to_active', 'lead_to_active', {
      lead_to_active: 0,
      plan_to_build: 20,
      build_to_operate: 35,
      operate_to_assure: 40,
      close: 5,
    }),
    stageHistory: [],
    tags: ['phe', 'radio', 'pro-service'],
    plannedStartDate: isoDaysAhead(14),
    plannedEndDate: isoDaysAhead(180),
    actualStartDate: null,
    actualEndDate: null,
    startDate: isoDaysAhead(14),
    targetCloseDate: isoDaysAhead(180),
    actualCloseDate: null,
    approvalFlow: buildApprovalFromSeeds([
      { type: 'creator_submit', label: 'Submit oleh Creator', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Budi Hartono', approvedDaysAgo: 3 },
      { type: 'kadiv_approval', label: 'Persetujuan Kadiv', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: false, status: 'approved', approverName: 'Ahmad Subari (Kadiv ITD)', approvedDaysAgo: 2, comment: 'Scope teknis sudah sesuai kapabilitas tim. Lanjut ke Kickoff.' },
      { type: 'kickoff_meeting', label: 'Kickoff Meeting', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'pending' },
      { type: 'osm_approval', label: 'OSM Approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: false, status: 'pending' },
      { type: 'dmo_approval', label: 'DMO Approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: false, status: 'pending' },
    ]),
    kickoffMeeting: null,
    riskRegister: [],
    completion: null,
    createdByUserId: 'seed',
    createdByName: 'Budi Hartono',
    createdAt: isoDaysAgo(3),
    updatedAt: isoDaysAgo(3),
  },

  // ============ 3) CRITICAL, AKTIF (sudah lewat semua step) ============
  {
    id: 'seed_prj_3',
    code: 'PGN-CORE-PT-001',
    name: 'Pengadaan Core Banking Pertamina Trading',
    description: 'Implementasi core banking + integrasi treasury management untuk anak perusahaan trading. Risiko regulasi & data sensitif.',
    customer: 'Pertamina Trading',
    priority: 'critical',
    status: 'active',
    currentStage: 'build_to_operate',
    stageConfig: buildStageConfig('lead_to_active', 'build_to_operate', {
      lead_to_active: 5,
      plan_to_build: 25,
      build_to_operate: 35,
      operate_to_assure: 30,
      close: 5,
    }),
    stageHistory: [
      {
        id: 'seed_st_3_1',
        fromStage: null,
        toStage: 'lead_to_active',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Sari Kusuma',
        reason: 'Project dibuat',
        timestamp: isoDaysAgo(60),
      },
      {
        id: 'seed_st_3_2',
        fromStage: 'lead_to_active',
        toStage: 'plan_to_build',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Sari Kusuma',
        reason: 'Closing fase lead, masuk perencanaan teknis',
        timestamp: isoDaysAgo(35),
      },
      {
        id: 'seed_st_3_3',
        fromStage: 'plan_to_build',
        toStage: 'build_to_operate',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Andi Wijaya',
        reason: 'HLD/LLD approved, mulai implementasi',
        timestamp: isoDaysAgo(14),
      },
    ],
    tags: ['core-banking', 'critical', 'compliance'],
    plannedStartDate: isoDaysAgo(60),
    plannedEndDate: isoDaysAhead(120),
    actualStartDate: isoDaysAgo(55),
    actualEndDate: null,
    startDate: isoDaysAgo(60),
    targetCloseDate: isoDaysAhead(120),
    actualCloseDate: null,
    approvalFlow: buildApprovalFromSeeds([
      { type: 'creator_submit', label: 'Submit oleh Creator', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Sari Kusuma', approvedDaysAgo: 65 },
      { type: 'kadiv_approval', label: 'Persetujuan Kadiv', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: true, status: 'approved', approverName: 'Ahmad Subari (Kadiv ITD)', approvedDaysAgo: 64, comment: 'Critical project, resource ITD sudah dialokasikan. Risk Register harus jadi prioritas review.', riskAck: true },
      { type: 'kickoff_meeting', label: 'Kickoff Meeting', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Sari Kusuma', approvedDaysAgo: 62 },
      { type: 'risk_assessment', label: 'Risk Assessment', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Sari Kusuma', approvedDaysAgo: 60 },
      { type: 'osm_approval', label: 'OSM Approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: true, status: 'approved', approverName: 'Hendra Pratama (OSM)', approvedDaysAgo: 58, comment: 'Approved dengan catatan: monitoring SLA harus integrate dengan Grafana standar.', riskAck: true },
      { type: 'dmo_approval', label: 'DMO Approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: true, status: 'approved', approverName: 'Lisa Maharani (DMO)', approvedDaysAgo: 57, comment: 'Approved. Pastikan Risk Register di-review monthly.', riskAck: true },
    ]),
    kickoffMeeting: {
      meetingDate: isoDaysAgo(62),
      location: 'Ruang Rapat Sundari 3F + Zoom',
      attendees: ['Sari Kusuma (PM)', 'Andi Wijaya (Tech Lead)', 'Hendra Pratama (OSM)', 'Lisa Maharani (DMO)', 'Vendor PIC'],
      agenda: '1. Scope freeze & milestone alignment\n2. Resource allocation (DevOps + Backend)\n3. Compliance review checklist\n4. Communication cadence',
      decisions: 'Scope freeze: Phase 1 core banking + treasury. Phase 2 (FX) di-defer ke Q4.\nResource: 6 backend + 2 DevOps fulltime selama 4 bulan.',
      actionItems: 'Andi - finalize HLD minggu depan\nVendor PIC - submit POC roadmap 7 hari\nLisa - draft compliance checklist',
      notes: 'Stakeholder OSM minta weekly steering committee setiap Senin.',
      recordedByUserId: 'seed',
      recordedByName: 'Sari Kusuma',
      recordedAt: isoDaysAgo(62),
    },
    riskRegister: RISK_SAMPLE,
    completion: null,
    createdByUserId: 'seed',
    createdByName: 'Sari Kusuma',
    createdAt: isoDaysAgo(65),
    updatedAt: isoDaysAgo(5),
  },

  // ============ 4) LOW, AKTIF (LOW checklist sudah lewat) ============
  {
    id: 'seed_prj_4',
    code: 'PGN-MAINT-INT-001',
    name: 'Maintenance Server Internal Q2',
    description: 'Patch security + upgrade firmware server rack internal data center, scheduled quarterly maintenance.',
    customer: 'Internal',
    priority: 'low',
    status: 'active',
    currentStage: 'operate_to_assure',
    stageConfig: buildStageConfig('plan_to_build', 'operate_to_assure', {
      lead_to_active: 0,
      plan_to_build: 0,
      build_to_operate: 0,
      operate_to_assure: 95,
      close: 5,
    }),
    stageHistory: [
      {
        id: 'seed_st_4_1',
        fromStage: null,
        toStage: 'operate_to_assure',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Rizki Pranata',
        reason: 'Maintenance project — start langsung di operate',
        timestamp: isoDaysAgo(20),
      },
    ],
    tags: ['maintenance', 'internal', 'quarterly'],
    plannedStartDate: isoDaysAgo(20),
    plannedEndDate: isoDaysAhead(40),
    actualStartDate: isoDaysAgo(20),
    actualEndDate: null,
    startDate: isoDaysAgo(20),
    targetCloseDate: isoDaysAhead(40),
    actualCloseDate: null,
    approvalFlow: buildApprovalFromSeeds([
      { type: 'creator_submit', label: 'Submit oleh Creator', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Rizki Pranata', approvedDaysAgo: 22 },
      { type: 'kadiv_approval', label: 'Persetujuan Kadiv', requiredRole: 'kadiv_approver', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Ahmad Subari (Kadiv NET)', approvedDaysAgo: 22, checklist: true },
      { type: 'osm_approval', label: 'OSM Approval', requiredRole: 'osm_approver', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Hendra Pratama (OSM)', approvedDaysAgo: 21, checklist: true },
      { type: 'dmo_approval', label: 'DMO Approval', requiredRole: 'dmo_approver', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Lisa Maharani (DMO)', approvedDaysAgo: 20, checklist: true },
    ]),
    kickoffMeeting: null,
    riskRegister: [],
    completion: null,
    createdByUserId: 'seed',
    createdByName: 'Rizki Pranata',
    createdAt: isoDaysAgo(22),
    updatedAt: isoDaysAgo(3),
  },

  // ============ 5) MEDIUM, REJECTED (ditolak DMO, demo resubmit) ============
  {
    id: 'seed_prj_5',
    code: 'PGN-VPN-PHE-002',
    name: 'VPN Site-to-Site PHE Cabang Sumatera',
    description: 'Pembangunan VPN site-to-site untuk 3 cabang PHE Sumatera ke datacenter Jakarta.',
    customer: 'PHE',
    priority: 'medium',
    status: 'rejected',
    currentStage: 'lead_to_active',
    stageConfig: buildStageConfig('lead_to_active', 'lead_to_active'),
    stageHistory: [],
    tags: ['phe', 'vpn', 'sumatera'],
    plannedStartDate: isoDaysAhead(5),
    plannedEndDate: isoDaysAhead(60),
    actualStartDate: null,
    actualEndDate: null,
    startDate: isoDaysAhead(5),
    targetCloseDate: isoDaysAhead(60),
    actualCloseDate: null,
    approvalFlow: buildApprovalFromSeeds([
      { type: 'creator_submit', label: 'Submit oleh Creator', requiredRole: 'project_owner', requireComment: false, requireRiskAck: false, status: 'approved', approverName: 'Andi Wijaya', approvedDaysAgo: 8 },
      { type: 'kadiv_approval', label: 'Persetujuan Kadiv', requiredRole: 'kadiv_approver', requireComment: true, requireRiskAck: false, status: 'approved', approverName: 'Ahmad Subari (Kadiv NET)', approvedDaysAgo: 8, comment: 'Konfigurasi network setup standard, lanjut.' },
      { type: 'osm_approval', label: 'OSM Approval', requiredRole: 'osm_approver', requireComment: true, requireRiskAck: false, status: 'approved', approverName: 'Hendra Pratama (OSM)', approvedDaysAgo: 7, comment: 'Approved dari sisi operasional.' },
      { type: 'dmo_approval', label: 'DMO Approval', requiredRole: 'dmo_approver', requireComment: true, requireRiskAck: false, status: 'rejected', approverName: 'Lisa Maharani (DMO)', approvedDaysAgo: 5, rejectedReason: 'Budget belum di-approve di RKAP 2026. Mohon resubmit setelah persetujuan budget.' },
    ]),
    kickoffMeeting: null,
    riskRegister: [],
    completion: null,
    createdByUserId: 'seed',
    createdByName: 'Andi Wijaya',
    createdAt: isoDaysAgo(8),
    updatedAt: isoDaysAgo(5),
  },
]
