import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService, DocumentInfo } from '@/services/api'

export function useDocuments() {
  return useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: () => documentService.listDocuments(),
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => documentService.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
