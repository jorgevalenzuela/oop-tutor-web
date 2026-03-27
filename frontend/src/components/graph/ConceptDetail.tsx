import { X, Loader2 } from 'lucide-react'
import { useConceptDetail } from '@/hooks/useKnowledgeGraph'

interface ConceptDetailProps {
  topic: string
  onClose: () => void
}

export default function ConceptDetail({ topic, onClose }: ConceptDetailProps) {
  const { data: concept, isLoading, error } = useConceptDetail(topic)

  return (
    <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-lg border overflow-hidden max-h-[calc(100%-32px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 truncate">{topic}</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="p-4 overflow-y-auto max-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm">
            Error loading concept details
          </div>
        ) : concept ? (
          <div className="space-y-4">
            {concept.level && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Level</span>
                <p className="text-sm text-gray-900">{concept.level}</p>
              </div>
            )}

            {concept.definition && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Definition</span>
                <p className="text-sm text-gray-700">{concept.definition}</p>
              </div>
            )}

            {(concept as any).content && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Content</span>
                <p className="text-sm text-gray-700">{(concept as any).content}</p>
              </div>
            )}

            {(concept as any).key_concepts?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Key Concepts</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(concept as any).key_concepts.map((kc: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                      {kc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(concept as any).related_topics?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Related Topics</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(concept as any).related_topics.map((rt: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                      {rt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(concept as any).learning_goal && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Learning Goal</span>
                <p className="text-sm text-gray-700">{(concept as any).learning_goal}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center py-4">
            No details available for this concept.
          </div>
        )}
      </div>
    </div>
  )
}
