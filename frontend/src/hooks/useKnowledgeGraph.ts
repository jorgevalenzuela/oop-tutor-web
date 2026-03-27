import { useQuery } from '@tanstack/react-query'
import { graphService, GraphResponse, GraphNode } from '@/services/api'

export function useKnowledgeGraph() {
  return useQuery<GraphResponse>({
    queryKey: ['graph', 'concepts'],
    queryFn: () => graphService.getConcepts(),
  })
}

export function useConceptDetail(topic: string | null) {
  return useQuery<GraphNode>({
    queryKey: ['graph', 'concept', topic],
    queryFn: () => graphService.getConceptDetail(topic!),
    enabled: !!topic,
  })
}
