import { StatsOverview } from '../components/dashboard/StatsOverview'
import { BurndownChart } from '../components/dashboard/BurndownChart'
import { TeamWorkloadChart } from '../components/dashboard/TeamWorkloadChart'
import { PriorityDistribution } from '../components/dashboard/PriorityDistribution'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { TopOverdueTasks } from '../components/dashboard/TopOverdueTasks'
import { MyTasksCard } from '../components/dashboard/MyTasksCard'
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines'
import { HandoffFlowMatrix } from '../components/dashboard/HandoffFlowMatrix'
import { DepartmentHeatmap } from '../components/dashboard/DepartmentHeatmap'
import { ApprovalInsights } from '../components/dashboard/ApprovalInsights'
import { ProjectPipelineCard } from '../components/dashboard/ProjectPipelineCard'
import { ProjectAtRiskCard } from '../components/dashboard/ProjectAtRiskCard'

export function DashboardPage() {
  return (
    <div className="absolute inset-0 overflow-y-auto p-5 space-y-4">
      <StatsOverview />

      {/* Row 2: Project L0 pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProjectPipelineCard />
        <ProjectAtRiskCard />
      </div>

      {/* Row 3: Personal & deadline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyTasksCard />
        <UpcomingDeadlines />
      </div>

      {/* Row 3: Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BurndownChart />
        <TeamWorkloadChart />
      </div>

      {/* Row 4: Cross-divisi insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HandoffFlowMatrix />
        <DepartmentHeatmap />
      </div>

      {/* Row 5: Approval + Priority + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ApprovalInsights />
        <PriorityDistribution />
        <RecentActivity />
      </div>

      {/* Row 6: Overdue full width */}
      <div className="grid grid-cols-1 gap-4">
        <TopOverdueTasks />
      </div>
    </div>
  )
}
