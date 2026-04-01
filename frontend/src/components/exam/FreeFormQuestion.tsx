const MAX_CHARS = 2000

interface FreeFormQuestionProps {
  value: string
  onChange: (v: string) => void
  submitted: boolean
}

export default function FreeFormQuestion({ value, onChange, submitted }: FreeFormQuestionProps) {
  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={submitted}
        rows={6}
        maxLength={MAX_CHARS}
        placeholder="Type your answer here…"
        className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-y transition-all"
        style={{
          backgroundColor: 'white',
          border: '1px solid rgba(60,52,137,0.25)',
          color: '#1e1635',
          minHeight: '6rem',
          opacity: submitted ? 0.7 : 1,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#3C3489')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(60,52,137,0.25)')}
      />
      <p className="text-right text-xs" style={{ color: '#9e95c7' }}>
        {value.length} / {MAX_CHARS}
      </p>
    </div>
  )
}
