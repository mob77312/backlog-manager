import { useMemo } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useRoleStore } from '../store/useRoleStore'
import type { MasterRole, PermissionAction, PermissionContext, PermissionResult, RolePermissions, User } from '../types'

function denied(reason: string): PermissionResult {
  return { allowed: false, reason }
}

function allowed(): PermissionResult {
  return { allowed: true }
}

function evaluate(
  user: User | null,
  role: MasterRole | null,
  action: PermissionAction,
  ctx: PermissionContext | undefined,
  getRole: (id: string) => MasterRole | undefined,
): PermissionResult {
  if (!user) return denied('Belum login')
  if (!user.active) return denied('Akun nonaktif')
  if (!role) return denied('Role tidak ditemukan')

  const p = role.permissions
  const ownDivisionOnly = role.scopeRestriction === 'own_division'
  const ownDepartmentOnly = role.scopeRestriction === 'own_department'
  const inOwnDivision = ctx?.teamId && user.teamId && ctx.teamId === user.teamId
  const inOwnDepartment =
    inOwnDivision && ctx?.departmentId && user.departmentId && ctx.departmentId === user.departmentId

  const scopeCheck = (verb: string): PermissionResult | null => {
    if (ownDepartmentOnly) {
      if (!user.teamId) return denied('Anda tidak terikat ke divisi')
      if (ctx?.teamId && ctx.teamId !== user.teamId) return denied(`Hanya bisa ${verb} tugas divisi Anda`)
      // Hanya cek department match kalau ctx eksplisit menyebut departmentId
      // (kalau ctx.departmentId=null, artinya task tidak punya dept — OK utk own_department user yg punya dept)
      if (ctx?.departmentId && user.departmentId && ctx.departmentId !== user.departmentId) {
        return denied(`Hanya bisa ${verb} tugas team Anda`)
      }
      // Kalau ctx menyebut departmentId tapi user belum punya departmentId → masih bisa di divisi sendiri
      return null
    }
    if (ownDivisionOnly) {
      if (!user.teamId) return denied('Anda tidak terikat ke divisi')
      if (ctx?.teamId && ctx.teamId !== user.teamId) return denied(`Hanya bisa ${verb} tugas divisi Anda`)
      return null
    }
    return null
  }

  switch (action) {
    case 'task.create': {
      if (!p.canCreateTask) return denied(`${role.name} tidak dapat membuat tugas`)
      // Create tanpa ctx (klik "+" di Board Divisi):
      //   - scope=any → allow
      //   - scope=own_division / own_department → cukup user.teamId (departmentId opsional di Task)
      // Create dengan ctx → strict scope match
      if (!ctx) {
        if ((ownDivisionOnly || ownDepartmentOnly) && !user.teamId) {
          return denied('Akun Anda belum di-assign ke divisi. Minta admin assign divisi dulu.')
        }
        return allowed()
      }
      const s = scopeCheck('membuat')
      return s ?? allowed()
    }

    case 'task.edit': {
      if (!p.canEditTask) return denied(`${role.name} tidak dapat mengedit tugas`)
      const s = scopeCheck('mengedit')
      return s ?? allowed()
    }

    case 'task.move': {
      if (!p.canMoveTask) return denied(`${role.name} tidak dapat memindah tugas`)
      const s = scopeCheck('memindah')
      return s ?? allowed()
    }

    case 'task.delete': {
      if (!p.canDeleteTask) return denied(`${role.name} tidak dapat menghapus tugas`)
      const s = scopeCheck('menghapus')
      return s ?? allowed()
    }

    case 'task.requestDelete': {
      // Anyone who can edit a task within scope can request its deletion (subject to Kadiv approval).
      // Users who can delete directly don't need this — they should use 'task.delete' instead.
      if (!p.canEditTask) return denied(`${role.name} tidak dapat mengusulkan penghapusan`)
      const s = scopeCheck('mengusulkan penghapusan')
      return s ?? allowed()
    }

    case 'task.handoff': {
      if (!p.canHandoffTask) return denied(`${role.name} tidak dapat menyerahkan tugas`)
      const s = scopeCheck('menyerahkan')
      return s ?? allowed()
    }

    case 'task.comment':
      if (!p.canCommentTask) return denied(`${role.name} tidak dapat berkomentar`)
      return allowed()

    case 'team.create':
      if (!p.canCreateDivision) return denied(`${role.name} tidak dapat menambah divisi`)
      return allowed()

    case 'team.edit':
      if (!p.canEditDivision) return denied(`${role.name} tidak dapat mengedit divisi`)
      if ((ownDivisionOnly || ownDepartmentOnly) && ctx?.teamId && !inOwnDivision)
        return denied('Hanya bisa mengedit divisi Anda')
      return allowed()

    case 'team.delete':
      if (!p.canDeleteDivision) return denied(`${role.name} tidak dapat menghapus divisi`)
      return allowed()

    case 'team.manageTeams':
      if (!p.canManageDivisionTeams) return denied(`${role.name} tidak dapat mengelola team di divisi`)
      return allowed()

    case 'team.editHandoffRequirements':
      if (!p.canEditHandoffRequirements) return denied(`${role.name} tidak dapat mengubah syarat handoff`)
      if ((ownDivisionOnly || ownDepartmentOnly) && ctx?.teamId && !inOwnDivision)
        return denied('Hanya bisa mengubah syarat handoff divisi Anda')
      return allowed()

    case 'user.manage':
      if (!p.canManageUsers) return denied(`${role.name} tidak dapat membuka manajemen user`)
      return allowed()

    case 'user.invite':
      if (!p.canInviteUsers) return denied(`${role.name} tidak dapat mengundang user`)
      return allowed()

    case 'user.edit':
      if (!p.canManageUsers) return denied(`${role.name} tidak dapat mengedit user`)
      if (ownDepartmentOnly && ctx?.teamId) {
        if (!inOwnDivision) return denied('Hanya bisa mengedit user divisi Anda')
        if (ctx?.departmentId !== undefined && !inOwnDepartment) return denied('Hanya bisa mengedit user team Anda')
      } else if (ownDivisionOnly && ctx?.teamId && !inOwnDivision) {
        return denied('Hanya bisa mengedit user divisi Anda')
      }
      return allowed()

    case 'user.delete':
      if (!p.canDeleteUsers) return denied(`${role.name} tidak dapat menghapus user`)
      return allowed()

    case 'user.changeRole': {
      if (!p.canChangeUserRoles) return denied(`${role.name} tidak dapat mengubah role`)
      // Cannot assign a role with rank > own (prevent privilege escalation)
      if (ctx?.targetRole) {
        const target = getRole(ctx.targetRole)
        if (target && target.rank > role.rank) {
          return denied(`Tidak bisa menetapkan role dengan rank lebih tinggi (${target.name})`)
        }
      }
      if (ownDepartmentOnly && ctx?.teamId) {
        if (!inOwnDivision) return denied('Hanya bisa mengubah role di divisi Anda')
        if (ctx?.departmentId !== undefined && !inOwnDepartment) return denied('Hanya bisa mengubah role di team Anda')
      } else if (ownDivisionOnly && ctx?.teamId && !inOwnDivision) {
        return denied('Hanya bisa mengubah role di divisi Anda')
      }
      return allowed()
    }

    case 'role.manage':
      if (!p.canManageRoles) return denied(`${role.name} tidak dapat mengelola master role`)
      return allowed()

    case 'workflow.configure':
      if (!p.canConfigureWorkflow) return denied(`${role.name} tidak dapat mengkonfigurasi workflow`)
      return allowed()

    case 'project.create':
      if (!p.canCreateProject) return denied(`${role.name} tidak dapat membuat project`)
      return allowed()

    case 'project.edit':
      if (!p.canEditProject) return denied(`${role.name} tidak dapat mengedit project`)
      return allowed()

    case 'project.delete':
      if (!p.canDeleteProject) return denied(`${role.name} tidak dapat menghapus project`)
      return allowed()

    case 'project.advanceStage': {
      if (!p.canAdvanceProjectStage) return denied(`${role.name} tidak dapat memindah stage project`)
      // Check ownership: kalau scope dibatasi, user harus jadi owner stage
      if (ownDivisionOnly || ownDepartmentOnly) {
        if (!user.teamId) return denied('Anda tidak terikat ke divisi')
        const owners = ctx?.stageOwnerTeamIds ?? []
        if (owners.length > 0 && !owners.includes(user.teamId))
          return denied('Hanya divisi pemilik stage ini yang boleh advance')
      }
      return allowed()
    }

    case 'project.editWeights': {
      if (!p.canEditProjectWeights) return denied(`${role.name} tidak dapat mengubah bobot stage`)
      if (ownDivisionOnly || ownDepartmentOnly) {
        if (!user.teamId) return denied('Anda tidak terikat ke divisi')
        const owners = ctx?.stageOwnerTeamIds ?? []
        if (owners.length > 0 && !owners.includes(user.teamId))
          return denied('Hanya divisi pemilik stage yang boleh ubah bobot')
      }
      return allowed()
    }

    case 'project.close':
      if (!p.canCloseProject) return denied(`${role.name} tidak dapat menutup project`)
      return allowed()

    case 'segment.request':
      if (!p.canRequestSegmentChange) return denied(`${role.name} tidak dapat mengajukan perubahan kolom`)
      if ((ownDivisionOnly || ownDepartmentOnly) && ctx?.teamId && !inOwnDivision)
        return denied('Hanya bisa mengajukan untuk divisi Anda')
      return allowed()

    case 'segment.approve':
      if (!p.canApproveSegmentChange) return denied(`${role.name} tidak dapat menyetujui perubahan kolom`)
      return allowed()

    case 'project.approveAsOSM':
      if (!p.canApproveAsOSM) return denied(`${role.name} bukan OSM Approver`)
      return allowed()

    case 'project.approveAsDMO':
      if (!p.canApproveAsDMO) return denied(`${role.name} bukan DMO Approver`)
      return allowed()

    case 'project.approveAsKadiv': {
      if (!p.canApproveAsKadiv) return denied(`${role.name} bukan Kadiv Approver`)
      // Kadiv selalu scoped — harus divisi yang sama dengan creator project.
      if ((ownDivisionOnly || ownDepartmentOnly) && ctx?.teamId && !inOwnDivision)
        return denied('Hanya bisa approve project di divisi Anda sendiri')
      return allowed()
    }

    default:
      return denied('Tidak diizinkan')
  }
}

export function usePermissions() {
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const roles = useRoleStore((s) => s.roles)

  const user = useMemo(() => (session ? users.find((u) => u.id === session.userId) ?? null : null), [session, users])
  const role = useMemo<MasterRole | null>(
    () => (user ? roles.find((r) => r.id === user.role) ?? null : null),
    [user, roles],
  )

  return useMemo(() => {
    const getRole = (id: string) => roles.find((r) => r.id === id)
    return {
      user,
      role,
      roleLabel: role?.name ?? null,
      can: (action: PermissionAction, ctx?: PermissionContext) => evaluate(user, role, action, ctx, getRole),
      hasPermission: (key: keyof RolePermissions) => !!role?.permissions?.[key],
      getRole,
    }
  }, [user, role, roles])
}

export function rolesAssignableBy(role: MasterRole | null, allRoles: MasterRole[]): MasterRole[] {
  if (!role) return []
  if (!role.permissions.canChangeUserRoles) return []
  // Can assign roles with rank <= own rank
  return allRoles.filter((r) => r.rank <= role.rank)
}
