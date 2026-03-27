import { StructuredAnswer } from '@/services/api'
import FourColumnView from './FourColumnView'

interface AnswerDisplayProps {
  answer: StructuredAnswer | null
  isLoading: boolean
}

export default function AnswerDisplay({ answer, isLoading }: AnswerDisplayProps) {
  if (!answer && !isLoading) {
    return (
      <div className="bg-card rounded-lg p-8 text-center text-muted-foreground">
        <p>Ask a question above to see the answer displayed here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-foreground">My Answer</h2>
      <FourColumnView answer={answer} isLoading={isLoading} />
    </div>
  )
}
