import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface StructuredAnswer {
  english: string
  oop: string
  uml: string
  csharp: string
}

export interface QueryResponse {
  question: string
  answer: StructuredAnswer
  raw_response?: string
}

export interface GraphNode {
  id: string
  label: string
  topic: string
  level?: string
  subject?: string
  definition?: string
}

export interface GraphEdge {
  source: string
  target: string
  type: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface DocumentInfo {
  id: string
  filename: string
  created_at: string
  topic_count: number
}

export const queryService = {
  async submitQuery(question: string): Promise<QueryResponse> {
    const response = await api.post<QueryResponse>('/query', { question })
    return response.data
  },
}

export const graphService = {
  async getConcepts(): Promise<GraphResponse> {
    const response = await api.get<GraphResponse>('/graph/concepts')
    return response.data
  },

  async getConceptDetail(topic: string): Promise<GraphNode> {
    const response = await api.get<GraphNode>(`/graph/concept/${encodeURIComponent(topic)}`)
    return response.data
  },
}

export const documentService = {
  async listDocuments(): Promise<DocumentInfo[]> {
    const response = await api.get<DocumentInfo[]>('/documents')
    return response.data
  },

  async uploadDocument(file: File): Promise<{ status: string; count: number; message?: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`)
  },
}

export default api
