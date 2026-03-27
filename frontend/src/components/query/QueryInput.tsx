import { useState, FormEvent } from 'react'
import { Loader2, X } from 'lucide-react'

interface QueryInputProps {
  onSubmit: (question: string) => void
  isLoading: boolean
}

export default function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [question, setQuestion] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      onSubmit(question.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4">
      <div className="flex items-center gap-4">
        <label htmlFor="question" className="text-base font-semibold text-foreground whitespace-nowrap">
          Your Question
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is a class?"
            className="w-full px-4 py-2 pr-8 bg-white border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            disabled={isLoading}
          />
          {question && !isLoading && (
            <button
              type="button"
              onClick={() => setQuestion('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          ) : (
            'Submit'
          )}
        </button>
      </div>
    </form>
  )
}
