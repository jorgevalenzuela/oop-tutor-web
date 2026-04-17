import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const SESSION_KEY = 'socratic-legend-collapsed'

export default function SocraticLegend() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  return (
    <div
      className="flex-shrink-0 border-b"
      style={{ backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' }}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-2 text-left"
        style={{ color: '#3C3489' }}
        aria-expanded={!collapsed}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b5fa8' }}>
          Guided Discovery
        </span>
        {collapsed
          ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          : <ChevronUp className="h-3.5 w-3.5 opacity-60" />
        }
      </button>

      {!collapsed && (
        <p className="px-5 pb-3 text-sm" style={{ color: '#4b3f9a' }}>
          Tell me what concept you'd like to explore and I'll guide you through it step by step.
          You can skip to the full explanation at any time.
        </p>
      )}
    </div>
  )
}
