/**
 * seed-questions.ts
 * Generates 3 D1 questions per assessable concept/category node from the OOP
 * hierarchy — the 1:1 curriculum source of truth.
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

// ─── Assessable nodes — mirrors getAssessableNodes() from oopHierarchy.ts ────
// Every concept/category node in the hierarchy; leaf nodes are excluded.
// Questions here cover child leaf content too (e.g. Constructors questions
// cover Default Constructor and Parametrized Constructor leaf topics).

const ASSESSABLE_CONCEPTS: string[] = [
  // ── Data Types ──────────────────────────────────────────────────────────
  'Data Types',
  'Value Types',
  'Reference Types',

  // ── Fundamentals ────────────────────────────────────────────────────────
  'Fundamentals',

  // ── Four Pillars ────────────────────────────────────────────────────────
  'Four Pillars',
  '1. Encapsulation',
  'Object State',
  'Object Behavior',
  'Method Signature',
  'Constructors',
  'Parameters',
  'Data Hiding',
  'Access Modifiers',
  '2. Inheritance',
  '3. Polymorphism',
  'Overloading',
  'Overriding',
  'Subtype / Inclusion',
  '4. Abstraction',

  // ── Relationships ────────────────────────────────────────────────────────
  'Relationships',
  'IS_A',
  'Inheritance (Extends)',
  'Realization (Implements)',
  'HAS_A',
  'Dependency (weakest)',
  'Association',
  'Composition (strong ownership)',
  'Aggregation (weak ownership)',
];

// 3 D1 questions per concept — mix MC / FREE_FORM
const TYPES_PER_CONCEPT: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_CHOICE',
  'FREE_FORM',
];

interface SeedItem {
  concept: string;
  difficulty: 1 | 2 | 3;
  type: QuestionType;
}

const SEED_PLAN: SeedItem[] = ASSESSABLE_CONCEPTS.flatMap(concept =>
  TYPES_PER_CONCEPT.map(type => ({ concept, difficulty: 1 as const, type }))
);

async function generateOne(
  concept: string,
  type: QuestionType,
  difficulty: 1 | 2 | 3
): Promise<GeneratedQuestion> {
  const isMC = type === 'MULTIPLE_CHOICE';

  const prompt = `You are an expert C# / OOP instructor. Generate exactly 1 ${type.replace(/_/g, ' ').toLowerCase()} question about "${concept}" for an OOP course.

Difficulty: ${difficulty}/3 — beginner (recall and basic understanding)

Context: This question is for a concept map node named "${concept}". The question should test understanding of this specific concept, including any sub-topics it encompasses (e.g. a "Constructors" question may cover default vs parametrized constructors; an "Access Modifiers" question may cover public/private/protected).

${isMC
  ? 'Include an "options" array with exactly 4 strings. The correct_answer must exactly match one of the options.'
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

  db.prepare(`
    INSERT INTO question_approvals (id, question_id, status, generated_by_ai)
    VALUES (?, ?, 'APPROVED', 1)
  `).run(approvalId, questionId);
}

async function main() {
  console.log(`Seeding ${SEED_PLAN.length} questions (${ASSESSABLE_CONCEPTS.length} concepts × ${TYPES_PER_CONCEPT.length} questions each)...\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < SEED_PLAN.length; i++) {
    const { concept, difficulty, type } = SEED_PLAN[i];
    process.stdout.write(`[${i + 1}/${SEED_PLAN.length}] ${concept} (D${difficulty}, ${type})... `);

    try {
      const q = await generateOne(concept, type, difficulty);
      saveQuestion(concept, type, difficulty, q);
      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  const { cnt } = db.prepare("SELECT COUNT(*) as cnt FROM question_approvals WHERE status = 'APPROVED'").get() as { cnt: number };
  console.log(`\nDone. Generated: ${ok} ✓  Failed: ${fail} ✗`);
  console.log(`Total approved questions in DB: ${cnt}`);
}

main().catch(console.error);
