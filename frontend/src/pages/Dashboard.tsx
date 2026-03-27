import QueryInput from '@/components/query/QueryInput'
import AnswerDisplay from '@/components/query/AnswerDisplay'
import { useQuerySubmit } from '@/hooks/useQuery'

export default function Dashboard() {
  const { submitQuery, isLoading, response, error } = useQuerySubmit()

  return (
    <div className="space-y-6">
      <QueryInput onSubmit={submitQuery} isLoading={isLoading} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      )}

      <AnswerDisplay answer={response?.answer ?? null} isLoading={isLoading} />
    </div>
  )
}
