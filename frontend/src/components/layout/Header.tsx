import { useAuth } from '../../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header style={{ backgroundColor: '#3C3489' }} className="flex-shrink-0 px-6 py-3 flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: '#7F77DD' }}
        aria-hidden="true"
      >
        OO
      </div>
      <div className="flex-1">
        <h1 className="text-white font-semibold text-base leading-tight">OOP Tutor</h1>
        <p className="text-white/50 text-xs leading-tight">CIS501 · Object-Oriented Programming</p>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs hidden sm:block">{user.email}</span>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Log out
          </button>
        </div>
      )}
    </header>
  )
}
