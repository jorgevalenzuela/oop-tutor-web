import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import Settings from './pages/Settings'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppLayout>
  )
}

export default App
