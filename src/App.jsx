import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ReportPage from './pages/ReportPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<UploadPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>
    </Routes>
  )
}
