import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  listPosts,
  getThread,
  createPost,
  addReply,
  resolvePost,
} from '../services/discussion';

const router = Router();
router.use(requireAuth);

const ALL_ROLES = requireRole('STUDENT', 'TA', 'INSTRUCTOR', 'ADMIN');
const INSTRUCTOR_ROLES = requireRole('INSTRUCTOR', 'ADMIN');

// GET /api/discussion?page=1&concept=...&resolved=false
router.get('/', ALL_ROLES, (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1;
  const concept = req.query.concept as string | undefined;
  const resolvedRaw = req.query.resolved as string | undefined;
  const resolved = resolvedRaw === undefined ? undefined : resolvedRaw === 'true';
  res.json(listPosts(page, 20, concept, resolved));
});

// POST /api/discussion — student creates post
router.post('/', requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
  const { concept, subject, body } = req.body as { concept?: string; subject?: string; body?: string };
  if (!concept || !subject || !body) {
    res.status(400).json({ error: 'concept, subject, and body are required' }); return;
  }
  try {
    const post = await createPost(req.user!.id, concept, subject, body);
    res.status(201).json(post);
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 400).json({ error: e.message });
  }
});

// GET /api/discussion/:postId
router.get('/:postId', ALL_ROLES, (req: Request, res: Response): void => {
  const thread = getThread(req.params.postId as string);
  if (!thread) { res.status(404).json({ error: 'Post not found' }); return; }
  res.json(thread);
});

// POST /api/discussion/:postId/reply — all authenticated users
router.post('/:postId/reply', ALL_ROLES, (req: Request, res: Response): void => {
  const { body } = req.body as { body?: string };
  if (!body?.trim()) { res.status(400).json({ error: 'body is required' }); return; }
  try {
    res.status(201).json(addReply(req.params.postId as string, req.user!.id, body));
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 400).json({ error: e.message });
  }
});

// PUT /api/discussion/:postId/resolve — instructor only
router.put('/:postId/resolve', INSTRUCTOR_ROLES, (req: Request, res: Response): void => {
  try {
    resolvePost(req.params.postId as string);
    res.json({ message: 'Post resolved' });
  } catch (err) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 404).json({ error: e.message });
  }
});

export default router;
