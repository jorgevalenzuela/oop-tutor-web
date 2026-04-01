import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import Settings from './pages/Settings'
import ExamPage from './pages/ExamPage'
import LoginPage from './pages/LoginPage'

function App() {
  const { user } = useAuth()

  if (!user) {
    return <LoginPage />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppLayout>
  )
}

export default App
