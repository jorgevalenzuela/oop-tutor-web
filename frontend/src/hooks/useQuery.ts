import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryService, QueryResponse } from '@/services/api'

export function useQuerySubmit() {
  const [response, setResponse] = useState<QueryResponse | null>(null)

  const mutation = useMutation({
    mutationFn: (question: string) => queryService.submitQuery(question),
    onSuccess: (data) => {
      setResponse(data)
    },
  })

  return {
    submitQuery: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    response,
    clearResponse: () => setResponse(null),
  }
}
