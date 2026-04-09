import { useState } from 'react'
import { Flag } from 'lucide-react'
import { assessmentApi } from '@/services/assessmentApi'

interface QuestionFlagButtonProps {
  questionId: string
}

type State = 'idle' | 'open' | 'done'

export default function QuestionFlagButton({ questionId }: QuestionFlagButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await assessmentApi.submitQuestionFeedback(questionId, -1, comment.trim() || undefined)
      setState('done')
    } catch {
      setState('done')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'done') {
    return <span className="text-xs" style={{ color: '#6b5fa8' }}>Question flagged. Thanks!</span>
  }

  if (state === 'open') {
    return (
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, 200))}
          placeholder="What's wrong with this question? (optional)"
          className="flex-1 text-xs px-2 py-1 rounded border outline-none"
          style={{ borderColor: '#AFA9EC', color: '#1e1635' }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-xs px-3 py-1 rounded font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#dc2626' }}
        >
          {submitting ? '…' : 'Flag'}
        </button>
        <button onClick={() => setState('idle')} className="text-xs" style={{ color: '#9ca3af' }}>Cancel</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('open')}
      className="flex items-center gap-1 text-xs transition-colors hover:text-red-600"
      style={{ color: '#9ca3af' }}
    >
      <Flag className="h-3 w-3" />
      Flag this question
    </button>
  )
}
