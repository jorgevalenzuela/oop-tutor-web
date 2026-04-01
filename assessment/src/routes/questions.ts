import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  generateAndSaveQuestions,
  updateQuestion,
  setApprovalStatus,
  deactivateQuestion,
} from '../services/question';
import {
  CreateQuestionBody,
  GenerateQuestionsBody,
  UpdateQuestionBody,
  RejectQuestionBody,
  QuestionType,
  ApprovalStatus,
} from '../types';

const router = Router();

const VALID_TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'FREE_FORM', 'CODE_WRITING', 'CONCEPT_MATCHING'];
const VALID_STATUSES: ApprovalStatus[] = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INACTIVE'];

// GET /api/questions
router.get(
  '/',
  requireAuth,
  requireRole('INSTRUCTOR', 'TA', 'ADMIN'),
  (req: Request, res: Response): void => {
    const { concept, type, difficulty, status } = req.query;

    const filters: Parameters<typeof listQuestions>[0] = {};
    if (concept && typeof concept === 'string') filters.concept = concept;
    if (type && typeof type === 'string' && VALID_TYPES.includes(type as QuestionType)) {
      filters.type = type as QuestionType;
    }
    if (difficulty && !isNaN(Number(difficulty))) filters.difficulty = Number(difficulty);
    if (status && typeof status === 'string' && VALID_STATUSES.includes(status as ApprovalStatus)) {
      filters.status = status as ApprovalStatus;
    }

    res.json(listQuestions(filters));
  }
);

// POST /api/questions
router.post(
  '/',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  (req: Request, res: Response): void => {
    const body = req.body as CreateQuestionBody;

    if (!body.concept || !body.type || !body.difficulty || !body.question_text ||
        !body.correct_answer || !body.grading_rubric || !body.ai_grading_prompt) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!VALID_TYPES.includes(body.type)) {
      res.status(400).json({ error: 'Invalid question type' });
      return;
    }
    if (![1, 2, 3].includes(body.difficulty)) {
      res.status(400).json({ error: 'Difficulty must be 1, 2, or 3' });
      return;
    }
    if (body.type === 'MULTIPLE_CHOICE' && (!body.options || body.options.length !== 4)) {
      res.status(400).json({ error: 'MULTIPLE_CHOICE questions require exactly 4 options' });
      return;
    }

    const question = createQuestion(body, false);
    res.status(201).json(question);
  }
);

// POST /api/questions/generate
router.post(
  '/generate',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as GenerateQuestionsBody;

    if (!body.concept || !body.type || !body.difficulty || !body.count) {
      res.status(400).json({ error: 'concept, type, difficulty, and count are required' });
      return;
    }
    if (!VALID_TYPES.includes(body.type)) {
      res.status(400).json({ error: 'Invalid question type' });
      return;
    }
    if (![1, 2, 3].includes(body.difficulty)) {
      res.status(400).json({ error: 'Difficulty must be 1, 2, or 3' });
      return;
    }
    if (body.count < 1 || body.count > 10) {
      res.status(400).json({ error: 'count must be between 1 and 10' });
      return;
    }

    try {
      const questions = await generateAndSaveQuestions(body);
      res.status(201).json(questions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI generation failed';
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/questions/:id
router.get(
  '/:id',
  requireAuth,
  requireRole('INSTRUCTOR', 'TA', 'ADMIN'),
  (req: Request, res: Response): void => {
    const question = getQuestion(req.params.id as string);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(question);
  }
);

// PUT /api/questions/:id
router.put(
  '/:id',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  (req: Request, res: Response): void => {
    const body = req.body as UpdateQuestionBody;

    if (body.type && !VALID_TYPES.includes(body.type)) {
      res.status(400).json({ error: 'Invalid question type' });
      return;
    }
    if (body.difficulty && ![1, 2, 3].includes(body.difficulty)) {
      res.status(400).json({ error: 'Difficulty must be 1, 2, or 3' });
      return;
    }

    const updated = updateQuestion(req.params.id as string, body);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(updated);
  }
);

// PUT /api/questions/:id/approve
router.put(
  '/:id/approve',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  (req: Request, res: Response): void => {
    const updated = setApprovalStatus(req.params.id as string, 'APPROVED', req.user!.id);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(updated);
  }
);

// PUT /api/questions/:id/reject
router.put(
  '/:id/reject',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  (req: Request, res: Response): void => {
    const { review_notes } = req.body as RejectQuestionBody;
    if (!review_notes || typeof review_notes !== 'string') {
      res.status(400).json({ error: 'review_notes is required when rejecting a question' });
      return;
    }

    const updated = setApprovalStatus(req.params.id as string, 'REJECTED', req.user!.id, review_notes);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(updated);
  }
);

// PUT /api/questions/:id/deactivate
router.put(
  '/:id/deactivate',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  (req: Request, res: Response): void => {
    const updated = deactivateQuestion(req.params.id as string);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(updated);
  }
);

export default router;
