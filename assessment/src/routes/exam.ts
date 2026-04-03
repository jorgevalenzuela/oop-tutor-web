import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  startExam,
  getExamQuestion,
  getExamStatus,
  submitAnswer,
  completeExam,
  abandonExam,
  getExamHistory,
  getConceptMastery,
  getProgress,
  getActiveExam,
  getExamQuestions,
} from '../services/exam';
import { SubmitAnswerBody } from '../types';

const router = Router();
const ALL_ROLES = requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN');

router.use(requireAuth);

// POST /api/exam/start
router.post('/start', ALL_ROLES, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = startExam(req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to start exam' });
  }
});

// GET /api/exam/history
router.get('/history', ALL_ROLES, (req: Request, res: Response): void => {
  res.json(getExamHistory(req.user!.id));
});

// GET /api/exam/mastery
router.get('/mastery', ALL_ROLES, (req: Request, res: Response): void => {
  res.json(getConceptMastery(req.user!.id));
});

// GET /api/exam/progress
router.get('/progress', ALL_ROLES, (req: Request, res: Response): void => {
  res.json(getProgress(req.user!.id));
});

// GET /api/exam/active
router.get('/active', ALL_ROLES, (req: Request, res: Response): void => {
  const exam = getActiveExam(req.user!.id);
  if (!exam) { res.json(null); return; }
  res.json({ exam, questions: getExamQuestions(exam.id) });
});

// GET /api/exam/:examId/status
router.get('/:examId/status', ALL_ROLES, (req: Request, res: Response): void => {
  try {
    res.json(getExamStatus(req.params.examId as string, req.user!.id));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
  }
});

// GET /api/exam/:examId/question/:questionIndex
router.get('/:examId/question/:questionIndex', ALL_ROLES, (req: Request, res: Response): void => {
  const index = parseInt(req.params.questionIndex as string, 10);
  if (isNaN(index)) { res.status(400).json({ error: 'questionIndex must be a number' }); return; }
  try {
    res.json(getExamQuestion(req.params.examId as string, req.user!.id, index));
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
  }
});

// POST /api/exam/:examId/answer
router.post('/:examId/answer', ALL_ROLES, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as SubmitAnswerBody;
  if (!body.questionId || !body.answerGiven) {
    res.status(400).json({ error: 'questionId and answerGiven are required' });
    return;
  }
  try {
    res.json(await submitAnswer(req.params.examId as string, req.user!.id, body));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to submit answer' });
  }
});

// POST /api/exam/:examId/complete
router.post('/:examId/complete', ALL_ROLES, (req: Request, res: Response): void => {
  try {
    res.json(completeExam(req.params.examId as string, req.user!.id));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to complete exam' });
  }
});

// POST /api/exam/:examId/abandon
router.post('/:examId/abandon', ALL_ROLES, (req: Request, res: Response): void => {
  abandonExam(req.params.examId as string, req.user!.id);
  res.json({ message: 'Exam abandoned' });
});

export default router;
