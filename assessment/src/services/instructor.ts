import db from '../database';
import {
  StudentRow,
  StudentDetail,
  AnalyticsReport,
  BloomLevelStat,
  ConceptMastery,
  ExamInstance,
} from '../types';
import { getMyCertificate } from './certificate';

const TOTAL_CONCEPTS = 28;

// ─── Student list ─────────────────────────────────────────────────────────────

export function listStudents(
  sort: 'email' | 'mastery' | 'exams' | 'last_exam' = 'email',
  filter?: string
): StudentRow[] {
  const users = db.prepare(`
    SELECT u.id, u.email, p.display_name
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'STUDENT' AND u.is_active = 1
    ORDER BY u.email ASC
  `).all() as { id: string; email: string; display_name: string | null }[];

  const rows: StudentRow[] = users.map(u => {
    const masteredCount = (db.prepare(
      "SELECT COUNT(*) as n FROM concept_mastery WHERE student_id = ? AND mastery_achieved = 1"
    ).get(u.id) as { n: number }).n;

    const examCount = (db.prepare(
      "SELECT COUNT(*) as n FROM exam_instances WHERE student_id = ?"
    ).get(u.id) as { n: number }).n;

    const lastExam = db.prepare(
      "SELECT MAX(started_at) as last FROM exam_instances WHERE student_id = ?"
    ).get(u.id) as { last: string | null };

    const cert = db.prepare(
      "SELECT is_revoked FROM certificates WHERE student_id = ? ORDER BY issued_at DESC LIMIT 1"
    ).get(u.id) as { is_revoked: number } | undefined;

    const certStatus: StudentRow['cert_status'] = !cert
      ? 'none'
      : cert.is_revoked
      ? 'revoked'
      : 'issued';

    return {
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      mastery_pct: Math.round((masteredCount / TOTAL_CONCEPTS) * 100),
      exam_count: examCount,
      last_exam_at: lastExam.last,
      cert_status: certStatus,
    };
  });

  // Apply search filter
  const filtered = filter
    ? rows.filter(r =>
        r.email.toLowerCase().includes(filter.toLowerCase()) ||
        (r.display_name ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : rows;

  // Sort
  return filtered.sort((a, b) => {
    if (sort === 'mastery') return b.mastery_pct - a.mastery_pct;
    if (sort === 'exams') return b.exam_count - a.exam_count;
    if (sort === 'last_exam') {
      const da = a.last_exam_at ?? '';
      const db2 = b.last_exam_at ?? '';
      return db2.localeCompare(da);
    }
    return a.email.localeCompare(b.email);
  });
}

// ─── Student detail ───────────────────────────────────────────────────────────

export function getStudentDetail(studentId: string): StudentDetail | null {
  const user = db.prepare(
    "SELECT u.id, u.email, p.display_name FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?"
  ).get(studentId) as { id: string; email: string; display_name: string | null } | undefined;

  if (!user) return null;

  const mastery = db.prepare(
    "SELECT * FROM concept_mastery WHERE student_id = ? ORDER BY concept ASC"
  ).all(studentId) as ConceptMastery[];

  const exams = db.prepare(
    "SELECT * FROM exam_instances WHERE student_id = ? ORDER BY started_at DESC"
  ).all(studentId) as ExamInstance[];

  const cert = getMyCertificate(studentId);
  const certRow = db.prepare(
    "SELECT is_revoked FROM certificates WHERE student_id = ? ORDER BY issued_at DESC LIMIT 1"
  ).get(studentId) as { is_revoked: number } | undefined;

  const certStatus: StudentDetail['cert_status'] = !certRow
    ? 'none'
    : certRow.is_revoked
    ? 'revoked'
    : 'issued';

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    mastery,
    exams,
    cert_status: certStatus,
    certificate: cert,
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function getAnalytics(): AnalyticsReport {
  const totalStudents = (db.prepare(
    "SELECT COUNT(*) as n FROM users WHERE role = 'STUDENT' AND is_active = 1"
  ).get() as { n: number }).n;

  const studentsWithCert = (db.prepare(
    "SELECT COUNT(DISTINCT student_id) as n FROM certificates WHERE is_revoked = 0"
  ).get() as { n: number }).n;

  // Average mastery % across students
  const masteryRows = db.prepare(`
    SELECT student_id, COUNT(*) as mastered
    FROM concept_mastery
    WHERE mastery_achieved = 1
    GROUP BY student_id
  `).all() as { student_id: string; mastered: number }[];

  const avgMasteryPct = totalStudents === 0
    ? 0
    : Math.round(
        masteryRows.reduce((sum, r) => sum + (r.mastered / TOTAL_CONCEPTS) * 100, 0) / totalStudents
      );

  const totalExams = (db.prepare(
    "SELECT COUNT(*) as n FROM exam_instances WHERE status = 'COMPLETED'"
  ).get() as { n: number }).n;

  const avgScoreRow = db.prepare(
    "SELECT AVG(overall_score) as avg FROM exam_instances WHERE status = 'COMPLETED' AND overall_score IS NOT NULL"
  ).get() as { avg: number | null };

  // Concept stats — hardest (lowest avg) and easiest (highest avg) among attempted
  const conceptStats = db.prepare(`
    SELECT concept,
           AVG(average_score) as avg_score,
           COUNT(*) as attempt_count
    FROM concept_mastery
    WHERE total_attempts > 0
    GROUP BY concept
    ORDER BY avg_score ASC
  `).all() as { concept: string; avg_score: number; attempt_count: number }[];

  const hardest = conceptStats.slice(0, 5).map(r => ({
    concept: r.concept,
    avg_score: Math.round(r.avg_score * 100) / 100,
    attempt_count: r.attempt_count,
  }));

  const easiest = [...conceptStats].reverse().slice(0, 5).map(r => ({
    concept: r.concept,
    avg_score: Math.round(r.avg_score * 100) / 100,
    attempt_count: r.attempt_count,
  }));

  const BLOOM_LABEL_MAP: Record<number, string> = {
    1: 'Remember', 2: 'Understand', 3: 'Apply', 4: 'Analyze', 5: 'Evaluate', 6: 'Create',
  };

  // Bloom's stats: avg score per level across all student_answers
  const bloomRows = db.prepare(`
    SELECT q.bloom_level,
           AVG(sa.ai_score) as avg_score,
           COUNT(*) as attempt_count
    FROM student_answers sa
    JOIN questions q ON q.id = sa.question_id
    WHERE sa.answer_given != '__PENDING__'
      AND sa.ai_score IS NOT NULL
    GROUP BY q.bloom_level
    ORDER BY q.bloom_level ASC
  `).all() as { bloom_level: number; avg_score: number; attempt_count: number }[];

  const bloomStats: BloomLevelStat[] = bloomRows.map(r => ({
    bloom_level: r.bloom_level,
    label: BLOOM_LABEL_MAP[r.bloom_level] ?? `Level ${r.bloom_level}`,
    avg_score: Math.round(r.avg_score * 100) / 100,
    attempt_count: r.attempt_count,
  }));

  return {
    total_students: totalStudents,
    students_with_cert: studentsWithCert,
    avg_mastery_pct: avgMasteryPct,
    hardest_concepts: hardest,
    easiest_concepts: easiest,
    total_exams: totalExams,
    avg_exam_score: avgScoreRow.avg !== null ? Math.round(avgScoreRow.avg * 100) / 100 : null,
    bloom_stats: bloomStats,
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportCsv(): string {
  const students = listStudents('email');
  const lines: string[] = [
    'id,email,display_name,mastery_pct,exam_count,last_exam_at,cert_status',
  ];
  for (const s of students) {
    const row = [
      s.id,
      `"${s.email}"`,
      `"${s.display_name ?? ''}"`,
      s.mastery_pct,
      s.exam_count,
      s.last_exam_at ?? '',
      s.cert_status,
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}
