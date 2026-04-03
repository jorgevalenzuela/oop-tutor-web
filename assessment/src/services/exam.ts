import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { gradeAnswer } from './ai';
import {
  ExamInstance,
  ExamSummary,
  StudentAnswer,
  ConceptMastery,
  MasteryConfig,
  Question,
  DifficultyRange,
  GradingResult,
  SubmitAnswerBody,
  AnswerResponse,
  ExamStatusReport,
  ProgressReport,
} from '../types';

const DEFAULT_SCORE_THRESHOLD = 0.8;
const DEFAULT_CONSECUTIVE_REQUIRED = 3;

// ─── Mastery config helpers ──────────────────────────────────────────────────

function getMasteryConfig(concept: string): { scoreThreshold: number; consecutiveRequired: number } {
  const cfg = db.prepare('SELECT * FROM mastery_configs WHERE concept = ?').get(concept) as MasteryConfig | undefined;
  return {
    scoreThreshold: cfg?.score_threshold ?? DEFAULT_SCORE_THRESHOLD,
    consecutiveRequired: cfg?.consecutive_required ?? DEFAULT_CONSECUTIVE_REQUIRED,
  };
}

// ─── Difficulty Mapping ──────────────────────────────────────────────────────

function getDifficultyRange(attemptNumber: number): DifficultyRange {
  if (attemptNumber === 1) return 'L1';
  if (attemptNumber === 2) return 'L1-2';
  if (attemptNumber <= 5) return 'ALL';
  if (attemptNumber <= 8) return 'L2-3';
  return 'L3';
}

function getDifficultyLevels(range: DifficultyRange): number[] {
  switch (range) {
    case 'L1': return [1];
    case 'L1-2': return [1, 2];
    case 'ALL': return [1, 2, 3];
    case 'L2-3': return [2, 3];
    case 'L3': return [3];
  }
}

// ─── Question Selection ──────────────────────────────────────────────────────

function selectExamQuestions(_studentId: string, difficultyRange: DifficultyRange): Question[] {
  const levels = getDifficultyLevels(difficultyRange);
  const placeholders = levels.map(() => '?').join(',');

  const questions = db.prepare(`
    SELECT q.*
    FROM questions q
    JOIN question_approvals qa ON qa.question_id = q.id
    WHERE qa.status = 'APPROVED'
      AND q.difficulty IN (${placeholders})
    ORDER BY RANDOM()
    LIMIT 10
  `).all(...levels) as Question[];

  if (questions.length < 10) {
    throw new Error(`Not enough approved questions for difficulty range ${difficultyRange}. Found ${questions.length}, need 10.`);
  }

  return questions;
}

// ─── Exam Lifecycle ──────────────────────────────────────────────────────────

export function startExam(studentId: string): {
  exam: ExamInstance;
  questions: { id: string; concept: string; type: string; difficulty: number }[];
  firstQuestion: Question;
} {
  const { cnt } = db.prepare(
    'SELECT COUNT(*) as cnt FROM exam_instances WHERE student_id = ?'
  ).get(studentId) as { cnt: number };

  const attemptNumber = cnt + 1;
  const difficultyRange = getDifficultyRange(attemptNumber);
  const questions = selectExamQuestions(studentId, difficultyRange);

  const examId = uuidv4();

  db.prepare(`
    INSERT INTO exam_instances (id, student_id, attempt_number, difficulty_range, status, started_at, mastery_achieved, continued_after_mastery)
    VALUES (?, ?, ?, ?, 'IN_PROGRESS', datetime('now'), 0, 0)
  `).run(examId, studentId, attemptNumber, difficultyRange);

  for (const q of questions) {
    db.prepare(`
      INSERT INTO student_answers (id, exam_id, question_id, answer_given, answered_at)
      VALUES (?, ?, ?, '__PENDING__', datetime('now'))
    `).run(uuidv4(), examId, q.id);
  }

  const exam = db.prepare('SELECT * FROM exam_instances WHERE id = ?').get(examId) as ExamInstance;

  return {
    exam,
    questions: questions.map(q => ({ id: q.id, concept: q.concept, type: q.type, difficulty: q.difficulty })),
    firstQuestion: stripSensitiveFields(questions[0]),
  };
}

