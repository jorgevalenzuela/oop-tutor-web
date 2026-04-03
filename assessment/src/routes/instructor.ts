import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  listStudents,
  getStudentDetail,
  getAnalytics,
  exportCsv,
} from '../services/instructor';

const router = Router();

const INSTRUCTOR_TA = requireRole('INSTRUCTOR', 'TA', 'ADMIN');
const INSTRUCTOR_ONLY = requireRole('INSTRUCTOR', 'ADMIN');

router.use(requireAuth);

// GET /api/instructor/students?sort=email&filter=
router.get('/students', INSTRUCTOR_TA, (req: Request, res: Response): void => {
  const sort = (req.query.sort as string) as Parameters<typeof listStudents>[0] | undefined;
  const filter = req.query.filter as string | undefined;
  res.json(listStudents(sort ?? 'email', filter));
});

// GET /api/instructor/students/:id
router.get('/students/:id', INSTRUCTOR_TA, (req: Request, res: Response): void => {
  const detail = getStudentDetail(req.params.id as string);
  if (!detail) { res.status(404).json({ error: 'Student not found' }); return; }
  res.json(detail);
});

// GET /api/instructor/analytics
router.get('/analytics', INSTRUCTOR_TA, (_req: Request, res: Response): void => {
  res.json(getAnalytics());
});

// GET /api/instructor/export — instructor only (no TA)
router.get('/export', INSTRUCTOR_ONLY, (_req: Request, res: Response): void => {
  const csv = exportCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send(csv);
});

export default router;
