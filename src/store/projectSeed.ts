import type { Project, ProjectStageConfig } from '../types'
import { uid } from '../utils/helpers'
import { STAGE_DEFAULT_WEIGHTS, STAGE_KEYS } from '../utils/colors'

function dMinus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function dPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function stageConfigWith(
  currentStage: typeof STAGE_KEYS[number],
  weights: Record<string, number> = STAGE_DEFAULT_WEIGHTS,
  daysSince = 5,
): ProjectStageConfig[] {
  const idx = STAGE_KEYS.indexOf(currentStage)
  return STAGE_KEYS.map((stage, i): ProjectStageConfig => ({
    stage,
    weight: weights[stage] ?? 0,
    ownerTeamIds: [],
    status: i < idx ? 'done' : i === idx ? 'in_progress' : 'not_started',
    progressOverride: i < idx ? 100 : null,
    enteredAt: i <= idx ? dMinus(daysSince + (idx - i) * 7) : null,
    completedAt: i < idx ? dMinus(daysSince + (idx - i - 1) * 7) : null,
  }))
}

const PRO_SERVICE_WEIGHTS = {
  lead_to_active: 0,
  plan_to_build: 20,
  build_to_operate: 35,
  operate_to_assure: 40,
  close: 5,
}

const STANDARD = STAGE_DEFAULT_WEIGHTS

export const SEED_PROJECTS: Project[] = [
  {
    id: 'prj_radio_trunking_phe',
    code: 'PGN-RT-PHE-001',
    name: 'Pengadaan & Maintenance Radio Trunking PHE',
    description:
      'Professional service untuk pengadaan, instalasi, dan maintenance sistem radio trunking di wilayah operasional PHE.',
    customer: 'PHE',
    priority: 'high',
    status: 'active',
    currentStage: 'build_to_operate',
    stageConfig: stageConfigWith('build_to_operate', PRO_SERVICE_WEIGHTS, 10),
    stageHistory: [
      {
        id: uid('pst'),
        fromStage: null,
        toStage: 'plan_to_build',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Project dibuat',
        timestamp: dMinus(45),
      },
      {
        id: uid('pst'),
        fromStage: 'plan_to_build',
        toStage: 'build_to_operate',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Plan disetujui customer, lanjut eksekusi',
        timestamp: dMinus(10),
      },
    ],
    tags: ['radio-trunking', 'phe', 'pro-service'],
    startDate: dMinus(45),
    targetCloseDate: dPlus(60),
    actualCloseDate: null,
    createdByUserId: 'seed',
    createdByName: 'Seed Data',
    createdAt: dMinus(45),
    updatedAt: dMinus(2),
  },
  {
    id: 'prj_phe_fiber',
    code: 'PGN-FO-PHE-002',
    name: 'PHE Fiber Backbone Sulawesi',
    description: 'Pembangunan backbone fiber optic untuk koneksi office PHE di Sulawesi.',
    customer: 'PHE',
    priority: 'high',
    status: 'active',
    currentStage: 'plan_to_build',
    stageConfig: stageConfigWith('plan_to_build', STANDARD, 5),
    stageHistory: [
      {
        id: uid('pst'),
        fromStage: null,
        toStage: 'lead_to_active',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Project dibuat',
        timestamp: dMinus(20),
      },
      {
        id: uid('pst'),
        fromStage: 'lead_to_active',
        toStage: 'plan_to_build',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Deal closed, masuk fase planning',
        timestamp: dMinus(5),
      },
    ],
    tags: ['fiber', 'phe', 'backbone'],
    startDate: dMinus(20),
    targetCloseDate: dPlus(120),
    actualCloseDate: null,
    createdByUserId: 'seed',
    createdByName: 'Seed Data',
    createdAt: dMinus(20),
    updatedAt: dMinus(1),
  },
  {
    id: 'prj_indomaret_mpls',
    code: 'PGN-MPLS-IDM-003',
    name: 'Indomaret MPLS Care',
    description: 'Operasi & SLA care MPLS jaringan Indomaret nasional. Maintenance berkelanjutan.',
    customer: 'Indomaret',
    priority: 'medium',
    status: 'active',
    currentStage: 'operate_to_assure',
    stageConfig: stageConfigWith('operate_to_assure', PRO_SERVICE_WEIGHTS, 15),
    stageHistory: [
      {
        id: uid('pst'),
        fromStage: null,
        toStage: 'plan_to_build',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Project dibuat',
        timestamp: dMinus(120),
      },
      {
        id: uid('pst'),
        fromStage: 'build_to_operate',
        toStage: 'operate_to_assure',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Go-live, masuk fase operate',
        timestamp: dMinus(15),
      },
    ],
    tags: ['mpls', 'indomaret', 'maintenance'],
    startDate: dMinus(120),
    targetCloseDate: null,
    actualCloseDate: null,
    createdByUserId: 'seed',
    createdByName: 'Seed Data',
    createdAt: dMinus(120),
    updatedAt: dMinus(2),
  },
  {
    id: 'prj_internal_pgncom',
    code: 'PGN-INT-001',
    name: 'Project Internal PGNCOM',
    description:
      'Project container untuk task internal (IT, infra, ops) yang tidak terikat ke customer eksternal.',
    customer: 'Internal',
    priority: 'medium',
    status: 'active',
    currentStage: 'build_to_operate',
    stageConfig: stageConfigWith('build_to_operate', STANDARD, 30),
    stageHistory: [
      {
        id: uid('pst'),
        fromStage: null,
        toStage: 'build_to_operate',
        direction: 'forward',
        byUserId: 'seed',
        byName: 'Seed Data',
        reason: 'Container internal tasks',
        timestamp: dMinus(60),
      },
    ],
    tags: ['internal', 'ops'],
    startDate: dMinus(60),
    targetCloseDate: null,
    actualCloseDate: null,
    createdByUserId: 'seed',
    createdByName: 'Seed Data',
    createdAt: dMinus(60),
    updatedAt: dMinus(1),
  },
]
