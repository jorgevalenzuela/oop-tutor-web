import { FileJson, Trash2, Loader2 } from 'lucide-react'
import { useDocuments, useDeleteDocument } from '@/hooks/useDocumentUpload'

export default function DocumentList() {
  const { data: documents, isLoading, error } = useDocuments()
  const deleteMutation = useDeleteDocument()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm py-4">
        Error loading documents: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-4 text-center">
        No documents uploaded yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileJson className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-gray-900 text-sm">{doc.filename}</p>
              <p className="text-xs text-gray-500">
                {doc.topic_count} topics • {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => deleteMutation.mutate(doc.id)}
            disabled={deleteMutation.isPending}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
