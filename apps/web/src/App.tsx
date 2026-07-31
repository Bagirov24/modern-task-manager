import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'
import { useRealtimeSync } from '@/lib/hooks/useSocket'
import { useOfflineQueue } from '@/lib/hooks/useOfflineQueue'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import TasksPage from '@/pages/TasksPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import CalendarPage from '@/pages/CalendarPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SettingsPage from '@/pages/SettingsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import TestDataVaultPage from '@/pages/TestDataVaultPage'
import WorkspaceLinksPage from '@/pages/WorkspaceLinksPage'
import ActionInboxPage from '@/pages/ActionInboxPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { Box, CircularProgress } from '@mui/material'

/** Монтируется внутри AuthGuard — значит token уже есть */
function RealtimeSyncProvider() {
  useRealtimeSync()
  useOfflineQueue()
  return null
}

function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <>
      <RealtimeSyncProvider />
      <Layout>
        <Outlet />
      </Layout>
    </>
  )
}

function GuestGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)
  useEffect(() => { checkAuth() }, [])

  return (
    <Routes>
      <Route element={<GuestGuard />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<AuthGuard />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/inbox" element={<ActionInboxPage />} />
        <Route path="/boards" element={<Navigate to="/tasks?view=kanban" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/knowledge" element={<DocumentsPage />} />
        <Route path="/test-data" element={<TestDataVaultPage />} />
        <Route path="/links" element={<WorkspaceLinksPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
