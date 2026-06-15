import { useMemo } from 'react'
import { useHandoffStore } from '../store/useHandoffStore'
import { useDeleteRequestStore } from '../store/useDeleteRequestStore'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { usePermissions } from './usePermissions'

export function useApprovalQueue() {
  const { user, role, can } = usePermissions()
  const requests = useHandoffStore((s) => s.requests)
  const deleteRequests = useDeleteRequestStore((s) => s.requests)
  const config = useWorkflowStore((s) => s.config)

  return useMemo(() => {
    if (!user || !role) {
      return {
        originStage: [],
        targetStage: [],
        deleteStage: [],
        mine: [],
        myDeletes: [],
        actionableCount: 0,
        myPendingCount: 0,
        totalBadge: 0,
        canApprove: false,
      }
    }

    const originStageDef = config.stages.find((s) => s.side === 'origin')
    const targetStageDef = config.stages.find((s) => s.side === 'target')

    const canApproveOrigin =
      role.permissions.canApproveHandoff && (originStageDef?.approverRoleIds.includes(role.id) ?? false)
    const canApproveTarget =
      role.permissions.canApproveHandoff && (targetStageDef?.approverRoleIds.includes(role.id) ?? false)

    const scopeOwnDivision = role.scopeRestriction === 'own_division'
    const scopeOwnDepartment = role.scopeRestriction === 'own_department'

    const matchScope = (teamId: string, deptId: string | null): boolean => {
      // Konsisten dengan usePermissions.scopeCheck:
      // - own_department user yang belum punya departmentId → masih bisa di scope divisinya
      // - Cek dept match hanya kalau both ada (request.deptId dan user.departmentId)
      if (scopeOwnDepartment) {
        if (!user.teamId) return false
        if (teamId !== user.teamId) return false
        if (deptId && user.departmentId && deptId !== user.departmentId) return false
        return true
      }
      if (scopeOwnDivision) return !!user.teamId && teamId === user.teamId
      return true
    }

    const originStage = requests.filter(
      (r) => r.status === 'pending_origin' && canApproveOrigin && matchScope(r.fromTeamId, r.fromDepartmentId),
    )
    const targetStage = requests.filter(
      (r) => r.status === 'pending_target' && canApproveTarget && matchScope(r.toTeamId, r.toDepartmentId),
    )

    // Delete requests: anyone with canDeleteTask + scope match can approve
    const deleteStage = deleteRequests.filter(
      (r) => r.status === 'pending' && can('task.delete', { teamId: r.taskTeamId, departmentId: r.taskDepartmentId }).allowed,
    )

    const mine = requests.filter((r) => r.requestedByUserId === user.id)
    const myDeletes = deleteRequests.filter((r) => r.requestedByUserId === user.id)
    const actionableCount = originStage.length + targetStage.length + deleteStage.length
    const myPendingCount =
      mine.filter((r) => r.status === 'pending_origin' || r.status === 'pending_target').length +
      myDeletes.filter((r) => r.status === 'pending').length

    return {
      originStage,
      targetStage,
      deleteStage,
      mine,
      myDeletes,
      actionableCount,
      myPendingCount,
      totalBadge: actionableCount,
      canApprove: role.permissions.canApproveHandoff || role.permissions.canDeleteTask,
    }
  }, [requests, deleteRequests, user, role, config, can])
}
