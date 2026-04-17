import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import ModeToggle from '@/components/socratic/ModeToggle'

export default function Navigation() {
  const { user } = useAuth()
  const location = useLocation()
  const role = user?.role
  const onTutorTab = location.pathname === '/'

  const isInstructorOrTA = role === 'INSTRUCTOR' || role === 'TA' || role === 'ADMIN'
  const isStudent = role === 'STUDENT'
  const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN'

  const tabs = [
    { to: '/',            label: 'Tutor',              show: true },
    { to: '/exam',        label: 'Exam',               show: true },
    { to: '/progress',    label: 'Progress',           show: isStudent },
    { to: '/instructor',  label: 'Dashboard',          show: isInstructorOrTA },
    { to: '/discussion',  label: 'Discussion',         show: true },
    { to: '/graph',       label: 'Knowledge Graph',    show: true },
    { to: '/settings',    label: 'Settings',           show: isInstructorOrAdmin },
  ].filter(t => t.show)

  return (
    <nav
      className="flex-shrink-0 flex items-center border-b"
      style={{ backgroundColor: '#2C2570', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-1">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-white border-white'
                  : 'text-white/50 border-transparent hover:text-white/80 hover:border-white/30'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
      {onTutorTab && (
        <div className="flex-shrink-0 px-4">
          <ModeToggle />
        </div>
      )}
    </nav>
  )
}
