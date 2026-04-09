import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import db from '../database';
import { DiscussionPost, DiscussionPostWithMeta, DiscussionThread, DiscussionReply } from '../types';
import { getConfig } from './feedback';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(userId: string): string {
  const profile = db.prepare("SELECT display_name FROM user_profiles WHERE user_id = ?").get(userId) as { display_name: string | null } | undefined;
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | undefined;
  return profile?.display_name || user?.email || 'Unknown';
}

// ─── Email notification ───────────────────────────────────────────────────────

async function sendNotification(studentName: string, concept: string, email: string): Promise<void> {
  if (!email) return;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '25'),
      secure: false,
      ignoreTLS: true,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'oop-tutor@localhost',
      to: email,
      subject: `New OOP Tutor question from ${studentName}`,
      text: `New question from ${studentName} about "${concept}" in OOP Tutor.\n\nView at: http://localhost:5173/discussion`,
    });
  } catch {
    // Non-fatal — log silently; no SMTP in dev is expected
    console.info('[discussion] Email notification skipped (no SMTP configured)');
  }
}

// ─── List posts ───────────────────────────────────────────────────────────────

export function listPosts(
  page = 1,
  perPage = 20,
  concept?: string,
  resolved?: boolean
): { posts: DiscussionPostWithMeta[]; total: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (concept) {
    conditions.push('p.concept = ?');
    params.push(concept);
  }
  if (resolved !== undefined) {
    conditions.push('p.is_resolved = ?');
    params.push(resolved ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * perPage;

  const total = (db.prepare(
    `SELECT COUNT(*) as n FROM discussion_posts p ${where}`
  ).get(...params) as { n: number }).n;

  const rows = db.prepare(`
    SELECT p.*, COUNT(r.id) as reply_count
    FROM discussion_posts p
    LEFT JOIN discussion_replies r ON r.post_id = p.id
    ${where}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, perPage, offset) as (DiscussionPost & { reply_count: number })[];

  const posts: DiscussionPostWithMeta[] = rows.map(row => ({
    ...row,
    author_name: displayName(row.student_id),
    reply_count: row.reply_count,
  }));

  return { posts, total };
}

// ─── Get thread ───────────────────────────────────────────────────────────────

export function getThread(postId: string): DiscussionThread | null {
  const post = db.prepare("SELECT * FROM discussion_posts WHERE id = ?").get(postId) as DiscussionPost | undefined;
  if (!post) return null;

  const replies = db.prepare(
    "SELECT * FROM discussion_replies WHERE post_id = ? ORDER BY created_at ASC"
  ).all(postId) as DiscussionReply[];

  return {
    ...post,
    author_name: displayName(post.student_id),
    replies: replies.map(r => ({ ...r, author_name: displayName(r.author_id) })),
  };
}

// ─── Create post ──────────────────────────────────────────────────────────────

export async function createPost(
  studentId: string,
  concept: string,
  subject: string,
  body: string
): Promise<DiscussionPostWithMeta> {
  const cfg = getConfig();
  if (!cfg.discussion_enabled) throw Object.assign(new Error('Discussion board is disabled'), { status: 403 });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO discussion_posts (id, student_id, concept, subject, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, studentId, concept, subject, body);

  const post = db.prepare("SELECT * FROM discussion_posts WHERE id = ?").get(id) as DiscussionPost;
  const authorName = displayName(studentId);

  // Fire-and-forget email
  if (cfg.notification_email) {
    sendNotification(authorName, concept, cfg.notification_email).catch(() => {});
  }

  return { ...post, author_name: authorName, reply_count: 0 };
}

// ─── Add reply ────────────────────────────────────────────────────────────────

export function addReply(
  postId: string,
  authorId: string,
  body: string
): DiscussionReply & { author_name: string } {
  const cfg = getConfig();
  if (!cfg.discussion_enabled) throw Object.assign(new Error('Discussion board is disabled'), { status: 403 });

  const post = db.prepare("SELECT * FROM discussion_posts WHERE id = ?").get(postId) as DiscussionPost | undefined;
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO discussion_replies (id, post_id, author_id, body)
    VALUES (?, ?, ?, ?)
  `).run(id, postId, authorId, body);

  const reply = db.prepare("SELECT * FROM discussion_replies WHERE id = ?").get(id) as DiscussionReply;
  return { ...reply, author_name: displayName(authorId) };
}

// ─── Resolve post ─────────────────────────────────────────────────────────────

export function resolvePost(postId: string): void {
  const result = db.prepare("UPDATE discussion_posts SET is_resolved = 1 WHERE id = ?").run(postId);
  if (result.changes === 0) throw Object.assign(new Error('Post not found'), { status: 404 });
}