function stripSensitiveFields(q: Question): Question {
  const { correct_answer, grading_rubric, ai_grading_prompt, ...safe } = q;
  void correct_answer; void grading_rubric; void ai_grading_prompt;
  return safe as Question;
}

export function getExamQuestion(examId: string, studentId: string, questionIndex: number): Question {
  const exam = db.prepare(
    "SELECT * FROM exam_instances WHERE id = ? AND student_id = ? AND status = 'IN_PROGRESS'"
  ).get(examId, studentId) as ExamInstance | undefined;

  if (!exam) throw new Error('Exam not found or not in progress');

  const answers = db.prepare(
    'SELECT question_id FROM student_answers WHERE exam_id = ? ORDER BY rowid'
  ).all(examId) as { question_id: string }[];

  if (questionIndex < 0 || questionIndex >= answers.length) {
    throw new Error('Question index out of range');
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(answers[questionIndex].question_id) as Question;
  return stripSensitiveFields(question);
}

export function getExamStatus(examId: string, studentId: string): ExamStatusReport {
  const exam = db.prepare(
    "SELECT * FROM exam_instances WHERE id = ? AND student_id = ?"
  ).get(examId, studentId) as ExamInstance | undefined;

  if (!exam) throw new Error('Exam not found');

  const rows = db.prepare(`
    SELECT q.concept, sa.answer_given
    FROM student_answers sa
    JOIN questions q ON q.id = sa.question_id
    WHERE sa.exam_id = ?
    ORDER BY sa.rowid
  `).all(examId) as { concept: string; answer_given: string }[];

  const answeredCount = rows.filter(r => r.answer_given !== '__PENDING__').length;
  const conceptsInExam = [...new Set(rows.map(r => r.concept))];

  const masteredInExam = conceptsInExam.filter(concept => {
    const m = db.prepare(
      'SELECT mastery_achieved FROM concept_mastery WHERE student_id = ? AND concept = ?'
    ).get(studentId, concept) as { mastery_achieved: number } | undefined;
    return m?.mastery_achieved === 1;
  });

  return {
    exam,
    questionsTotal: rows.length,
    questionsAnswered: answeredCount,
    conceptsMastered: masteredInExam,
    conceptsInExam,
  };
}

export async function submitAnswer(
  examId: string,
  studentId: string,
  body: SubmitAnswerBody
): Promise<AnswerResponse> {
  const exam = db.prepare(
    "SELECT * FROM exam_instances WHERE id = ? AND student_id = ? AND status = 'IN_PROGRESS'"
  ).get(examId, studentId) as ExamInstance | undefined;

  if (!exam) throw new Error('Exam not found or not in progress');

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(body.questionId) as Question | undefined;
  if (!question) throw new Error('Question not found');

  const belongs = db.prepare(
    "SELECT id FROM student_answers WHERE exam_id = ? AND question_id = ? AND answer_given = '__PENDING__'"
  ).get(examId, body.questionId);
  if (!belongs) throw new Error('Question does not belong to this exam or already answered');

  const result = await gradeAnswer(question, body.answerGiven);

  db.prepare(`
    UPDATE student_answers
    SET answer_given = ?,
        ai_score = ?,
        ai_feedback = ?,
        is_correct = ?,
        time_on_question_seconds = ?,
        answered_at = datetime('now')
    WHERE exam_id = ? AND question_id = ? AND answer_given = '__PENDING__'
  `).run(
    body.answerGiven, result.score, result.feedback, result.isCorrect ? 1 : 0,
    body.timeOnQuestionSeconds ?? null, examId, body.questionId
  );

  // Track if student chose to continue past mastery
  if (body.continuedAfterMastery) {
    db.prepare('UPDATE exam_instances SET continued_after_mastery = 1 WHERE id = ?').run(examId);
  }

  const { masteryAchieved } = updateConceptMastery(studentId, question.concept, result);

  // Check if ALL concepts in this exam are now mastered
  const status = getExamStatus(examId, studentId);
  const examShouldStop = status.conceptsInExam.length > 0 &&
    status.conceptsMastered.length === status.conceptsInExam.length;

  return {
    ...result,
    masteryAchieved,
    examShouldStop,
    conceptsMastered: status.conceptsMastered,
  };
}

function updateConceptMastery(
  studentId: string,
  concept: string,
  result: GradingResult
): { masteryAchieved: boolean } {
  const { scoreThreshold, consecutiveRequired } = getMasteryConfig(concept);

  const existing = db.prepare(
    'SELECT * FROM concept_mastery WHERE student_id = ? AND concept = ?'
  ).get(studentId, concept) as ConceptMastery | undefined;

  if (!existing) {
    const newConsecutive = result.isCorrect ? 1 : 0;
    const alreadyMastered = result.score >= scoreThreshold && newConsecutive >= consecutiveRequired ? 1 : 0;
    db.prepare(`
      INSERT INTO concept_mastery (id, student_id, concept, average_score, consecutive_correct, total_attempts, mastery_achieved, mastery_achieved_at, last_attempted_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      uuidv4(), studentId, concept, result.score, newConsecutive,
      alreadyMastered,
      alreadyMastered ? new Date().toISOString() : null
    );
    return { masteryAchieved: alreadyMastered === 1 };
  }

  const newTotal = existing.total_attempts + 1;
  const newAverage = (existing.average_score * existing.total_attempts + result.score) / newTotal;
  const newConsecutive = result.isCorrect ? existing.consecutive_correct + 1 : 0;
  const alreadyMastered = existing.mastery_achieved === 1;
  const nowMastered = !alreadyMastered && newAverage >= scoreThreshold && newConsecutive >= consecutiveRequired;

  db.prepare(`
    UPDATE concept_mastery
    SET average_score = ?,
        consecutive_correct = ?,
        total_attempts = ?,
        mastery_achieved = ?,
        mastery_achieved_at = COALESCE(mastery_achieved_at, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END),
        last_attempted_at = datetime('now')
    WHERE student_id = ? AND concept = ?
  `).run(
    newAverage, newConsecutive, newTotal,
    nowMastered || alreadyMastered ? 1 : 0,
    nowMastered ? 1 : 0,
    studentId, concept
  );

  return { masteryAchieved: nowMastered };
}

export function completeExam(examId: string, studentId: string): ExamSummary {
  const exam = db.prepare(
    "SELECT * FROM exam_instances WHERE id = ? AND student_id = ? AND status = 'IN_PROGRESS'"
  ).get(examId, studentId) as ExamInstance | undefined;

  if (!exam) throw new Error('Exam not found or not in progress');

  const answers = db.prepare(
    'SELECT * FROM student_answers WHERE exam_id = ? ORDER BY rowid'
  ).all(examId) as StudentAnswer[];

  const gradedAnswers = answers.filter(a => a.answer_given !== '__PENDING__');
  const totalScore = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum, a) => sum + (a.ai_score ?? 0), 0) / gradedAnswers.length
    : 0;

  const timeTaken = Math.round((Date.now() - new Date(exam.started_at.replace(' ', 'T') + 'Z').getTime()) / 1000);

  db.prepare(`
    UPDATE exam_instances
    SET status = 'COMPLETED',
        completed_at = datetime('now'),
        overall_score = ?,
        time_taken_seconds = ?,
        mastery_achieved = CASE WHEN ? >= 0.8 THEN 1 ELSE 0 END
    WHERE id = ?
  `).run(totalScore, timeTaken, totalScore, examId);

  return buildExamSummary(examId);
}

export function abandonExam(examId: string, studentId: string): void {
  db.prepare(
    "UPDATE exam_instances SET status = 'ABANDONED' WHERE id = ? AND student_id = ? AND status = 'IN_PROGRESS'"
  ).run(examId, studentId);
}

function buildExamSummary(examId: string): ExamSummary {
  const exam = db.prepare('SELECT * FROM exam_instances WHERE id = ?').get(examId) as ExamInstance;

  const answers = db.prepare(
    'SELECT sa.*, q.question_text, q.concept, q.type, q.difficulty, q.correct_answer FROM student_answers sa JOIN questions q ON q.id = sa.question_id WHERE sa.exam_id = ? ORDER BY sa.rowid'
  ).all(examId) as (StudentAnswer & Question)[];

  return {
    ...exam,
    answers: answers.map(a => ({
      id: a.id,
      exam_id: a.exam_id,
      question_id: a.question_id,
      answer_given: a.answer_given,
      ai_score: a.ai_score,
      ai_feedback: a.ai_feedback,
      is_correct: a.is_correct,
      time_on_question_seconds: a.time_on_question_seconds,
      answered_at: a.answered_at,
      question: {
        id: a.question_id,
        question_text: (a as any).question_text,
        concept: (a as any).concept,
        type: (a as any).type,
        difficulty: (a as any).difficulty,
        correct_answer: (a as any).correct_answer,
      } as Question,
    })),
  };
}

export function getProgress(studentId: string): ProgressReport {
  const allMastery = db.prepare(
    'SELECT * FROM concept_mastery WHERE student_id = ? ORDER BY concept ASC'
  ).all(studentId) as ConceptMastery[];

  const exams = db.prepare(
    "SELECT * FROM exam_instances WHERE student_id = ? AND status = 'COMPLETED' ORDER BY started_at DESC"
  ).all(studentId) as ExamInstance[];

  const mastered = allMastery.filter(m => m.mastery_achieved === 1);
  const close = allMastery.filter(m => m.mastery_achieved === 0 && m.average_score >= 0.5);
  const struggling = allMastery.filter(m => m.mastery_achieved === 0 && m.average_score < 0.5);

  const totalRequired = db.prepare(
    "SELECT COUNT(DISTINCT concept) as cnt FROM mastery_configs WHERE required_for_cert = 1"
  ).get() as { cnt: number };

  const requiredCount = totalRequired.cnt || 10; // fallback to 10 if no configs set
  const overallPct = Math.round((mastered.length / requiredCount) * 100);

  const totalTime = exams.reduce((sum, e) => sum + (e.time_taken_seconds ?? 0), 0);
  const bestScore = exams.length > 0 ? Math.max(...exams.map(e => e.overall_score ?? 0)) : null;

  return {
    concepts_mastered: mastered,
    concepts_close: close,
    concepts_struggling: struggling,
    overall_mastery_pct: Math.min(100, overallPct),
    exam_count: exams.length,
    best_score: bestScore,
    last_attempt_at: exams[0]?.started_at ?? null,
    total_time_seconds: totalTime,
  };
}

export function getExamHistory(studentId: string): ExamInstance[] {
  return db.prepare(
    "SELECT * FROM exam_instances WHERE student_id = ? AND status != 'IN_PROGRESS' ORDER BY started_at DESC"
  ).all(studentId) as ExamInstance[];
}

export function getConceptMastery(studentId: string): ConceptMastery[] {
  return db.prepare(
    'SELECT * FROM concept_mastery WHERE student_id = ? ORDER BY concept ASC'
  ).all(studentId) as ConceptMastery[];
}

export function getActiveExam(studentId: string): ExamInstance | null {
  return db.prepare(
    "SELECT * FROM exam_instances WHERE student_id = ? AND status = 'IN_PROGRESS' ORDER BY started_at DESC LIMIT 1"
  ).get(studentId) as ExamInstance | null;
}

export function getExamQuestions(examId: string): { id: string; concept: string; type: string; difficulty: number }[] {
  return db.prepare(`
    SELECT q.id, q.concept, q.type, q.difficulty
    FROM student_answers sa
    JOIN questions q ON q.id = sa.question_id
    WHERE sa.exam_id = ?
    ORDER BY sa.rowid
  `).all(examId) as { id: string; concept: string; type: string; difficulty: number }[];
}
