import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { listConfigs, getConfig, upsertConfig, deleteConfig } from '../services/mastery-config';

const router = Router();

router.use(requireAuth);
router.use(requireRole('INSTRUCTOR', 'ADMIN'));

// GET /api/mastery-config
router.get('/', (_req: Request, res: Response): void => {
  res.json(listConfigs());
});

// GET /api/mastery-config/:concept
router.get('/:concept', (req: Request, res: Response): void => {
  const cfg = getConfig(decodeURIComponent(req.params.concept as string));
  if (!cfg) {
    res.json({
      concept: decodeURIComponent(req.params.concept as string),
      score_threshold: 0.8,
      consecutive_required: 3,
      required_for_cert: 1,
      is_default: true,
    });
    return;
  }
  res.json(cfg);
});

// PUT /api/mastery-config/:concept
router.put('/:concept', (req: Request, res: Response): void => {
  const concept = decodeURIComponent(req.params.concept as string);
  const { scoreThreshold, consecutiveRequired, requiredForCert } = req.body;

  if (scoreThreshold == null || consecutiveRequired == null) {
    res.status(400).json({ error: 'scoreThreshold and consecutiveRequired are required' });
    return;
  }
  if (scoreThreshold < 0.5 || scoreThreshold > 1.0) {
    res.status(400).json({ error: 'scoreThreshold must be between 0.5 and 1.0' });
    return;
  }
  if (consecutiveRequired < 1 || consecutiveRequired > 10) {
    res.status(400).json({ error: 'consecutiveRequired must be between 1 and 10' });
    return;
  }

  const cfg = upsertConfig(
    concept,
    Number(scoreThreshold),
    Number(consecutiveRequired),
    requiredForCert !== false,
    req.user!.id
  );
  res.json(cfg);
});

// DELETE /api/mastery-config/:concept
router.delete('/:concept', (req: Request, res: Response): void => {
  const deleted = deleteConfig(decodeURIComponent(req.params.concept as string));
  if (!deleted) {
    res.status(404).json({ error: 'No custom config found for this concept' });
    return;
  }
  res.json({ message: 'Reset to defaults' });
});

export default router;
