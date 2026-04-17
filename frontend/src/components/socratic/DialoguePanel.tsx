import { useState, useEffect, useRef, FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import {
  ChatMessage,
  SocraticReward,
  SkipReason,
  sendSocraticMessage,
  logSocraticSkip,
} from '@/services/socraticApi'
import { queryService } from '@/services/api'
import UMLDiagram from '@/components/query/UMLDiagram'
import SkipButton from './SkipButton'
import CompletionCard from './CompletionCard'

const STEP_LABELS: Record<number, string> = {
  1: 'Activate',
  2: 'Anchor',
  3: 'Bridge',
  4: 'Formalize',
  5: 'Implement',
  6: 'Confirm',
}

interface DialoguePanelProps {
  concept: string
  bloomLevel: number
  authToken: string | null
  onSelectConcept: (concept: string) => void
}

interface RewardPaneProps {
  title: string
  content: string
}

function RewardPane({ title, content }: RewardPaneProps) {
  return (
    <div className="flex flex-col rounded-lg border overflow-hidden" style={{ borderColor: '#AFA9EC' }}>
      <div
        className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489' }}
      >
        {title}
      </div>
      <div className="p-3 text-sm whitespace-pre-wrap leading-relaxed overflow-auto" style={{ color: '#1e1635', maxHeight: 220 }}>
        {content || <span className="italic text-gray-400">No content</span>}
      </div>
    </div>
  )
}

export default function DialoguePanel({
  concept,
  bloomLevel,
  authToken,
  onSelectConcept,
}: DialoguePanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [step, setStep] = useState(1)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [reward, setReward] = useState<SocraticReward | null>(null)
  const [relatedConcept, setRelatedConcept] = useState<string | null>(null)
  const [examNudge, setExamNudge] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // On mount — trigger step-1 opener
  useEffect(() => {
    startDialogue()
  }, [concept]) // eslint-disable-line react-hooks/exhaustive-deps

  async function startDialogue() {
    setMessages([])
    setStep(1)
    setIsComplete(false)
    setReward(null)
    setRelatedConcept(null)
    setExamNudge(null)
    setIsLoading(true)
    try {
      const resp = await sendSocraticMessage(concept, 1, bloomLevel, [], '')
      setMessages([{ role: 'assistant', content: resp.message }])
      if (resp.is_complete) handleCompletion(resp)
    } catch {
      setMessages([{ role: 'assistant', content: `What comes to mind when you hear the term "${concept}"?` }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleCompletion(resp: { reward?: SocraticReward; related_concept?: string | null; exam_nudge?: string | null }) {
    setIsComplete(true)
    if (resp.reward) setReward(resp.reward)
    if (resp.related_concept) setRelatedConcept(resp.related_concept)
    if (resp.exam_nudge) setExamNudge(resp.exam_nudge)
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || isLoading || isComplete) return
    setInputText('')

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newHistory)
    setIsLoading(true)

    try {
      const nextStep = Math.min(step + 1, 6)
      const resp = await sendSocraticMessage(concept, nextStep, bloomLevel, messages, text)
      setStep(nextStep)
      setMessages([...newHistory, { role: 'assistant', content: resp.message }])
      if (resp.is_complete) handleCompletion(resp)
    } catch {
      setMessages([...newHistory, {
        role: 'assistant',
        content: 'Sorry, I had trouble responding. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async (reason: SkipReason | null) => {
    // Log skip event — fire-and-forget, never blocks the reward display
    if (authToken) {
      logSocraticSkip(concept, step, reason, authToken).catch(() => {})
    }

    // Fetch the reward directly from the RAG pipeline (/api/query).
    // We do NOT call the Socratic endpoint here — passing 'skip' as a
    // student message would go through Claude's dialogue logic, which may
    // return is_complete: false (Claude hasn't confirmed understanding yet),
    // leaving reward undefined and the screen blank.
    setIsLoading(true)
    try {
      const ragResp = await queryService.submitQuery(
        `Explain ${concept} in Object-Oriented Programming with C# code examples`,
      )
      setIsComplete(true)
      setReward({
        english: ragResp.answer.english,
        oop: ragResp.answer.oop,
        csharp: ragResp.answer.csharp,
        uml: ragResp.answer.uml,   // skip shows all 4 panes
      })
    } catch {
      // If RAG fails, mark complete with no reward so the UI doesn't get stuck
      setIsComplete(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, reward])

  const currentStepLabel = STEP_LABELS[step] ?? ''

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {/* Step indicator */}
      {!isComplete && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2 border-b text-xs"
          style={{ backgroundColor: '#EEEDFE', borderColor: '#AFA9EC', color: '#6b5fa8' }}
        >
          <span className="font-medium">Step {step} of 6</span>
          <span className="opacity-50">—</span>
          <span>{currentStepLabel}</span>
          <div className="ml-auto flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(s => (
              <div
                key={s}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s <= step ? '#7F77DD' : 'rgba(127,119,221,0.2)' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
              style={
                msg.role === 'assistant'
                  ? { backgroundColor: '#EEEDFE', color: '#1e1635', borderBottomLeftRadius: 4 }
                  : { backgroundColor: '#3C3489', color: 'white', borderBottomRightRadius: 4 }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm"
              style={{ backgroundColor: '#EEEDFE', color: '#6b5fa8', borderBottomLeftRadius: 4 }}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {/* Reward — 3 panes on dialogue completion, 4 panes on skip (includes UML) */}
        {reward && (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b5fa8' }}>
              Full explanation — {concept}
            </p>
            <div className={`grid grid-cols-1 gap-3 ${reward.uml ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
              <RewardPane title="English" content={reward.english} />
              <RewardPane title="OOP" content={reward.oop} />
              {reward.uml && (
                <div className="flex flex-col rounded-lg border overflow-hidden" style={{ borderColor: '#AFA9EC' }}>
                  <div
                    className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: '#EEEDFE', borderColor: '#AFA9EC', color: '#3C3489' }}
                  >
                    UML
                  </div>
                  <div className="p-3 overflow-auto" style={{ maxHeight: 220 }}>
                    <UMLDiagram mermaidSyntax={reward.uml} />
                  </div>
                </div>
              )}
              <RewardPane title="C#" content={reward.csharp} />
            </div>
            <CompletionCard
              concept={concept}
              relatedConcept={relatedConcept}
              examNudge={examNudge}
              onSelectConcept={onSelectConcept}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar + skip */}
      {!isComplete && (
        <div
          className="flex-shrink-0 border-t"
          style={{ borderColor: '#AFA9EC', backgroundColor: '#EEEDFE' }}
        >
          <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type your answer…"
              disabled={isLoading}
              className="flex-1 text-sm px-3 py-2 rounded-lg outline-none disabled:opacity-50"
              style={{
                backgroundColor: 'white',
                border: '1px solid #AFA9EC',
                color: '#1e1635',
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.2)')}
              onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: '#3C3489' }}
              title="Send"
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </form>
          <div className="px-4 pb-2">
            <SkipButton concept={concept} stepAtSkip={step} onSkip={handleSkip} />
          </div>
        </div>
      )}
    </div>
  )
}
