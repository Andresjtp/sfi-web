import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import ProjectDetailPage from './pages/ProjectDetailPage.jsx'
import ReportPage from './pages/ReportPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Redirect root to projects */}
        <Route index element={<Navigate to="/projects" replace />} />

        {/* Projects */}
        <Route path="/projects"              element={<ProjectsPage />} />
        <Route path="/projects/:projectId"   element={<ProjectDetailPage />} />

        {/* Report (reads from sessionStorage, project-agnostic) */}
        <Route path="/report"                element={<ReportPage />} />
      </Route>
    </Routes>
  )
}
