import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { generateQuestions } from './ai';
import {
  Question,
  QuestionApproval,
  QuestionWithApproval,
  CreateQuestionBody,
  GenerateQuestionsBody,
  UpdateQuestionBody,
  ApprovalStatus,
  QuestionType,
} from '../types';

interface ListFilters {
  concept?: string;
  type?: QuestionType;
  difficulty?: number;
  status?: ApprovalStatus;
}

export function listQuestions(filters: ListFilters): QuestionWithApproval[] {
  let query = `
    SELECT q.*, qa.status, qa.generated_by_ai, qa.approved_by, qa.reviewed_at, qa.review_notes
    FROM questions q
    JOIN question_approvals qa ON qa.question_id = q.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters.concept) {
    query += ' AND q.concept = ?';
    params.push(filters.concept);
  }
  if (filters.type) {
    query += ' AND q.type = ?';
    params.push(filters.type);
  }
  if (filters.difficulty !== undefined) {
    query += ' AND q.difficulty = ?';
    params.push(filters.difficulty);
  }
  if (filters.status) {
    query += ' AND qa.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY q.created_at DESC';
  return db.prepare(query).all(...params) as QuestionWithApproval[];
}

export function getQuestion(id: string): QuestionWithApproval | null {
  return db.prepare(`
    SELECT q.*, qa.status, qa.generated_by_ai, qa.approved_by, qa.reviewed_at, qa.review_notes
    FROM questions q
    JOIN question_approvals qa ON qa.question_id = q.id
    WHERE q.id = ?
  `).get(id) as QuestionWithApproval | null;
}

export function createQuestion(
  body: CreateQuestionBody,
  generatedByAi = false
): QuestionWithApproval {
  const id = uuidv4();
  const approvalId = uuidv4();
  const optionsJson = body.options ? JSON.stringify(body.options) : null;

  db.prepare(`
    INSERT INTO questions (id, concept, type, difficulty, question_text, options, correct_answer, grading_rubric, ai_grading_prompt, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, body.concept, body.type, body.difficulty, body.question_text, optionsJson, body.correct_answer, body.grading_rubric, body.ai_grading_prompt);

  db.prepare(`
    INSERT INTO question_approvals (id, question_id, status, generated_by_ai)
    VALUES (?, ?, 'PENDING_REVIEW', ?)
  `).run(approvalId, id, generatedByAi ? 1 : 0);

  return getQuestion(id) as QuestionWithApproval;
}

export async function generateAndSaveQuestions(
  body: GenerateQuestionsBody
): Promise<QuestionWithApproval[]> {
  const { concept, type, difficulty, count } = body;

  if (count < 1 || count > 10) {
    throw new Error('count must be between 1 and 10');
  }

  const generated = await generateQuestions(concept, type, difficulty, count);

  const saved: QuestionWithApproval[] = [];
  for (const q of generated) {
    const created = createQuestion(
      {
        concept,
        type,
        difficulty,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        grading_rubric: q.grading_rubric,
        ai_grading_prompt: q.ai_grading_prompt,
      },
      true
    );
    saved.push(created);
  }

  return saved;
}

export function updateQuestion(
  id: string,
  body: UpdateQuestionBody
): QuestionWithApproval | null {
  const existing = getQuestion(id);
  if (!existing) return null;

  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.concept !== undefined) { fields.push('concept = ?'); params.push(body.concept); }
  if (body.type !== undefined) { fields.push('type = ?'); params.push(body.type); }
  if (body.difficulty !== undefined) { fields.push('difficulty = ?'); params.push(body.difficulty); }
  if (body.question_text !== undefined) { fields.push('question_text = ?'); params.push(body.question_text); }
  if (body.options !== undefined) { fields.push('options = ?'); params.push(JSON.stringify(body.options)); }
  if (body.correct_answer !== undefined) { fields.push('correct_answer = ?'); params.push(body.correct_answer); }
  if (body.grading_rubric !== undefined) { fields.push('grading_rubric = ?'); params.push(body.grading_rubric); }
  if (body.ai_grading_prompt !== undefined) { fields.push('ai_grading_prompt = ?'); params.push(body.ai_grading_prompt); }

  if (fields.length > 0) {
    params.push(id);
    db.prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  return getQuestion(id);
}

export function setApprovalStatus(
  questionId: string,
  status: ApprovalStatus,
  approvedBy: string,
  reviewNotes?: string
): QuestionWithApproval | null {
  const existing = getQuestion(questionId);
  if (!existing) return null;

  db.prepare(`
    UPDATE question_approvals
    SET status = ?, approved_by = ?, reviewed_at = datetime('now'), review_notes = ?
    WHERE question_id = ?
  `).run(status, approvedBy, reviewNotes ?? null, questionId);

  return getQuestion(questionId);
}

export function deactivateQuestion(questionId: string): QuestionWithApproval | null {
  return setApprovalStatus(questionId, 'INACTIVE', '');
}
