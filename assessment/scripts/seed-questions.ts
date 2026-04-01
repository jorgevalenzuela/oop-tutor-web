/**
 * seed-questions.ts
 * Generates and auto-approves questions via the Claude API.
 * Run: npx ts-node scripts/seed-questions.ts
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const DB_PATH = path.join(__dirname, '../data/assessment.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type QuestionType = 'MULTIPLE_CHOICE' | 'FREE_FORM' | 'CODE_WRITING';

interface GeneratedQuestion {
  question_text: string;
  options?: string[];
  correct_answer: string;
  grading_rubric: string;
  ai_grading_prompt: string;
}

// 10 core OOP concepts × 3 difficulty levels = 30 questions
// Mix of types per concept
const SEED_PLAN: { concept: string; difficulty: 1 | 2 | 3; type: QuestionType }[] = [
  // Difficulty 1 — 10 questions (needed for first exam)
  { concept: 'Classes and Objects',      difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Encapsulation',            difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Inheritance',              difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Polymorphism',             difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Abstraction',              difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Interfaces',               difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Constructors',             difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Access Modifiers',         difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Method Overriding',        difficulty: 1, type: 'MULTIPLE_CHOICE' },
  { concept: 'Static vs Instance',       difficulty: 1, type: 'MULTIPLE_CHOICE' },

  // Difficulty 2 — 10 questions
  { concept: 'Classes and Objects',      difficulty: 2, type: 'FREE_FORM' },
  { concept: 'Encapsulation',            difficulty: 2, type: 'FREE_FORM' },
  { concept: 'Inheritance',              difficulty: 2, type: 'FREE_FORM' },
  { concept: 'Polymorphism',             difficulty: 2, type: 'FREE_FORM' },
  { concept: 'Abstraction',              difficulty: 2, type: 'FREE_FORM' },
  { concept: 'Interfaces',               difficulty: 2, type: 'CODE_WRITING' },
  { concept: 'Constructors',             difficulty: 2, type: 'CODE_WRITING' },
  { concept: 'Access Modifiers',         difficulty: 2, type: 'FREE_FORM' },
  { concept: 'Method Overriding',        difficulty: 2, type: 'CODE_WRITING' },
  { concept: 'Static vs Instance',       difficulty: 2, type: 'FREE_FORM' },

  // Difficulty 3 — 10 questions
  { concept: 'Classes and Objects',      difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Encapsulation',            difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Inheritance',              difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Polymorphism',             difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Abstraction',              difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Interfaces',               difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Design Patterns',          difficulty: 3, type: 'FREE_FORM' },
  { concept: 'SOLID Principles',         difficulty: 3, type: 'FREE_FORM' },
  { concept: 'Method Overriding',        difficulty: 3, type: 'CODE_WRITING' },
  { concept: 'Static vs Instance',       difficulty: 3, type: 'CODE_WRITING' },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'beginner (recall and basic understanding)',
  2: 'intermediate (application and analysis)',
  3: 'advanced (synthesis, evaluation, and complex problem-solving)',
};

async function generateOne(
  concept: string,
  type: QuestionType,
  difficulty: 1 | 2 | 3
): Promise<GeneratedQuestion> {
  const isMC = type === 'MULTIPLE_CHOICE';

  const prompt = `You are an expert C# / OOP instructor. Generate exactly 1 ${type.replace(/_/g, ' ').toLowerCase()} question about "${concept}" for an OOP course.

Difficulty: ${difficulty}/3 — ${DIFFICULTY_LABELS[difficulty]}

${isMC
  ? 'Include an "options" array with exactly 4 strings. The correct_answer must exactly match one of the options.'
  : type === 'CODE_WRITING'
    ? 'No options needed. correct_answer is a model C# solution. ai_grading_prompt evaluates student code using placeholder {{student_code}}.'
    : 'No options needed. correct_answer is a model answer. ai_grading_prompt evaluates student response using placeholder {{student_answer}}.'}

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "question_text": "...",
  ${isMC ? '"options": ["...", "...", "...", "..."],' : ''}
  "correct_answer": "...",
  "grading_rubric": "...",
  "ai_grading_prompt": "..."
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  return JSON.parse(text) as GeneratedQuestion;
}

function saveQuestion(
  concept: string,
  type: QuestionType,
  difficulty: 1 | 2 | 3,
  q: GeneratedQuestion
): void {
  const questionId = uuidv4();
  const approvalId = uuidv4();
  const optionsJson = q.options ? JSON.stringify(q.options) : null;

  db.prepare(`
    INSERT INTO questions (id, concept, type, difficulty, question_text, options, correct_answer, grading_rubric, ai_grading_prompt, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(questionId, concept, type, difficulty, q.question_text, optionsJson, q.correct_answer, q.grading_rubric, q.ai_grading_prompt);

  // Auto-approve for seeding
  db.prepare(`
    INSERT INTO question_approvals (id, question_id, status, generated_by_ai)
    VALUES (?, ?, 'APPROVED', 1)
  `).run(approvalId, questionId);
}

async function main() {
  console.log(`Seeding ${SEED_PLAN.length} questions...\n`);

  for (let i = 0; i < SEED_PLAN.length; i++) {
    const { concept, difficulty, type } = SEED_PLAN[i];
    process.stdout.write(`[${i + 1}/${SEED_PLAN.length}] ${concept} (D${difficulty}, ${type})... `);

    try {
      const q = await generateOne(concept, type, difficulty);
      saveQuestion(concept, type, difficulty, q);
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`);
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  const { cnt } = db.prepare("SELECT COUNT(*) as cnt FROM question_approvals WHERE status = 'APPROVED'").get() as { cnt: number };
  console.log(`\nDone. Approved questions in DB: ${cnt}`);
}

main().catch(console.error);
