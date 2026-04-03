import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import db from '../database';
import {
  Certificate,
  CertEligibility,
  CertificateWithScores,
  ConceptScore,
} from '../types';

// ─── Assessable concepts — mirrors getAssessableNodes() from oopHierarchy.ts ──
// Kept in sync with frontend/src/data/oopHierarchy.ts manually.
const ASSESSABLE_CONCEPTS: string[] = [
  'Data Types', 'Value Types', 'Reference Types',
  'Fundamentals',
  'Four Pillars',
  '1. Encapsulation', 'Object State', 'Object Behavior', 'Method Signature',
  'Constructors', 'Parameters', 'Data Hiding', 'Access Modifiers',
  '2. Inheritance',
  '3. Polymorphism', 'Overloading', 'Overriding', 'Subtype / Inclusion',
  '4. Abstraction',
  'Relationships',
  'IS_A', 'Inheritance (Extends)', 'Realization (Implements)',
  'HAS_A', 'Dependency (weakest)', 'Association',
  'Composition (strong ownership)', 'Aggregation (weak ownership)',
];

const CERTS_DIR = path.join(__dirname, '../../data/certs');

function ensureCertsDir(): void {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

export function getCertEligibility(studentId: string): CertEligibility {
  // Concepts explicitly opted out by instructor
  const optedOut = new Set(
    (db.prepare("SELECT concept FROM mastery_configs WHERE required_for_cert = 0").all() as { concept: string }[])
      .map(r => r.concept)
  );

  const required = ASSESSABLE_CONCEPTS.filter(c => !optedOut.has(c));

  const masteredSet = new Set(
    (db.prepare(
      "SELECT concept FROM concept_mastery WHERE student_id = ? AND mastery_achieved = 1"
    ).all(studentId) as { concept: string }[]).map(r => r.concept)
  );

  const remaining = required.filter(c => !masteredSet.has(c));

  return {
    eligible: remaining.length === 0,
    conceptsMastered: required.length - remaining.length,
    conceptsRequired: required.length,
    remainingConcepts: remaining,
  };
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export function getMyCertificate(studentId: string): CertificateWithScores | null {
  const cert = db.prepare(
    "SELECT * FROM certificates WHERE student_id = ? AND is_revoked = 0 ORDER BY issued_at DESC LIMIT 1"
  ).get(studentId) as Certificate | undefined;

  if (!cert) return null;
  return attachDetails(cert);
}

export function verifyCertificate(verificationCode: string): CertificateWithScores | null {
  const cert = db.prepare(
    "SELECT * FROM certificates WHERE verification_code = ?"
  ).get(verificationCode) as Certificate | undefined;

  if (!cert) return null;
  return attachDetails(cert);
}

function attachDetails(cert: Certificate): CertificateWithScores {
  const scores = db.prepare(
    "SELECT * FROM concept_scores WHERE certificate_id = ? ORDER BY concept ASC"
  ).all(cert.id) as ConceptScore[];

  const profile = db.prepare(
    "SELECT display_name FROM user_profiles WHERE user_id = ?"
  ).get(cert.student_id) as { display_name: string | null } | undefined;
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(cert.student_id) as { email: string };
  const student_name = profile?.display_name || user.email;

  return { ...cert, concept_scores: scores, student_name };
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function generateCertificate(
  studentId: string,
  issuedBy: string,
  bypassMasteryCheck = false
): Promise<CertificateWithScores> {
  if (!bypassMasteryCheck) {
    const eligibility = getCertEligibility(studentId);
    if (!eligibility.eligible) {
      throw Object.assign(new Error('Not all required concepts are mastered'), {
        remainingConcepts: eligibility.remainingConcepts,
      });
    }
  }

  // BR-010: revoke any existing non-revoked cert before issuing a new one
  const existing = db.prepare(
    "SELECT id, pdf_path FROM certificates WHERE student_id = ? AND is_revoked = 0"
  ).get(studentId) as Pick<Certificate, 'id' | 'pdf_path'> | undefined;

  if (existing) {
    db.prepare("UPDATE certificates SET is_revoked = 1 WHERE id = ?").run(existing.id);
    if (existing.pdf_path) {
      const oldFile = path.join(__dirname, '../../data', existing.pdf_path);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
  }

  // Gather mastery data for all assessable concepts
  const masteryRows = db.prepare(
    "SELECT concept, average_score, mastery_achieved FROM concept_mastery WHERE student_id = ?"
  ).all(studentId) as { concept: string; average_score: number; mastery_achieved: number }[];
  const masteryMap = new Map(masteryRows.map(r => [r.concept, r]));

  // Total time across all completed exams
  const timeRow = db.prepare(
    "SELECT COALESCE(SUM(time_taken_seconds), 0) as total FROM exam_instances WHERE student_id = ? AND status = 'COMPLETED'"
  ).get(studentId) as { total: number };

  const certId = uuidv4();
  const verificationCode = uuidv4();
  const pdfRelPath = `certs/${certId}.pdf`;

  ensureCertsDir();
  await buildPdf(certId, studentId, issuedBy, verificationCode, masteryMap, timeRow.total);

  // Insert certificate
  db.prepare(`
    INSERT INTO certificates (id, student_id, issued_by, total_time_taken_seconds, pdf_path, verification_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(certId, studentId, issuedBy, timeRow.total, pdfRelPath, verificationCode);

  // Insert concept scores
  const insertScore = db.prepare(`
    INSERT INTO concept_scores (id, certificate_id, concept, score, mastery_achieved, struggled)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const concept of ASSESSABLE_CONCEPTS) {
    const m = masteryMap.get(concept);
    const score = m?.average_score ?? 0;
    insertScore.run(uuidv4(), certId, concept, score, m?.mastery_achieved ?? 0, score < 0.6 ? 1 : 0);
  }

  return getMyCertificate(studentId)!;
}

// ─── Revoke / Issue ───────────────────────────────────────────────────────────

export function revokeCertificate(certId: string): void {
  const result = db.prepare("UPDATE certificates SET is_revoked = 1 WHERE id = ?").run(certId);
  if (result.changes === 0) throw new Error('Certificate not found');
}

export function issueForStudent(studentId: string, issuedBy: string): Promise<CertificateWithScores> {
  return generateCertificate(studentId, issuedBy, true);
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function buildPdf(
  certId: string,
  studentId: string,
  _issuedBy: string,
  verificationCode: string,
  masteryMap: Map<string, { average_score: number; mastery_achieved: number }>,
  totalSeconds: number
): Promise<void> {
  const profile = db.prepare(
    "SELECT display_name FROM user_profiles WHERE user_id = ?"
  ).get(studentId) as { display_name: string | null } | undefined;
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(studentId) as { email: string };
  const studentName = profile?.display_name || user.email;

  const pdfPath = path.join(CERTS_DIR, `${certId}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 0 });

  return new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);

    const W = doc.page.width;   // 595.28
    const purple = '#3C3489';
    const lightPurple = '#7F77DD';
    const darkText = '#1e1635';
    const mutedText = '#6b5fa8';
    const green = '#16a34a';
    const red = '#dc2626';
    const margin = 50;

    // ── Header band ─────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 130).fill(purple);

    doc.fillColor('#EEEDFE')
      .font('Helvetica')
      .fontSize(10)
      .text('OBJECT-ORIENTED PROGRAMMING', 0, 38, { align: 'center', width: W });

    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('Certificate of Completion', 0, 56, { align: 'center', width: W });

    // Accent line under header
    doc.rect(margin, 130, W - margin * 2, 2).fill(lightPurple);

    // ── Body ────────────────────────────────────────────────────────────────
    let y = 155;

    doc.fillColor(mutedText).font('Helvetica').fontSize(11)
      .text('This certifies that', 0, y, { align: 'center', width: W });
    y += 24;

    doc.fillColor(darkText).font('Helvetica-Bold').fontSize(22)
      .text(studentName, 0, y, { align: 'center', width: W });
    y += 32;

    doc.fillColor(mutedText).font('Helvetica').fontSize(11)
      .text('has demonstrated mastery of the following OOP concepts in', 0, y, { align: 'center', width: W });
    y += 18;

    doc.fillColor(purple).font('Helvetica-Bold').fontSize(13)
      .text('Object-Oriented Programming', 0, y, { align: 'center', width: W });
    y += 18;

    const issuedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fillColor(mutedText).font('Helvetica').fontSize(10)
      .text(`Issued: ${issuedDate}`, 0, y, { align: 'center', width: W });
    y += 22;

    // Divider
    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor(lightPurple).lineWidth(0.5).stroke();
    y += 16;

    // ── Concept scores table ─────────────────────────────────────────────────
    doc.fillColor(mutedText).font('Helvetica-Bold').fontSize(9)
      .text('CONCEPT', margin, y)
      .text('SCORE', margin + 300, y)
      .text('STATUS', margin + 370, y);
    y += 4;
    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#d1d5db').lineWidth(0.3).stroke();
    y += 8;

    const struggled: string[] = [];

    for (const concept of ASSESSABLE_CONCEPTS) {
      const m = masteryMap.get(concept);
      const score = m?.average_score ?? 0;
      const mastered = (m?.mastery_achieved ?? 0) === 1;
      const pct = Math.round(score * 100);

      if (score > 0 && score < 0.6) struggled.push(concept);

      const statusColor = mastered ? green : score > 0 ? red : '#9ca3af';
      const statusLabel = mastered ? '✓ Mastered' : score > 0 ? 'In Progress' : 'Not attempted';

      // Dot
      doc.circle(margin + 4, y + 4, 3).fill(mastered ? green : score > 0 ? '#ca8a04' : '#d1d5db');

      doc.fillColor(darkText).font('Helvetica').fontSize(8.5)
        .text(concept, margin + 12, y, { width: 285, ellipsis: true });
      doc.fillColor(score > 0 ? darkText : '#9ca3af').text(
        pct > 0 ? `${pct}%` : '—', margin + 300, y, { width: 65 }
      );
      doc.fillColor(statusColor).font('Helvetica').fontSize(8)
        .text(statusLabel, margin + 370, y, { width: 120 });

      y += 14;

      // New page if needed (leave room for footer)
      if (y > 760) {
        doc.addPage({ margin: 0 });
        doc.rect(0, 0, W, 20).fill(purple);
        y = 30;
      }
    }

    y += 8;
    doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#d1d5db').lineWidth(0.3).stroke();
    y += 14;

    // ── Struggled section ────────────────────────────────────────────────────
    if (struggled.length > 0) {
      doc.fillColor(red).font('Helvetica-Bold').fontSize(9)
        .text('Concepts that required additional effort:', margin, y);
      y += 12;
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8.5)
        .text(struggled.join(' · '), margin, y, { width: W - margin * 2 });
      y += doc.heightOfString(struggled.join(' · '), { width: W - margin * 2 }) + 10;
    }

    // ── Stats row ────────────────────────────────────────────────────────────
    doc.fillColor(mutedText).font('Helvetica').fontSize(9)
      .text(`Total time invested: ${formatTime(totalSeconds)}`, margin, y);
    y += 20;

    // ── Verification ─────────────────────────────────────────────────────────
    doc.rect(margin, y, W - margin * 2, 36).fill('rgba(60,52,137,0.06)').stroke('#AFA9EC');
    doc.fillColor(mutedText).font('Helvetica').fontSize(8)
      .text('Verification Code', margin + 8, y + 6);
    doc.fillColor(purple).font('Helvetica-Bold').fontSize(9)
      .text(verificationCode, margin + 8, y + 18);
    y += 46;

    // ── Signature ────────────────────────────────────────────────────────────
    doc.moveTo(margin, y + 20).lineTo(margin + 160, y + 20).strokeColor(darkText).lineWidth(0.5).stroke();
    doc.fillColor(darkText).font('Helvetica-Bold').fontSize(9)
      .text('Jorge Valenzuela', margin, y + 24);
    doc.fillColor(mutedText).font('Helvetica').fontSize(8)
      .text('Instructor, CIS501', margin, y + 36);

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 28;
    doc.rect(0, footerY - 4, W, 32).fill('#f8f7ff');
    doc.fillColor(mutedText).font('Helvetica').fontSize(7.5)
      .text(
        `Verify at: http://localhost:3002/api/certificates/verify/${verificationCode}`,
        0, footerY + 4, { align: 'center', width: W }
      );

    doc.end();
  });
}
