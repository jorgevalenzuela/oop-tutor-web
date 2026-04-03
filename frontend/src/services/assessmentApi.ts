import axios from 'axios'

const BASE_URL = 'http://localhost:3002'

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

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await axios.put<T>(`${BASE_URL}${path}`, body, { headers: headers() })
  return res.data
}

async function del<T>(path: string): Promise<T> {
  const res = await axios.delete<T>(`${BASE_URL}${path}`, { headers: headers() })
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
  continued_after_mastery: number
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
  examShouldStop: boolean
  conceptsMastered: string[]
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

export interface ExamStatusReport {
  exam: ExamInstance
  questionsTotal: number
  questionsAnswered: number
  conceptsMastered: string[]
  conceptsInExam: string[]
}

export interface ProgressReport {
  concepts_mastered: ConceptMastery[]
  concepts_close: ConceptMastery[]
  concepts_struggling: ConceptMastery[]
  overall_mastery_pct: number
  exam_count: number
  best_score: number | null
  last_attempt_at: string | null
  total_time_seconds: number
}

export interface MasteryConfig {
  concept: string
  score_threshold: number
  consecutive_required: number
  required_for_cert: number
  is_default?: boolean
}

export interface ConceptScore {
  id: string
  certificate_id: string
  concept: string
  score: number
  mastery_achieved: number
  struggled: number
}

export interface Certificate {
  id: string
  student_id: string
  issued_at: string
  issued_by: string
  course_name: string
  total_time_taken_seconds: number | null
  pdf_path: string | null
  is_revoked: number
  verification_code: string
  concept_scores: ConceptScore[]
  student_name: string
}

export interface CertEligibility {
  eligible: boolean
  conceptsMastered: number
  conceptsRequired: number
  remainingConcepts: string[]
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const assessmentApi = {
  // Auth
  async requestCode(email: string): Promise<void> {
    await post('/api/auth/request-code', { email })
  },
  async verifyCode(email: string, code: string): Promise<{ user: AuthUser; token: string }> {
    return post('/api/auth/verify-code', { email, code })
  },
  async logout(): Promise<void> {
    await post('/api/auth/logout')
  },

  // Exam
  async startExam(): Promise<StartExamResponse> {
    return post('/api/exam/start')
  },
  async getQuestion(examId: string, index: number): Promise<ExamQuestion> {
    return get(`/api/exam/${examId}/question/${index}`)
  },
  async getExamStatus(examId: string): Promise<ExamStatusReport> {
    return get(`/api/exam/${examId}/status`)
  },
  async submitAnswer(
    examId: string,
    questionId: string,
    answerGiven: string,
    timeOnQuestionSeconds?: number,
    continuedAfterMastery?: boolean
  ): Promise<AnswerResult> {
    return post(`/api/exam/${examId}/answer`, { questionId, answerGiven, timeOnQuestionSeconds, continuedAfterMastery })
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
  async getProgress(): Promise<ProgressReport> {
    return get('/api/exam/progress')
  },
  async getActiveExam(): Promise<{ exam: ExamInstance; questions: ExamQuestionMeta[] } | null> {
    return get('/api/exam/active')
  },

  // Mastery config (instructor)
  async listMasteryConfigs(): Promise<MasteryConfig[]> {
    return get('/api/mastery-config')
  },
  async getMasteryConfig(concept: string): Promise<MasteryConfig> {
    return get(`/api/mastery-config/${encodeURIComponent(concept)}`)
  },
  async saveMasteryConfig(
    concept: string,
    scoreThreshold: number,
    consecutiveRequired: number,
    requiredForCert: boolean
  ): Promise<MasteryConfig> {
    return put(`/api/mastery-config/${encodeURIComponent(concept)}`, {
      scoreThreshold, consecutiveRequired, requiredForCert,
    })
  },
  async resetMasteryConfig(concept: string): Promise<void> {
    await del(`/api/mastery-config/${encodeURIComponent(concept)}`)
  },

  // Certificates
  async getCertEligibility(): Promise<CertEligibility> {
    return get('/api/certificates/eligibility')
  },
  async getMyCertificate(): Promise<Certificate | null> {
    return get('/api/certificates/mine')
  },
  async generateCertificate(): Promise<Certificate> {
    return post('/api/certificates/generate')
  },
  async downloadCertificate(): Promise<void> {
    const res = await axios.get(`${BASE_URL}/api/certificates/mine/download`, {
      headers: headers(),
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'oop-certificate.pdf'
    a.click()
    URL.revokeObjectURL(url)
  },
  async verifyCertificate(code: string): Promise<Certificate> {
    return get(`/api/certificates/verify/${encodeURIComponent(code)}`)
  },
}
