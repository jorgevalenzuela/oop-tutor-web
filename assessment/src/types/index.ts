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

// Express augmentation
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}
