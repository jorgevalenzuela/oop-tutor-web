import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'

interface CompletionCardProps {
  concept: string
  relatedConcept: string | null
  examNudge: string | null
  onSelectConcept: (concept: string) => void
}

export default function CompletionCard({
  concept,
  relatedConcept,
  examNudge,
  onSelectConcept,
}: CompletionCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-lg border px-4 py-3 mt-3 text-sm"
      style={{
        backgroundColor: '#EEEDFE',
        borderColor: '#AFA9EC',
        color: '#3C3489',
      }}
    >
      {relatedConcept && (
        <p className="mb-2" style={{ color: '#4b3f9a' }}>
          Based on our conversation about <strong>{concept}</strong>, you might also want to explore{' '}
          <button
            onClick={() => onSelectConcept(relatedConcept)}
            className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-1"
            style={{ color: '#3C3489' }}
          >
            {relatedConcept}
            <ArrowRight className="h-3 w-3" />
          </button>
        </p>
      )}

      {examNudge && (
        <div className="flex items-center justify-between gap-3">
          <p style={{ color: '#4b3f9a' }}>{examNudge}</p>
          <button
            onClick={() => navigate('/exam')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ backgroundColor: '#3C3489', color: 'white' }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Take Exam
          </button>
        </div>
      )}

      {!relatedConcept && !examNudge && (
        <p style={{ color: '#4b3f9a' }}>
          Great work exploring <strong>{concept}</strong>! Select another node on the map to continue.
        </p>
      )}
    </div>
  )
}
