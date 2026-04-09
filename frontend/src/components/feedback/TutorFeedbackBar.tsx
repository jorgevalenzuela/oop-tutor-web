import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { assessmentApi } from '@/services/assessmentApi'

interface TutorFeedbackBarProps {
  concept: string
}

type State = 'idle' | 'voted' | 'comment' | 'done'

export default function TutorFeedbackBar({ concept }: TutorFeedbackBarProps) {
  const [state, setState] = useState<State>('idle')
  const [rating, setRating] = useState<1 | -1 | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleVote(r: 1 | -1) {
    setRating(r)
    setState('comment')
  }

  async function handleSubmit() {
    if (rating === null) return
    setSubmitting(true)
    try {
      await assessmentApi.submitTutorFeedback(concept, rating, comment.trim() || undefined)
      setState('done')
    } catch {
      // silent fail — feedback is non-critical
      setState('done')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'done') {
    return (
      <p className="text-xs text-center py-2" style={{ color: '#6b5fa8' }}>
        Thanks for your feedback!
      </p>
    )
  }

  if (state === 'comment') {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="text-xs shrink-0" style={{ color: '#6b5fa8' }}>
          {rating === 1 ? '👍' : '👎'} Add a note (optional):
        </span>
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, 200))}
          placeholder="e.g. Great explanation!"
          className="flex-1 text-xs px-2 py-1 rounded border outline-none"
          style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-xs px-3 py-1 rounded font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#3C3489' }}
        >
          {submitting ? '…' : 'Send'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-xs px-2 py-1 rounded"
          style={{ color: '#9ca3af' }}
        >
          Skip
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <span className="text-xs" style={{ color: '#6b5fa8' }}>Was this helpful?</span>
      <button
        onClick={() => handleVote(1)}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-green-50"
        style={{ borderColor: '#d1fae5', color: '#16a34a' }}
        title="Thumbs up"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleVote(-1)}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-red-50"
        style={{ borderColor: '#fee2e2', color: '#dc2626' }}
        title="Thumbs down"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
