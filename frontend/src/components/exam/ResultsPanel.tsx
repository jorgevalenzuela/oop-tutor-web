import { useNavigate } from 'react-router-dom'
import { ExamSummary, ConceptMastery } from '../../services/assessmentApi'

interface ResultsPanelProps {
  summary: ExamSummary
  mastery: ConceptMastery[]
  prevMastery: ConceptMastery[]
  onTakeAnother: () => void
}

function formatTime(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

type ChangeBadge = 'mastered' | 'improved' | 'no-change' | 'first'

function getChangeBadge(
  concept: string,
  currentScore: number,
  mastery: ConceptMastery[],
  prevMastery: ConceptMastery[],
): ChangeBadge {
  const current = mastery.find(m => m.concept === concept)
  const prev = prevMastery.find(m => m.concept === concept)

  if (current?.mastery_achieved === 1 && prev?.mastery_achieved !== 1) return 'mastered'
  if (!prev) return 'first'
  if (currentScore > prev.average_score + 0.01) return 'improved'
  return 'no-change'
}

const BADGE_CFG = {
  mastered:  { label: '★ Mastered',      bg: 'rgba(202,138,4,0.12)',  color: '#92400e' },
  improved:  { label: '↑ Improved',      bg: 'rgba(22,163,74,0.1)',   color: '#15803d' },
  'no-change': { label: '→ No change',   bg: 'rgba(60,52,137,0.08)', color: '#6b5fa8' },
  first:     { label: 'First attempt',   bg: 'rgba(60,52,137,0.08)', color: '#6b5fa8' },
}

export default function ResultsPanel({ summary, mastery, prevMastery, onTakeAnother }: ResultsPanelProps) {
  const navigate = useNavigate()
  const score = summary.overall_score ?? 0
  const scorePercent = Math.round(score * 100)
  const passed = score >= 0.8

  const conceptScores = summary.answers.reduce<Record<string, { total: number; count: number }>>((acc, a) => {
    const c = a.question.concept
    if (!acc[c]) acc[c] = { total: 0, count: 0 }
    acc[c].total += a.ai_score ?? 0
    acc[c].count += 1
    return acc
  }, {})

  const toReview = Object.entries(conceptScores)
    .filter(([, v]) => v.total / v.count < 0.7)
    .map(([concept]) => concept)

  return (
    <div className="space-y-6">
      {/* Score hero */}
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: passed ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)',
          border: `1px solid ${passed ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
        }}
      >
        <div className="text-5xl font-bold mb-1" style={{ color: passed ? '#15803d' : '#b91c1c' }}>
          {scorePercent}%
        </div>
        <p className="text-sm" style={{ color: '#6b5fa8' }}>
          Attempt #{summary.attempt_number} · {formatTime(summary.time_taken_seconds)} · {summary.difficulty_range}
        </p>
        {summary.mastery_achieved === 1 && (
          <div className="mt-3 inline-block px-3 py-1 rounded-full text-sm"
            style={{ backgroundColor: 'rgba(202,138,4,0.12)', color: '#92400e' }}>
            Overall Mastery Achieved ★
          </div>
        )}
      </div>

      {/* Per-concept scores */}
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#1e1635' }}>
          This Exam — Concept Results
        </h3>
        <p className="text-xs italic mb-3" style={{ color: '#9e95c7' }}>
          Scores shown are for this exam only. Visit the Progress tab for your overall mastery across all attempts.
        </p>
        <div className="space-y-3">
          {Object.entries(conceptScores).map(([concept, v]) => {
            const pct = Math.round((v.total / v.count) * 100)
            const examScore = v.total / v.count
            const badge = getChangeBadge(concept, examScore, mastery, prevMastery)
            const badgeCfg = BADGE_CFG[badge]
            return (
              <div key={concept}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm" style={{ color: '#1e1635' }}>{concept}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: badgeCfg.bg, color: badgeCfg.color }}
                    >
                      {badgeCfg.label}
                    </span>
                    <span className="text-sm font-medium" style={{ color: pct >= 80 ? '#15803d' : pct >= 60 ? '#ca8a04' : '#b91c1c' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(60,52,137,0.12)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Concepts to review */}
      {toReview.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: '#b91c1c' }}>Concepts to Review</h3>
          <div className="flex flex-wrap gap-2">
            {toReview.map(c => (
              <span
                key={c}
                className="px-2.5 py-1 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#b91c1c' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/progress')}
          className="w-full py-3 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#16a34a' }}
        >
          View Overall Progress
        </button>
        <button
          onClick={onTakeAnother}
          className="w-full py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'rgba(60,52,137,0.08)', color: '#3C3489', border: '1px solid rgba(60,52,137,0.2)' }}
        >
          Take Another Exam
        </button>
      </div>
    </div>
  )
}
