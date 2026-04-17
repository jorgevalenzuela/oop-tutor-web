import axios from 'axios'

const TUTOR_URL = 'http://localhost:8000'
const ASSESSMENT_URL = 'http://localhost:3002'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SocraticReward {
  english: string
  oop: string
  csharp: string
  uml?: string  // present on skip (full 4-pane); absent on dialogue completion (3-pane, Phase 1)
}

export interface SocraticChatResponse {
  message: string
  step: number
  tone: string
  is_complete: boolean
  reward?: SocraticReward
  related_concept?: string | null
  exam_nudge?: string | null
}

export type SkipReason = 'time' | 'overwhelmed' | 'no_clue' | 'other' | 'dismissed'

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Send a student message (or empty string for the step-1 opener) to the
 * Socratic dialogue endpoint.
 */
export async function sendSocraticMessage(
  concept: string,
  step: number,
  bloomLevel: number,
  history: ChatMessage[],
  studentMessage: string,
): Promise<SocraticChatResponse> {
  const res = await axios.post<SocraticChatResponse>(`${TUTOR_URL}/api/socratic/chat`, {
    concept,
    step,
    bloom_level: bloomLevel,
    history,
    student_message: studentMessage,
  })
  return res.data
}

/**
 * Log a skip event to the assessment service.
 * token is the student's auth token.
 */
export async function logSocraticSkip(
  concept: string,
  stepAtSkip: number,
  reason: SkipReason | null,
  token: string,
): Promise<void> {
  await axios.post(
    `${ASSESSMENT_URL}/api/socratic/skip`,
    { concept, stepAtSkip, skipReason: reason },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  )
}
