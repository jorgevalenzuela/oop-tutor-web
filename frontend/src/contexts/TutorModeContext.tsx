import { createContext, useContext, useState, ReactNode } from 'react'

export type TutorMode = 'explore' | 'socratic'

interface TutorModeContextValue {
  tutorMode: TutorMode
  setTutorMode: (mode: TutorMode) => void
}

const TutorModeContext = createContext<TutorModeContextValue>({
  tutorMode: 'explore',
  setTutorMode: () => {},
})

export function TutorModeProvider({ children }: { children: ReactNode }) {
  const [tutorMode, setTutorMode] = useState<TutorMode>('explore')
  return (
    <TutorModeContext.Provider value={{ tutorMode, setTutorMode }}>
      {children}
    </TutorModeContext.Provider>
  )
}

export function useTutorMode() {
  return useContext(TutorModeContext)
}
