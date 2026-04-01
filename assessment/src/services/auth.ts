import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { sendMagicCode } from './email';
import { AuthCode, Session, User } from '../types';

const BCRYPT_ROUNDS = 10;
const CODE_TTL_MINUTES = 10;
const SESSION_TTL_HOURS = 8;
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 5;

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function addHours(date: Date, hours: number): string {
  return new Date(date.getTime() + hours * 3_600_000).toISOString();
}

function generateCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

export async function requestCode(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  // Invalidate any existing unused codes for this email
  db.prepare('UPDATE auth_codes SET used = 1 WHERE email = ? AND used = 0').run(normalizedEmail);

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = addMinutes(now, CODE_TTL_MINUTES);

  db.prepare(`
    INSERT INTO auth_codes (id, email, code, expires_at, attempts, used, created_at)
    VALUES (?, ?, ?, ?, 0, 0, datetime('now'))
  `).run(uuidv4(), normalizedEmail, codeHash, expiresAt);

  await sendMagicCode(normalizedEmail, code);
}

export async function verifyCode(
  email: string,
  code: string
): Promise<{ token: string; user: User }> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  // Check for lockout: too many recent failures
  const recentFailures = db.prepare(`
    SELECT COUNT(*) as cnt FROM auth_codes
    WHERE email = ? AND used = 0
      AND attempts >= ?
      AND expires_at > ?
  `).get(normalizedEmail, MAX_ATTEMPTS, now) as { cnt: number };

  if (recentFailures.cnt > 0) {
    throw new Error('Too many failed attempts. Please wait 5 minutes and request a new code.');
  }

  const authCode = db.prepare(`
    SELECT * FROM auth_codes
    WHERE email = ? AND used = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(normalizedEmail, now) as AuthCode | undefined;

  if (!authCode) {
    throw new Error('No valid code found. Please request a new code.');
  }

  // Check attempts (BR-001)
  if (authCode.attempts >= MAX_ATTEMPTS) {
    // Lock by extending expiry to lockout period — enforced above on next request
    throw new Error('Too many failed attempts. Please request a new code.');
  }

  const match = await bcrypt.compare(code, authCode.code);
  if (!match) {
    const newAttempts = authCode.attempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      // Extend expiry to create a 5-min lockout window
      const lockoutExpiry = addMinutes(new Date(), LOCKOUT_MINUTES);
      db.prepare('UPDATE auth_codes SET attempts = ?, expires_at = ? WHERE id = ?')
        .run(newAttempts, lockoutExpiry, authCode.id);
    } else {
      db.prepare('UPDATE auth_codes SET attempts = ? WHERE id = ?')
        .run(newAttempts, authCode.id);
    }
    throw new Error('Invalid code.');
  }

  // Mark code used
  db.prepare('UPDATE auth_codes SET used = 1 WHERE id = ?').run(authCode.id);

  // Upsert user
  let user = db.prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail) as User | undefined;

  if (!user) {
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, role, is_active, created_at)
      VALUES (?, ?, 'STUDENT', 1, datetime('now'))
    `).run(userId, normalizedEmail);

    db.prepare(`
      INSERT INTO user_profiles (user_id) VALUES (?)
    `).run(userId);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
  }

  // Create session
  const rawToken = uuidv4() + '-' + uuidv4();
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  const sessionId = uuidv4();
  const expiresAt = addHours(new Date(), SESSION_TTL_HOURS);

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, created_at, expires_at)
    VALUES (?, ?, ?, datetime('now'), ?)
  `).run(sessionId, user.id, tokenHash, expiresAt);

  return { token: rawToken, user };
}

export function logout(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function getUserBySession(sessionId: string): User | null {
  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')
  `).get(sessionId) as Session | undefined;

  if (!session) return null;

  return db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
    .get(session.user_id) as User | null;
}
