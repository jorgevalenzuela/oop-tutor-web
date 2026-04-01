import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DB_DIR, 'assessment.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT,
      font_size_preference INTEGER DEFAULT 14,
      dark_mode INTEGER DEFAULT 1,
      preferred_language TEXT DEFAULT 'en',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      concept TEXT NOT NULL,
      type TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      grading_rubric TEXT NOT NULL,
      ai_grading_prompt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_approvals (
      id TEXT PRIMARY KEY,
      question_id TEXT UNIQUE NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      generated_by_ai INTEGER NOT NULL DEFAULT 0,
      approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TEXT,
      review_notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_auth_codes_email_expires ON auth_codes(email, expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_questions_concept_difficulty ON questions(concept, difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON question_approvals(status);

    CREATE TABLE IF NOT EXISTS exam_instances (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attempt_number INTEGER NOT NULL,
      difficulty_range TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      time_taken_seconds INTEGER,
      overall_score REAL,
      mastery_achieved INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS student_answers (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exam_instances(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
      answer_given TEXT NOT NULL,
      ai_score REAL,
      ai_feedback TEXT,
      is_correct INTEGER,
      time_on_question_seconds INTEGER,
      answered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS concept_mastery (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept TEXT NOT NULL,
      average_score REAL NOT NULL DEFAULT 0,
      consecutive_correct INTEGER NOT NULL DEFAULT 0,
      total_attempts INTEGER NOT NULL DEFAULT 0,
      mastery_achieved INTEGER NOT NULL DEFAULT 0,
      mastery_achieved_at TEXT,
      last_attempted_at TEXT,
      UNIQUE(student_id, concept)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_student_attempt ON exam_instances(student_id, attempt_number);
    CREATE INDEX IF NOT EXISTS idx_exam_student_status ON exam_instances(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_answers_exam ON student_answers(exam_id);
    CREATE INDEX IF NOT EXISTS idx_answers_question ON student_answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_mastery_student_concept ON concept_mastery(student_id, concept);
    CREATE INDEX IF NOT EXISTS idx_mastery_achieved ON concept_mastery(mastery_achieved);
  `);
}

initializeSchema();

export default db;
