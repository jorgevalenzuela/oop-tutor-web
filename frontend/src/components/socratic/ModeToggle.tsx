import { useTutorMode, TutorMode } from '@/contexts/TutorModeContext'

export default function ModeToggle() {
  const { tutorMode, setTutorMode } = useTutorMode()

  const btn = (mode: TutorMode, label: string) => {
    const active = tutorMode === mode
    return (
      <button
        key={mode}
        onClick={() => setTutorMode(mode)}
        className="px-3 py-1 text-xs font-medium rounded transition-colors"
        style={{
          backgroundColor: active ? '#7F77DD' : 'transparent',
          color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-pressed={active}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-md px-0.5 py-0.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      role="group"
      aria-label="Tutor mode"
    >
      {btn('explore', 'Explore')}
      {btn('socratic', 'Guided Discovery')}
    </div>
  )
}
