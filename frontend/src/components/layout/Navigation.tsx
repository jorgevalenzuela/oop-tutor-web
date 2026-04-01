import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',        label: 'Tutor'           },
  { to: '/exam',    label: 'Exam'            },
  { to: '/graph',   label: 'Knowledge Graph' },
  { to: '/settings', label: 'Settings'       },
]

export default function Navigation() {
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
