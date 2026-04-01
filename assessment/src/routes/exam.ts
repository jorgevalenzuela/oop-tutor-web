import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  startExam,
  getExamQuestion,
  submitAnswer,
  completeExam,
  abandonExam,
  getExamHistory,
  getConceptMastery,
  getActiveExam,
  getExamQuestions,
} from '../services/exam';
import { SubmitAnswerBody } from '../types';

const router = Router();

// All exam routes require authentication
router.use(requireAuth);

// POST /api/exam/start
router.post('/start', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = startExam(req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start exam';
    res.status(400).json({ error: message });
  }
});

// GET /api/exam/history
router.get('/history', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), (req: Request, res: Response): void => {
  const history = getExamHistory(req.user!.id);
  res.json(history);
});

// GET /api/exam/mastery
router.get('/mastery', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), (req: Request, res: Response): void => {
  const mastery = getConceptMastery(req.user!.id);
  res.json(mastery);
});

// GET /api/exam/active
router.get('/active', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), (req: Request, res: Response): void => {
  const exam = getActiveExam(req.user!.id);
  if (!exam) {
    res.json(null);
    return;
  }
  const questions = getExamQuestions(exam.id);
  res.json({ exam, questions });
});

// GET /api/exam/:examId/question/:questionIndex
router.get('/:examId/question/:questionIndex', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), (req: Request, res: Response): void => {
  const index = parseInt(req.params.questionIndex as string, 10);
  if (isNaN(index)) {
    res.status(400).json({ error: 'questionIndex must be a number' });
    return;
  }

  try {
    const question = getExamQuestion(req.params.examId as string, req.user!.id, index);
    res.json(question);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get question';
    res.status(404).json({ error: message });
  }
});

// POST /api/exam/:examId/answer
router.post('/:examId/answer', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const body = req.body as SubmitAnswerBody;

  if (!body.questionId || !body.answerGiven) {
    res.status(400).json({ error: 'questionId and answerGiven are required' });
    return;
  }

  try {
    const result = await submitAnswer(req.params.examId as string, req.user!.id, body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit answer';
    res.status(400).json({ error: message });
  }
});

// POST /api/exam/:examId/complete
router.post('/:examId/complete', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), (req: Request, res: Response): void => {
  try {
    const summary = completeExam(req.params.examId as string, req.user!.id);
    res.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete exam';
    res.status(400).json({ error: message });
  }
});

// POST /api/exam/:examId/abandon
router.post('/:examId/abandon', requireRole('STUDENT', 'INSTRUCTOR', 'TA', 'ADMIN'), (req: Request, res: Response): void => {
  abandonExam(req.params.examId as string, req.user!.id);
  res.json({ message: 'Exam abandoned' });
});

export default router;
