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

export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Question {
  id: string;
  concept: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  bloom_level: BloomLevel;
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
  bloom_level?: BloomLevel;
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
  bloomLevel?: BloomLevel;
  count: number;
}

export interface UpdateQuestionBody {
  concept?: string;
  type?: QuestionType;
  difficulty?: 1 | 2 | 3;
  bloom_level?: BloomLevel;
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
  min_bloom_level_for_mastery: number;
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

// ─── Feedback + Discussion types ─────────────────────────────────────────────

export interface TutorFeedback {
  id: string;
  student_id: string;
  feedback_type: 'TUTOR_RESPONSE' | 'EXAM_QUESTION';
  reference_id: string;
  rating: 1 | -1;
  comment: string | null;
  created_at: string;
}

export interface FeedbackSummaryItem {
  reference_id: string;
  avg_rating: number;
  count: number;
  comments: string[];
}

export interface FeedbackSummary {
  tutor: FeedbackSummaryItem[];
  flagged_questions: FeedbackSummaryItem[];
}

export interface DiscussionPost {
  id: string;
  student_id: string;
  concept: string;
  subject: string;
  body: string;
  is_resolved: number;
  created_at: string;
}

export interface DiscussionReply {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface DiscussionPostWithMeta extends DiscussionPost {
  author_name: string;
  reply_count: number;
}

export interface DiscussionThread extends DiscussionPost {
  author_name: string;
  replies: (DiscussionReply & { author_name: string })[];
}

export interface FeedbackConfig {
  id: string;
  tutor_feedback_enabled: number;
  exam_feedback_enabled: number;
  discussion_enabled: number;
  notification_email: string;
  updated_by: string | null;
  updated_at: string;
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

export interface BloomLevelStat {
  bloom_level: number;
  label: string;
  avg_score: number;
  attempt_count: number;
}

// ─── Socratic / skip types ────────────────────────────────────────────────────

export type SkipReason = 'time' | 'overwhelmed' | 'no_clue' | 'other' | 'dismissed';

export interface SkipEvent {
  id: string;
  student_id: string;
  concept: string;
  step_at_skip: number;
  skip_reason: SkipReason | null;
  created_at: string;
}

export interface SkipConceptStat {
  concept: string;
  skip_count: number;
  avg_step_at_skip: number;
}

export interface SkipReasonStat {
  reason: string | null;
  count: number;
}

export interface SkipStats {
  most_skipped_concepts: SkipConceptStat[];
  skip_reasons: SkipReasonStat[];
  avg_step_at_skip_by_concept: SkipConceptStat[];
}

export interface AnalyticsReport {
  total_students: number;
  students_with_cert: number;
  avg_mastery_pct: number;
  hardest_concepts: ConceptStat[];
  easiest_concepts: ConceptStat[];
  total_exams: number;
  avg_exam_score: number | null;
  bloom_stats: BloomLevelStat[];
  skip_stats: SkipStats;
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
