import { useState, useCallback, useEffect, FormEvent, useRef } from 'react'
import { Loader2, Send } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useQuerySubmit } from '@/hooks/useQuery'
import ConceptMap3D from '@/components/map/ConceptMap3D'
import FourColumnView from '@/components/query/FourColumnView'
import TutorFeedbackBar from '@/components/feedback/TutorFeedbackBar'
import SocraticLegend from '@/components/socratic/SocraticLegend'
import DialoguePanel from '@/components/socratic/DialoguePanel'
import { assessmentApi, FeedbackConfig, MasteryConfig } from '@/services/assessmentApi'
import { useAuth } from '@/contexts/AuthContext'
import { useTutorMode } from '@/contexts/TutorModeContext'

export default function Dashboard() {
  const { user, token } = useAuth()
  const { tutorMode } = useTutorMode()
  const { submitQuery, isLoading, response } = useQuerySubmit()
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [freeFormText, setFreeFormText] = useState('')
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig | null>(null)
  const [respondedLabel, setRespondedLabel] = useState<string | null>(null)

  // Socratic mode state
  const [socraticConcept, setSocraticConcept] = useState<string | null>(null)
  const [pendingConcept, setPendingConcept] = useState<string | null>(null)
  const [masteryConfigs, setMasteryConfigs] = useState<MasteryConfig[]>([])
  const [showSwitchWarning, setShowSwitchWarning] = useState(false)
  const [dialogueKey, setDialogueKey] = useState(0) // force remount on concept switch

  const hasPanes = response !== null || isLoading
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      assessmentApi.getFeedbackConfig().then(setFeedbackConfig).catch(() => {})
    }
  }, [user])

  // Fetch mastery configs when switching to Guided Discovery mode
  useEffect(() => {
    if (tutorMode === 'socratic' && masteryConfigs.length === 0) {
      assessmentApi.listMasteryConfigs().then(setMasteryConfigs).catch(() => {})
    }
  }, [tutorMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset socratic state when switching back to explore
  useEffect(() => {
    if (tutorMode === 'explore') {
      setSocraticConcept(null)
      setPendingConcept(null)
    }
  }, [tutorMode])

  useEffect(() => {
    if (response && !isLoading) {
      setRespondedLabel(selectedLabel)
    }
  }, [response, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  function getBloomLevel(concept: string): number {
    const cfg = masteryConfigs.find(c => c.concept.toLowerCase() === concept.toLowerCase())
    return cfg?.min_bloom_level_for_mastery ?? 3
  }

  const handleNodeSelect = useCallback(
    (label: string) => {
      if (tutorMode === 'explore') {
        setSelectedLabel(label)
        submitQuery(label)
        return
      }

      // Guided Discovery mode
      if (socraticConcept && socraticConcept !== label) {
        // Mid-dialogue, different node selected — warn before switching
        setPendingConcept(label)
        setShowSwitchWarning(true)
        return
      }

      // No active dialogue or same concept — start/continue
      setSocraticConcept(label)
    },
    [tutorMode, socraticConcept, submitQuery],
  )

  const handleFreeFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = freeFormText.trim()
    if (!q || isLoading) return
    setSelectedLabel(q)
    submitQuery(q)
    setFreeFormText('')
  }

  function confirmSwitch() {
    if (pendingConcept) {
      setSocraticConcept(pendingConcept)
      setDialogueKey(k => k + 1)
      setPendingConcept(null)
    }
    setShowSwitchWarning(false)
  }

  function cancelSwitch() {
    setPendingConcept(null)
    setShowSwitchWarning(false)
  }

  const showFeedback =
    feedbackConfig?.tutor_feedback_enabled === 1 &&
    response !== null &&
    !isLoading &&
    respondedLabel !== null &&
    user?.role === 'STUDENT'

  // ── Guided Discovery mode ───────────────────────────────────────────────────
  if (tutorMode === 'socratic') {
    return (
      <div className="flex flex-col" style={{ height: '100%' }}>
        <SocraticLegend />

        {/* 3D Concept Map */}
        <div
          className="relative flex-shrink-0"
          style={{ height: socraticConcept ? '45vh' : 'calc(100% - 72px)', background: '#0C0B22', minHeight: 240 }}
        >
          <ConceptMap3D onNodeSelect={handleNodeSelect} />

          {!socraticConcept && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                            px-3 py-1.5 rounded-full text-xs
                            text-white/50 border border-white/10 bg-white/5 whitespace-nowrap">
              Click a concept node to start a guided discovery session
            </div>
          )}
        </div>

        {/* Dialogue area */}
        {socraticConcept && (
          <div
            className="flex-1 border-t"
            style={{ borderColor: '#AFA9EC', minHeight: 0 }}
          >
            <DialoguePanel
              key={`${socraticConcept}-${dialogueKey}`}
              concept={socraticConcept}
              bloomLevel={getBloomLevel(socraticConcept)}
              authToken={token}
              onSelectConcept={(c) => {
                setSocraticConcept(c)
                setDialogueKey(k => k + 1)
              }}
            />
          </div>
        )}

        {/* Mid-dialogue switch warning */}
        <Dialog.Root open={showSwitchWarning} onOpenChange={cancelSwitch}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-xl shadow-xl p-5"
              style={{ backgroundColor: 'white', border: '1px solid #AFA9EC' }}
            >
              <div className="flex items-center justify-between mb-3">
                <Dialog.Title className="font-semibold text-sm" style={{ color: '#3C3489' }}>
                  Switch concept?
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-gray-600" onClick={cancelSwitch}>
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
              <p className="text-sm mb-4" style={{ color: '#4b3f9a' }}>
                You're in the middle of a discussion about{' '}
                <strong>{socraticConcept}</strong>. If you leave, the conversation
                will be forgotten.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={cancelSwitch}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ border: '1px solid #AFA9EC', color: '#3C3489' }}
                >
                  Stay
                </button>
                <button
                  onClick={confirmSwitch}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#3C3489' }}
                >
                  Leave
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    )
  }

  // ── Explore mode (unchanged) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* ── 3D Concept Map (hero) ──────────────────────────────────── */}
      <div
        className="relative flex-shrink-0"
        style={{ height: hasPanes ? '50vh' : 'calc(100% - 88px)', background: '#0C0B22', minHeight: 280 }}
      >
        <ConceptMap3D onNodeSelect={handleNodeSelect} />

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
