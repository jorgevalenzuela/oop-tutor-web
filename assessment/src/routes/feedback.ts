import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  submitTutorFeedback,
  submitQuestionFeedback,
  getFeedbackSummary,
  getConfig,
  updateConfig,
} from '../services/feedback';

const router = Router();
router.use(requireAuth);

const STUDENT_ROLES = requireRole('STUDENT', 'TA', 'INSTRUCTOR', 'ADMIN');
const INSTRUCTOR_ROLES = requireRole('INSTRUCTOR', 'ADMIN');

// GET /api/feedback/config — any authenticated user
router.get('/config', STUDENT_ROLES, (_req: Request, res: Response): void => {
  res.json(getConfig());
});

// PUT /api/feedback/config — instructor only
router.put('/config', INSTRUCTOR_ROLES, (req: Request, res: Response): void => {
  const { tutorFeedbackEnabled, examFeedbackEnabled, discussionEnabled, notificationEmail } = req.body as {
    tutorFeedbackEnabled?: boolean;
    examFeedbackEnabled?: boolean;
    discussionEnabled?: boolean;
    notificationEmail?: string;
  };
  const cfg = updateConfig(
    tutorFeedbackEnabled ?? true,
    examFeedbackEnabled ?? true,
    discussionEnabled ?? true,
    notificationEmail ?? '',
    req.user!.id
  );
  res.json(cfg);
});

// POST /api/feedback/tutor — student submits thumbs on tutor response
router.post('/tutor', requireRole('STUDENT'), (req: Request, res: Response): void => {
  const { concept, rating, comment } = req.body as { concept?: string; rating?: number; comment?: string };
  if (!concept || rating === undefined) { res.status(400).json({ error: 'concept and rating are required' }); return; }
  if (rating !== 1 && rating !== -1) { res.status(400).json({ error: 'rating must be 1 or -1' }); return; }
  try {
    res.status(201).json(submitTutorFeedback(req.user!.id, concept, rating, comment));
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 400).json({ error: e.message });
  }
});

// POST /api/feedback/question — student flags an exam question
router.post('/question', requireRole('STUDENT'), (req: Request, res: Response): void => {
  const { questionId, rating, comment } = req.body as { questionId?: string; rating?: number; comment?: string };
  if (!questionId || rating === undefined) { res.status(400).json({ error: 'questionId and rating are required' }); return; }
  if (rating !== 1 && rating !== -1) { res.status(400).json({ error: 'rating must be 1 or -1' }); return; }
  try {
    res.status(201).json(submitQuestionFeedback(req.user!.id, questionId, rating, comment));
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 400).json({ error: e.message });
  }
});

// GET /api/feedback/summary — instructor only
router.get('/summary', INSTRUCTOR_ROLES, (_req: Request, res: Response): void => {
  res.json(getFeedbackSummary());
});

export default router;
