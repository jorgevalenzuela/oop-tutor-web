import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Navigation() {
  const { user } = useAuth()
  const role = user?.role

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
      className="flex-shrink-0 flex border-b"
      style={{ backgroundColor: '#2C2570', borderColor: 'rgba(255,255,255,0.08)' }}
    >
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
    </nav>
  )
}
