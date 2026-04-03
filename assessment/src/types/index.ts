export type Role = 'STUDENT' | 'INSTRUCTOR' | 'TA' | 'ADMIN';

export type QuestionType = 'MULTIPLE_CHOICE' | 'FREE_FORM' | 'CODE_WRITING' | 'CONCEPT_MATCHING';

export type ApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export interface User {
  id: string;
  email: string;
  role: Role;
  is_active: number;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  font_size_preference: number;
  dark_mode: number;
  preferred_language: string;
  updated_at: string;
}

export interface AuthCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  attempts: number;
  used: number;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface Question {
  id: string;
  concept: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  question_text: string;
  options: string | null;
  correct_answer: string;
  grading_rubric: string;
  ai_grading_prompt: string;
  created_at: string;
}

export interface QuestionApproval {
  id: string;
  question_id: string;
  status: ApprovalStatus;
  generated_by_ai: number;
  approved_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export interface QuestionWithApproval extends Question {
  status: ApprovalStatus;
  generated_by_ai: number;
  approved_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

// Request body types
export interface RequestCodeBody {
  email: string;
}

export interface VerifyCodeBody {
  email: string;
  code: string;
}

export interface CreateQuestionBody {
  concept: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  question_text: string;
  options?: string[];
  correct_answer: string;
  grading_rubric: string;
  ai_grading_prompt: string;
}

export interface GenerateQuestionsBody {
  concept: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  count: number;
}

export interface UpdateQuestionBody {
  concept?: string;
  type?: QuestionType;
  difficulty?: 1 | 2 | 3;
  question_text?: string;
  options?: string[];
  correct_answer?: string;
  grading_rubric?: string;
  ai_grading_prompt?: string;
}

export interface RejectQuestionBody {
  review_notes: string;
}

export type DifficultyRange = 'L1' | 'L1-2' | 'ALL' | 'L2-3' | 'L3';
export type ExamStatus = 'IN_PROGRESS' | 'COMPLETED' | 'INCOMPLETE' | 'ABANDONED';

export interface ExamInstance {
  id: string;
  student_id: string;
  attempt_number: number;
  difficulty_range: DifficultyRange;
  status: ExamStatus;
  started_at: string;
  completed_at: string | null;
  time_taken_seconds: number | null;
  overall_score: number | null;
  mastery_achieved: number;
}

export interface StudentAnswer {
  id: string;
  exam_id: string;
  question_id: string;
  answer_given: string;
  ai_score: number | null;
  ai_feedback: string | null;
  is_correct: number | null;
  time_on_question_seconds: number | null;
  answered_at: string;
}

export interface ConceptMastery {
  id: string;
  student_id: string;
  concept: string;
  average_score: number;
  consecutive_correct: number;
  total_attempts: number;
  mastery_achieved: number;
  mastery_achieved_at: string | null;
  last_attempted_at: string | null;
}

export interface GradingResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

export interface MasteryConfig {
  id: string;
  concept: string;
  score_threshold: number;
  consecutive_required: number;
  required_for_cert: number;
  created_by: string | null;
  updated_at: string;
}

export interface ProgressReport {
  concepts_mastered: ConceptMastery[];
  concepts_close: ConceptMastery[];
  concepts_struggling: ConceptMastery[];
  overall_mastery_pct: number;
  exam_count: number;
  best_score: number | null;
  last_attempt_at: string | null;
  total_time_seconds: number;
}

export interface SubmitAnswerBody {
  questionId: string;
  answerGiven: string;
  timeOnQuestionSeconds?: number;
  continuedAfterMastery?: boolean;
}

export interface AnswerResponse extends GradingResult {
  masteryAchieved: boolean;
  examShouldStop: boolean;
  conceptsMastered: string[];
}

export interface ExamStatusReport {
  exam: ExamInstance;
  questionsTotal: number;
  questionsAnswered: number;
  conceptsMastered: string[];
  conceptsInExam: string[];
}

export interface ExamSummary extends ExamInstance {
  answers: (StudentAnswer & { question: Question })[];
}

export interface Certificate {
  id: string;
  student_id: string;
  issued_at: string;
  issued_by: string;
  course_name: string;
  total_time_taken_seconds: number | null;
  pdf_path: string | null;
  is_revoked: number;
  verification_code: string;
}

export interface ConceptScore {
  id: string;
  certificate_id: string;
  concept: string;
  score: number;
  mastery_achieved: number;
  struggled: number;
}

export interface CertificateWithScores extends Certificate {
  concept_scores: ConceptScore[];
  student_name: string;
}

export interface CertEligibility {
  eligible: boolean;
  conceptsMastered: number;
  conceptsRequired: number;
  remainingConcepts: string[];
}

// ─── Instructor types ─────────────────────────────────────────────────────────

export interface StudentRow {
  id: string;
  email: string;
  display_name: string | null;
  mastery_pct: number;
  exam_count: number;
  last_exam_at: string | null;
  cert_status: 'none' | 'issued' | 'revoked';
}

export interface StudentDetail {
  id: string;
  email: string;
  display_name: string | null;
  mastery: ConceptMastery[];
  exams: ExamInstance[];
  cert_status: 'none' | 'issued' | 'revoked';
  certificate: CertificateWithScores | null;
}

export interface ConceptStat {
  concept: string;
  avg_score: number;
  attempt_count: number;
}

export interface AnalyticsReport {
  total_students: number;
  students_with_cert: number;
  avg_mastery_pct: number;
  hardest_concepts: ConceptStat[];
  easiest_concepts: ConceptStat[];
  total_exams: number;
  avg_exam_score: number | null;
}

// Express augmentation
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}
