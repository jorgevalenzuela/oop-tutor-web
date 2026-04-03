import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ConceptMastery, assessmentApi, setAuthToken } from '../services/assessmentApi'

const SESSION_KEY = 'oop_tutor_session'

interface User {
  id: string
  email: string
  role: string
}

interface StoredSession {
  user: User
  token: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  masteryData: ConceptMastery[]
  login: (user: User, token: string) => void
  logout: () => void
  refreshMastery: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore session from sessionStorage on first render
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as StoredSession).user : null
    } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const tok = (JSON.parse(raw) as StoredSession).token
      setAuthToken(tok)
      return tok
    } catch { return null }
  })
  const [masteryData, setMasteryData] = useState<ConceptMastery[]>([])

  // Fetch mastery on restore (token already set above)
  useEffect(() => {
    if (token) assessmentApi.getMastery().then(setMasteryData).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function login(newUser: User, tok: string) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: newUser, token: tok }))
    setAuthToken(tok)
    setUser(newUser)
    setToken(tok)
    assessmentApi.getMastery().then(setMasteryData).catch(() => {})
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthToken(null)
    setUser(null)
    setToken(null)
    setMasteryData([])
  }

  async function refreshMastery() {
    try {
      const data = await assessmentApi.getMastery()
      setMasteryData(data)
    } catch { /* non-fatal */ }
  }

  return (
    <AuthContext.Provider value={{ user, token, masteryData, login, logout, refreshMastery }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
