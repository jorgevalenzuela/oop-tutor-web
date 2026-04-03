import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import Settings from './pages/Settings'
import ExamPage from './pages/ExamPage'
import ProgressPage from './pages/ProgressPage'
import LoginPage from './pages/LoginPage'

function App() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <LoginPage />
  }

  const onTutor = location.pathname === '/'

  return (
    <AppLayout>
      {/* Dashboard is always mounted so the 3D map preserves expanded state */}
      <div style={{ display: onTutor ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
        <Dashboard />
      </div>

      {!onTutor && (
        <Routes>
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      )}
    </AppLayout>
  )
}

export default App
