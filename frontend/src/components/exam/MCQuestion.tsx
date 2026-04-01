interface MCQuestionProps {
  options: string[]
  selected: string | null
  correct: string | null
  onSelect: (option: string) => void
  submitted: boolean
}

export default function MCQuestion({ options, selected, correct, onSelect, submitted }: MCQuestionProps) {
  return (
    <div className="space-y-2.5">
      {options.map((option, i) => {
        const isSelected = selected === option
        const isCorrect = submitted && correct === option
        const isWrong = submitted && isSelected && correct !== option

        let bg = 'white'
        let border = 'rgba(60,52,137,0.2)'
        let textColor = '#2d2450'

        if (isCorrect) { bg = 'rgba(22,163,74,0.08)'; border = 'rgba(22,163,74,0.45)'; textColor = '#15803d' }
        else if (isWrong) { bg = 'rgba(220,38,38,0.08)'; border = 'rgba(220,38,38,0.45)'; textColor = '#b91c1c' }
        else if (isSelected) { bg = 'rgba(60,52,137,0.1)'; border = '#3C3489'; textColor = '#1e1635' }

        return (
          <button
            key={i}
            onClick={() => !submitted && onSelect(option)}
            disabled={submitted}
            className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-start gap-3"
            style={{
              backgroundColor: bg,
              border: `1px solid ${border}`,
              color: textColor,
              cursor: submitted ? 'default' : 'pointer',
            }}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5"
              style={{
                borderColor: isSelected || isCorrect ? border : 'rgba(60,52,137,0.3)',
                backgroundColor: isSelected || isCorrect ? border : 'transparent',
                color: isSelected || isCorrect ? 'white' : '#3C3489',
              }}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span>{option}</span>
          </button>
        )
      })}
    </div>
  )
}
