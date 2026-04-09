import { useState, useCallback, useEffect, FormEvent, useRef } from 'react'
import { Loader2, Send } from 'lucide-react'
import { useQuerySubmit } from '@/hooks/useQuery'
import ConceptMap3D from '@/components/map/ConceptMap3D'
import FourColumnView from '@/components/query/FourColumnView'
import TutorFeedbackBar from '@/components/feedback/TutorFeedbackBar'
import { assessmentApi, FeedbackConfig } from '@/services/assessmentApi'
import { useAuth } from '@/contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const { submitQuery, isLoading, response } = useQuerySubmit()
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [freeFormText, setFreeFormText] = useState('')
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig | null>(null)
  // Track the concept for which a response was received (for feedback)
  const [respondedLabel, setRespondedLabel] = useState<string | null>(null)
  const hasPanes = response !== null || isLoading
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      assessmentApi.getFeedbackConfig().then(setFeedbackConfig).catch(() => {})
    }
  }, [user])

  // When a new response arrives, lock in the concept it's for
  useEffect(() => {
    if (response && !isLoading) {
      setRespondedLabel(selectedLabel)
    }
  }, [response, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeSelect = useCallback(
    (label: string) => {
      setSelectedLabel(label)
      submitQuery(label)
    },
    [submitQuery],
  )

  const handleFreeFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = freeFormText.trim()
    if (!q || isLoading) return
    setSelectedLabel(q)
    submitQuery(q)
    setFreeFormText('')
  }

  const showFeedback =
    feedbackConfig?.tutor_feedback_enabled === 1 &&
    response !== null &&
    !isLoading &&
    respondedLabel !== null &&
    user?.role === 'STUDENT'

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* ── 3D Concept Map (hero) ──────────────────────────────────── */}
      <div
        className="relative flex-shrink-0"
        style={{ height: hasPanes ? '50vh' : 'calc(100% - 88px)', background: '#0C0B22', minHeight: 280 }}
      >
        <ConceptMap3D onNodeSelect={handleNodeSelect} />

        {/* Loading indicator overlay (Ollama is slow — must not feel broken) */}
        {isLoading && selectedLabel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                          flex items-center gap-2 px-4 py-2 rounded-full
                          bg-white/10 backdrop-blur-sm border border-white/20
                          text-white text-sm whitespace-nowrap">
            <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
            <span className="text-purple-100">
              Loading <span className="font-semibold">"{selectedLabel}"</span>…
            </span>
          </div>
        )}

        {/* Hint — only shown before any selection */}
        {!hasPanes && !isLoading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                          px-3 py-1.5 rounded-full text-xs
                          text-white/50 border border-white/10 bg-white/5 whitespace-nowrap">
            Click a node to learn · Double-click to expand
          </div>
        )}

      </div>

      {/* ── Four Panes (appear after node click) ──────────────────────────── */}
      {hasPanes && (
        <div
          className="flex-1 overflow-auto border-t border-gray-200 bg-gray-50 p-4"
          style={{ minHeight: 0 }}
        >
          {selectedLabel && (
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
              {selectedLabel}
            </p>
          )}
          <FourColumnView answer={response?.answer ?? null} isLoading={isLoading} />

          {/* Feedback row — shown after response loads, students only */}
          {showFeedback && (
            <div className="mt-3 border-t border-gray-100 pt-2">
              <TutorFeedbackBar key={respondedLabel} concept={respondedLabel!} />
            </div>
          )}
        </div>
      )}

      {/* ── Free-form question bar (bottom) ──────────────────────────────── */}
      <form
        onSubmit={handleFreeFormSubmit}
        className="flex-shrink-0 flex flex-col justify-center gap-2 px-5 py-4"
        style={{
          height: 88,
          backgroundColor: '#EEEDFE',
          borderTop: '1px solid #AFA9EC',
        }}
      >
        <span className="text-sm font-medium" style={{ color: '#6b5fa8', fontSize: '1.1rem' }}>Ask a free-form question</span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={freeFormText}
            onChange={(e) => setFreeFormText(e.target.value)}
            placeholder="e.g. What is polymorphism?"
            disabled={isLoading}
            className="flex-1 text-sm px-3 py-2 rounded-lg outline-none transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'white',
              border: '1px solid #AFA9EC',
              color: '#1e1635',
            }}
            onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.2)'}
            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
          />
          <button
            type="submit"
            disabled={isLoading || !freeFormText.trim()}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: '#3C3489' }}
            title="Submit"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>
      </form>
    </div>
  )
}
