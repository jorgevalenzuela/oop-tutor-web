import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import db from '../database';
import { SkipReason } from '../types';

const router = Router();

router.use(requireAuth);

const VALID_REASONS: SkipReason[] = ['time', 'overwhelmed', 'no_clue', 'other', 'dismissed'];

// POST /api/socratic/skip — log a skip event (any authenticated user)
router.post('/skip', (req: Request, res: Response): void => {
  const { concept, stepAtSkip, skipReason } = req.body as {
    concept?: string;
    stepAtSkip?: number;
    skipReason?: SkipReason | null;
  };

  if (!concept || typeof stepAtSkip !== 'number') {
    res.status(400).json({ error: 'concept and stepAtSkip are required' });
    return;
  }

  if (stepAtSkip < 1 || stepAtSkip > 6) {
    res.status(400).json({ error: 'stepAtSkip must be 1-6' });
    return;
  }

  if (skipReason != null && !VALID_REASONS.includes(skipReason)) {
    res.status(400).json({ error: `skipReason must be one of: ${VALID_REASONS.join(', ')}` });
    return;
  }

  db.prepare(`
    INSERT INTO skip_events (id, student_id, concept, step_at_skip, skip_reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), req.user!.id, concept, stepAtSkip, skipReason ?? null);

  res.json({ logged: true });
});

export default router;
