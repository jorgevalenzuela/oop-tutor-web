import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { TutorFeedback, FeedbackSummary, FeedbackConfig } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG_ID = 'singleton';

export function getConfig(): FeedbackConfig {
  let cfg = db.prepare("SELECT * FROM feedback_config WHERE id = ?").get(DEFAULT_CONFIG_ID) as FeedbackConfig | undefined;
  if (!cfg) {
    db.prepare(`
      INSERT OR IGNORE INTO feedback_config (id, tutor_feedback_enabled, exam_feedback_enabled, discussion_enabled, notification_email)
      VALUES (?, 1, 1, 1, '')
    `).run(DEFAULT_CONFIG_ID);
    cfg = db.prepare("SELECT * FROM feedback_config WHERE id = ?").get(DEFAULT_CONFIG_ID) as FeedbackConfig;
  }
  return cfg;
}

export function updateConfig(
  tutorFeedbackEnabled: boolean,
  examFeedbackEnabled: boolean,
  discussionEnabled: boolean,
  notificationEmail: string,
  updatedBy: string
): FeedbackConfig {
  getConfig(); // ensure row exists
  db.prepare(`
    UPDATE feedback_config SET
      tutor_feedback_enabled = ?,
      exam_feedback_enabled = ?,
      discussion_enabled = ?,
      notification_email = ?,
      updated_by = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    tutorFeedbackEnabled ? 1 : 0,
    examFeedbackEnabled ? 1 : 0,
    discussionEnabled ? 1 : 0,
    notificationEmail,
    updatedBy,
    DEFAULT_CONFIG_ID
  );
  return getConfig();
}

// ─── Submit feedback ──────────────────────────────────────────────────────────

export function submitTutorFeedback(
  studentId: string,
  concept: string,
  rating: number,
  comment?: string
): TutorFeedback {
  const cfg = getConfig();
  if (!cfg.tutor_feedback_enabled) throw Object.assign(new Error('Tutor feedback is disabled'), { status: 403 });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tutor_feedback (id, student_id, feedback_type, reference_id, rating, comment)
    VALUES (?, ?, 'TUTOR_RESPONSE', ?, ?, ?)
  `).run(id, studentId, concept, rating, comment ?? null);
  return db.prepare("SELECT * FROM tutor_feedback WHERE id = ?").get(id) as TutorFeedback;
}

export function submitQuestionFeedback(
  studentId: string,
  questionId: string,
  rating: number,
  comment?: string
): TutorFeedback {
  const cfg = getConfig();
  if (!cfg.exam_feedback_enabled) throw Object.assign(new Error('Exam feedback is disabled'), { status: 403 });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tutor_feedback (id, student_id, feedback_type, reference_id, rating, comment)
    VALUES (?, ?, 'EXAM_QUESTION', ?, ?, ?)
  `).run(id, studentId, questionId, rating, comment ?? null);
  return db.prepare("SELECT * FROM tutor_feedback WHERE id = ?").get(id) as TutorFeedback;
}

// ─── Summary (instructor) ─────────────────────────────────────────────────────

export function getFeedbackSummary(): FeedbackSummary {
  const tutorRows = db.prepare(`
    SELECT reference_id,
           AVG(rating) as avg_rating,
           COUNT(*) as count
    FROM tutor_feedback WHERE feedback_type = 'TUTOR_RESPONSE'
    GROUP BY reference_id
    ORDER BY avg_rating ASC
  `).all() as { reference_id: string; avg_rating: number; count: number }[];

  const questionRows = db.prepare(`
    SELECT reference_id,
           AVG(rating) as avg_rating,
           COUNT(*) as count
    FROM tutor_feedback WHERE feedback_type = 'EXAM_QUESTION'
    GROUP BY reference_id
    ORDER BY avg_rating ASC
  `).all() as { reference_id: string; avg_rating: number; count: number }[];

  function withComments(rows: typeof tutorRows, type: 'TUTOR_RESPONSE' | 'EXAM_QUESTION') {
    return rows.map(r => {
      const comments = (db.prepare(
        "SELECT comment FROM tutor_feedback WHERE feedback_type = ? AND reference_id = ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 10"
      ).all(type, r.reference_id) as { comment: string }[]).map(c => c.comment);
      return { ...r, comments };
    });
  }

  return {
    tutor: withComments(tutorRows, 'TUTOR_RESPONSE'),
    flagged_questions: withComments(questionRows, 'EXAM_QUESTION'),
  };
}
