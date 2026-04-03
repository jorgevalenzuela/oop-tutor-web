import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  assessmentApi,
  ExamInstance,
  ExamQuestion,
  ExamQuestionMeta,
  ExamSummary,
  ConceptMastery,
  AnswerResult,
} from '../services/assessmentApi'
import QuestionCard from '../components/exam/QuestionCard'
import ResultsPanel from '../components/exam/ResultsPanel'

type ViewState =
  | { mode: 'idle' }
  | {
      mode: 'in_exam'
      exam: ExamInstance
      questions: ExamQuestionMeta[]
      currentIndex: number
      currentQuestion: ExamQuestion
      masteryStop: { conceptsMastered: string[] } | null
      continuedAfterMastery: boolean
      prevMastery: ConceptMastery[]
    }
  | { mode: 'results'; summary: ExamSummary; mastery: ConceptMastery[]; prevMastery: ConceptMastery[] }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExamPage() {
  const { refreshMastery } = useAuth()
  const [view, setView] = useState<ViewState>({ mode: 'idle' })
  const [history, setHistory] = useState<ExamInstance[]>([])
  const [mastery, setMastery] = useState<ConceptMastery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadIdleData = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([assessmentApi.getHistory(), assessmentApi.getMastery()])
      setHistory(h)
      setMastery(m)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => {
    if (view.mode === 'idle') loadIdleData()
  }, [view.mode, loadIdleData])

  async function handleStartExam() {
    setError('')
    setLoading(true)
    try {
      const { exam, questions, firstQuestion } = await assessmentApi.startExam()
      setView({
        mode: 'in_exam', exam, questions, currentIndex: 0,
        currentQuestion: firstQuestion, masteryStop: null, continuedAfterMastery: false,
        prevMastery: mastery,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start exam')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitAnswer(answer: string, timeSeconds: number): Promise<AnswerResult> {
    if (view.mode !== 'in_exam') throw new Error('No active exam')
    const result = await assessmentApi.submitAnswer(
      view.exam.id, view.currentQuestion.id, answer, timeSeconds,
      view.continuedAfterMastery
    )
    if (result.examShouldStop && !view.masteryStop) {
      setView({ ...view, masteryStop: { conceptsMastered: result.conceptsMastered } })
    }
    return result
  }

  async function handleNext() {
    if (view.mode !== 'in_exam') return
    const nextIndex = view.currentIndex + 1
    if (nextIndex >= view.questions.length) {
      try {
        const [summary, m] = await Promise.all([
          assessmentApi.completeExam(view.exam.id),
          assessmentApi.getMastery(),
        ])
        setView({ mode: 'results', summary, mastery: m, prevMastery: view.prevMastery })
        refreshMastery()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete exam')
      }
      return
    }
    try {
      const nextQ = await assessmentApi.getQuestion(view.exam.id, nextIndex)
      setView({ ...view, currentIndex: nextIndex, currentQuestion: nextQ })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load next question')
    }
  }

  async function handleViewResults() {
    if (view.mode !== 'in_exam') return
    try {
      const [summary, m] = await Promise.all([
        assessmentApi.completeExam(view.exam.id),
        assessmentApi.getMastery(),
      ])
      setView({ mode: 'results', summary, mastery: m, prevMastery: view.prevMastery })
      refreshMastery()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete exam')
    }
  }

  function handleContinueAnyway() {
    if (view.mode !== 'in_exam') return
    setView({ ...view, masteryStop: null, continuedAfterMastery: true })
  }

  async function handleAbandon() {
    if (view.mode !== 'in_exam') return
    if (!window.confirm('Abandon this exam? Progress will not count toward mastery.')) return
    try {
      await assessmentApi.abandonExam(view.exam.id)
      setView({ mode: 'idle' })
    } catch { /* ignore */ }
  }

  if (view.mode === 'results') {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#1e1635' }}>Exam Results</h2>
          <ResultsPanel summary={view.summary} mastery={view.mastery} prevMastery={view.prevMastery} onTakeAnother={() => setView({ mode: 'idle' })} />
        </div>
      </div>
    )
  }

  if (view.mode === 'in_exam') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
          style={{ borderColor: 'rgba(60,52,137,0.15)', backgroundColor: 'rgba(60,52,137,0.06)' }}
        >
          <div className="text-sm" style={{ color: '#6b5fa8' }}>
            Attempt #{view.exam.attempt_number} · {view.exam.difficulty_range}
          </div>
          <button onClick={handleAbandon} className="text-xs hover:text-red-500 transition-colors" style={{ color: '#9e95c7' }}>
            Abandon
          </button>
        </div>

        {/* Mastery stop banner */}
        {view.masteryStop && (
          <div
            className="flex-shrink-0 mx-6 mt-4 rounded-xl px-5 py-4"
            style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}
          >
            <p className="font-semibold mb-1" style={{ color: '#15803d' }}>
              You have demonstrated mastery of all concepts in this exam!
            </p>
            <p className="text-sm mb-3" style={{ color: '#6b5fa8' }}>
              Mastered: {view.masteryStop.conceptsMastered.join(', ')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleViewResults}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#15803d' }}
              >
                View Results
              </button>
              <button
                onClick={handleContinueAnyway}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'rgba(60,52,137,0.1)', color: '#3C3489', border: '1px solid rgba(60,52,137,0.2)' }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto">
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <QuestionCard
              question={view.currentQuestion}
              questionNumber={view.currentIndex + 1}
              totalQuestions={view.questions.length}
              onSubmit={handleSubmitAnswer}
              onNext={handleNext}
            />
          </div>
        </div>
      </div>
    )
  }

  // Idle view
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-8">
        <div
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1e1635' }}>OOP Assessment</h2>
          <p className="text-sm mb-6" style={{ color: '#6b5fa8' }}>
            10 questions · difficulty adapts to your attempt number
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <button
            onClick={handleStartExam}
            disabled={loading}
            className="px-8 py-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#3C3489' }}
          >
            {loading ? 'Starting…' : 'Start Exam'}
          </button>
        </div>

        {mastery.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: '#6b5fa8' }}>Concept Mastery</h3>
            <div className="space-y-2">
              {mastery.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate" style={{ color: '#1e1635' }}>{m.concept}</span>
                  <div className="w-24 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(60,52,137,0.15)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round(m.average_score * 100)}%`, backgroundColor: m.mastery_achieved ? '#16a34a' : '#3C3489' }} />
                  </div>
                  <span className="text-xs w-8 text-right flex-shrink-0" style={{ color: '#6b5fa8' }}>
                    {Math.round(m.average_score * 100)}%
                  </span>
                  {m.mastery_achieved === 1 && <span style={{ color: '#ca8a04' }}>★</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: '#6b5fa8' }}>Exam History</h3>
            <div className="space-y-2">
              {history.map(exam => (
                <div key={exam.id} className="flex items-center justify-between px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(60,52,137,0.06)', border: '1px solid rgba(60,52,137,0.12)' }}>
                  <div>
                    <span className="font-medium" style={{ color: '#1e1635' }}>Attempt #{exam.attempt_number}</span>
                    <span className="ml-2 text-xs" style={{ color: '#6b5fa8' }}>{exam.difficulty_range} · {formatDate(exam.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {exam.mastery_achieved === 1 && <span style={{ color: '#ca8a04' }}>★</span>}
                    <span className="font-medium" style={{ color: (exam.overall_score ?? 0) >= 0.8 ? '#16a34a' : (exam.overall_score ?? 0) >= 0.6 ? '#ca8a04' : '#dc2626' }}>
                      {exam.overall_score != null ? `${Math.round(exam.overall_score * 100)}%` : exam.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
