import { Router, Request, Response } from 'express';
import { requestCode, verifyCode, logout } from '../services/auth';
import { requireAuth } from '../middleware/auth';
import { RequestCodeBody, VerifyCodeBody } from '../types';

const router = Router();

// POST /api/auth/request-code
router.post('/request-code', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as RequestCodeBody;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }

  try {
    await requestCode(email);
    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send code';
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/verify-code
router.post('/verify-code', async (req: Request, res: Response): Promise<void> => {
  const { email, code } = req.body as VerifyCodeBody;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'A 6-digit code is required' });
    return;
  }

  try {
    const { token, user } = await verifyCode(email, code);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    res.status(401).json({ error: message });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: Request, res: Response): void => {
  logout(req.session!.id);
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const u = req.user!;
  res.json({ id: u.id, email: u.email, role: u.role });
});

export default router;
