import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Network, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/graph', label: 'Graph View', icon: Network },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Navigation() {
  return (
    <nav className="border-b bg-gray-50">
      <div className="container mx-auto px-4">
        <ul className="flex gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-b-2 border-primary text-primary bg-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
