import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  getCertEligibility,
  getMyCertificate,
  generateCertificate,
  verifyCertificate,
  revokeCertificate,
  issueForStudent,
} from '../services/certificate';

const router = Router();

const STUDENT_ROLES = requireRole('STUDENT', 'TA', 'INSTRUCTOR', 'ADMIN');
const INSTRUCTOR_ROLES = requireRole('INSTRUCTOR', 'ADMIN');

// GET /api/certificates/verify/:verificationCode — public, no auth
router.get('/verify/:verificationCode', (req: Request, res: Response): void => {
  const cert = verifyCertificate(req.params.verificationCode as string);
  if (!cert) { res.status(404).json({ error: 'Certificate not found' }); return; }
  res.json(cert);
});

// All remaining routes require auth
router.use(requireAuth);

// GET /api/certificates/eligibility
router.get('/eligibility', STUDENT_ROLES, (req: Request, res: Response): void => {
  res.json(getCertEligibility(req.user!.id));
});

// GET /api/certificates/mine
router.get('/mine', STUDENT_ROLES, (req: Request, res: Response): void => {
  const cert = getMyCertificate(req.user!.id);
  res.json(cert ?? null);
});

// GET /api/certificates/mine/download
router.get('/mine/download', STUDENT_ROLES, (req: Request, res: Response): void => {
  const cert = getMyCertificate(req.user!.id);
  if (!cert) { res.status(404).json({ error: 'No certificate found' }); return; }
  if (cert.is_revoked) { res.status(403).json({ error: 'Certificate has been revoked' }); return; }
  if (!cert.pdf_path) { res.status(404).json({ error: 'PDF not available' }); return; }

  const filePath = path.join(__dirname, '../../data', cert.pdf_path);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'PDF file not found' }); return; }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="oop-certificate-${cert.verification_code.slice(0, 8)}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

// POST /api/certificates/generate
router.post('/generate', STUDENT_ROLES, async (req: Request, res: Response): Promise<void> => {
  try {
    const cert = await generateCertificate(req.user!.id, req.user!.id);
    res.status(201).json(cert);
  } catch (err) {
    const e = err as Error & { remainingConcepts?: string[] };
    res.status(400).json({
      error: e.message,
      remainingConcepts: e.remainingConcepts ?? [],
    });
  }
});

// PUT /api/certificates/:id/revoke — instructor only
router.put('/:id/revoke', INSTRUCTOR_ROLES, (req: Request, res: Response): void => {
  try {
    revokeCertificate(req.params.id as string);
    res.json({ message: 'Certificate revoked' });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
  }
});

// PUT /api/certificates/:id/issue — instructor bypass mastery check
router.put('/:id/issue', INSTRUCTOR_ROLES, async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.body as { studentId?: string };
  if (!studentId) { res.status(400).json({ error: 'studentId is required' }); return; }
  try {
    const cert = await issueForStudent(studentId, req.user!.id);
    res.status(201).json(cert);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to issue certificate' });
  }
});

export default router;
