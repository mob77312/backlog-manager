import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { BoardPage } from './pages/BoardPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectBoardPage } from './pages/ProjectBoardPage'
import { ModalsRoot } from './components/modals/ModalsRoot'
import { ActivityLogPanel } from './components/log/ActivityLog'
import { useUIStore } from './store/useUIStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { AuthGate } from './components/auth/AuthGate'
import { PendingApprovalNotifier } from './components/auth/PendingApprovalNotifier'

function App() {
  const view = useUIStore((s) => s.view)
  useKeyboardShortcuts()

  return (
    <>
      <AuthGate>
        <AppShell>
          {view === 'project-board' ? <ProjectBoardPage /> : view === 'board' ? <BoardPage /> : <DashboardPage />}
        </AppShell>
        <ModalsRoot />
        <ActivityLogPanel />
        <PendingApprovalNotifier />
      </AuthGate>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid rgba(15,23,42,0.08)',
            fontSize: 13,
            borderRadius: 10,
            boxShadow: '0 12px 30px rgba(15,23,42,0.14)',
          },
        }}
      />
    </>
  )
}

export default App
