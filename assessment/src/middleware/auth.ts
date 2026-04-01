import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import db from '../database';
import { Session, User } from '../types';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const rawToken = authHeader.slice(7);
  const now = new Date().toISOString();

  // Find all non-expired sessions and check bcrypt hash match
  const sessions = db
    .prepare('SELECT * FROM sessions WHERE expires_at > ? AND user_id IS NOT NULL')
    .all(now) as Session[];

  let matchedSession: Session | null = null;
  for (const session of sessions) {
    if (bcrypt.compareSync(rawToken, session.token)) {
      matchedSession = session;
      break;
    }
  }

  if (!matchedSession) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
    .get(matchedSession.user_id) as User | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found or inactive' });
    return;
  }

  req.user = user;
  req.session = matchedSession;
  next();
}
