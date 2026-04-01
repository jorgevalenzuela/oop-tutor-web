import axios from 'axios'

const BASE_URL = 'http://localhost:3002'

// Token injected per-call from AuthContext
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

function headers() {
  return authToken
    ? { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await axios.post<T>(`${BASE_URL}${path}`, body, { headers: headers() })
  return res.data
}

async function get<T>(path: string): Promise<T> {
  const res = await axios.get<T>(`${BASE_URL}${path}`, { headers: headers() })
  return res.data
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  role: string
}

export interface ExamInstance {
  id: string
  student_id: string
  attempt_number: number
  difficulty_range: string
  status: string
  started_at: string
  completed_at: string | null
  time_taken_seconds: number | null
  overall_score: number | null
  mastery_achieved: number
}

export interface ExamQuestion {
  id: string
  concept: string
  type: 'MULTIPLE_CHOICE' | 'FREE_FORM' | 'CODE_WRITING' | 'CONCEPT_MATCHING'
  difficulty: 1 | 2 | 3
  question_text: string
  options: string | null
}

export interface ExamQuestionMeta {
  id: string
  concept: string
  type: string
  difficulty: number
}

export interface StartExamResponse {
  exam: ExamInstance
  questions: ExamQuestionMeta[]
  firstQuestion: ExamQuestion
}

export interface AnswerResult {
  score: number
  feedback: string
  isCorrect: boolean
  masteryAchieved: boolean
}

export interface ConceptMastery {
  id: string
  concept: string
  average_score: number
  consecutive_correct: number
  total_attempts: number
  mastery_achieved: number
  mastery_achieved_at: string | null
  last_attempted_at: string | null
}

export interface ExamSummaryAnswer {
  id: string
  question_id: string
  answer_given: string
  ai_score: number | null
  ai_feedback: string | null
  is_correct: number | null
  question: ExamQuestion
}

export interface ExamSummary extends ExamInstance {
  answers: ExamSummaryAnswer[]
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const assessmentApi = {
  async requestCode(email: string): Promise<void> {
    await post('/api/auth/request-code', { email })
  },

  async verifyCode(email: string, code: string): Promise<{ user: AuthUser; token: string }> {
    return post('/api/auth/verify-code', { email, code })
  },

  async logout(): Promise<void> {
    await post('/api/auth/logout')
  },

  async startExam(): Promise<StartExamResponse> {
    return post('/api/exam/start')
  },

  async getQuestion(examId: string, index: number): Promise<ExamQuestion> {
    return get(`/api/exam/${examId}/question/${index}`)
  },

  async submitAnswer(
    examId: string,
    questionId: string,
    answerGiven: string,
    timeOnQuestionSeconds?: number
  ): Promise<AnswerResult> {
    return post(`/api/exam/${examId}/answer`, { questionId, answerGiven, timeOnQuestionSeconds })
  },

  async completeExam(examId: string): Promise<ExamSummary> {
    return post(`/api/exam/${examId}/complete`)
  },

  async abandonExam(examId: string): Promise<void> {
    await post(`/api/exam/${examId}/abandon`)
  },

  async getHistory(): Promise<ExamInstance[]> {
    return get('/api/exam/history')
  },

  async getMastery(): Promise<ConceptMastery[]> {
    return get('/api/exam/mastery')
  },

  async getActiveExam(): Promise<{ exam: ExamInstance; questions: ExamQuestionMeta[] } | null> {
    return get('/api/exam/active')
  },
}
