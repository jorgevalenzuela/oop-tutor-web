import { useState, useRef, useEffect } from 'react'
import MCQuestion from './MCQuestion'
import FreeFormQuestion from './FreeFormQuestion'
import CodeQuestion from './CodeQuestion'
import MatchingQuestion from './MatchingQuestion'
import QuestionFlagButton from '@/components/feedback/QuestionFlagButton'
import { ExamQuestion, AnswerResult, FeedbackConfig } from '../../services/assessmentApi'
import { assessmentApi } from '../../services/assessmentApi'
import { useAuth } from '../../contexts/AuthContext'

interface QuestionCardProps {
  question: ExamQuestion
  questionNumber: number
  totalQuestions: number
  onSubmit: (answer: string, timeSeconds: number) => Promise<AnswerResult>
  onNext: () => void
}

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }
const DIFFICULTY_COLOR: Record<number, string> = {
  1: '#16a34a',
  2: '#ca8a04',
  3: '#dc2626',
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onSubmit,
  onNext,
}: QuestionCardProps) {
  const { user } = useAuth()
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig | null>(null)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    assessmentApi.getFeedbackConfig().then(setFeedbackConfig).catch(() => {})
  }, [])

  useEffect(() => {
    setAnswer('')
    setResult(null)
    startTimeRef.current = Date.now()
  }, [question.id])

  const options: string[] = question.options ? JSON.parse(question.options) : []

  const matchingPairs = (() => {
    if (question.type !== 'CONCEPT_MATCHING') return []
    try {
      return JSON.parse(question.options ?? '[]') as { concept: string; definition: string }[]
    } catch { return [] }
  })()

  async function handleSubmit() {
    if (!answer.trim() && question.type !== 'CONCEPT_MATCHING') return
    setSubmitting(true)
    const timeSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
    try {
      const res = await onSubmit(answer, timeSeconds)
      setResult(res)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = (() => {
    if (result) return false
    if (submitting) return false
    if (question.type === 'MULTIPLE_CHOICE') return answer !== ''
    if (question.type === 'CONCEPT_MATCHING') return answer !== '' && answer !== '[]'
    return answer.trim().length >= 3
  })()

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5 text-xs" style={{ color: '#6b5fa8' }}>
          <span>Question {questionNumber} of {totalQuestions}</span>
          <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(60,52,137,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%`, backgroundColor: '#3C3489' }}
          />
        </div>
      </div>

      {/* Concept + difficulty tags */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: 'rgba(60,52,137,0.12)', color: '#3C3489' }}
        >
          {question.concept}
        </span>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${DIFFICULTY_COLOR[question.difficulty]}18`,
            color: DIFFICULTY_COLOR[question.difficulty],
          }}
        >
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
      </div>

      {/* Question text */}
      <p className="text-base font-medium mb-5 leading-relaxed" style={{ color: '#1e1635' }}>
        {question.question_text}
      </p>

      {/* Answer input */}
      <div className="flex-1 mb-5">
        {question.type === 'MULTIPLE_CHOICE' && (
          <MCQuestion
            options={options}
            selected={answer}
            correct={result ? options.find(o => o === answer) ?? null : null}
            onSelect={setAnswer}
            submitted={!!result}
          />
        )}
        {question.type === 'FREE_FORM' && (
          <FreeFormQuestion value={answer} onChange={setAnswer} submitted={!!result} />
        )}
        {question.type === 'CODE_WRITING' && (
          <CodeQuestion value={answer} onChange={setAnswer} submitted={!!result} />
        )}
        {question.type === 'CONCEPT_MATCHING' && (
          <MatchingQuestion
            pairs={matchingPairs}
            value={answer}
            onChange={setAnswer}
            submitted={!!result}
          />
        )}
      </div>

      {/* Feedback panel */}
      {result && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-sm"
          style={{
            backgroundColor: result.isCorrect ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1px solid ${result.isCorrect ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold" style={{ color: result.isCorrect ? '#15803d' : '#b91c1c' }}>
              {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
            <span className="text-xs" style={{ color: '#6b5fa8' }}>
              Score: {Math.round(result.score * 100)}%
            </span>
            {result.masteryAchieved && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(202,138,4,0.15)', color: '#92400e' }}>
                Mastery achieved!
              </span>
            )}
          </div>
          <p style={{ color: '#2d2450' }}>{result.feedback}</p>
          {feedbackConfig?.exam_feedback_enabled === 1 && user?.role === 'STUDENT' && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <QuestionFlagButton key={question.id} questionId={question.id} />
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {!result ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#3C3489' }}
        >
          {submitting ? 'Grading…' : 'Submit Answer'}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="w-full py-3 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#3C3489' }}
        >
          {questionNumber < totalQuestions ? 'Next Question →' : 'Complete Exam'}
        </button>
      )}
    </div>
  )
}
