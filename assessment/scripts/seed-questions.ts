/**
 * seed-questions.ts
 * Generates 9 questions per assessable OOP concept across all 6 Bloom's levels:
 *   Level 1 (Remember)  : 2 questions — MULTIPLE_CHOICE
 *   Level 2 (Understand): 2 questions — FREE_FORM
 *   Level 3 (Apply)     : 2 questions — CODE_WRITING
 *   Level 4 (Analyze)   : 1 question  — FREE_FORM
 *   Level 5 (Evaluate)  : 1 question  — FREE_FORM
 *   Level 6 (Create)    : 1 question  — CODE_WRITING
 *
 * Total: 9 × 28 concepts = 252 questions, all saved as PENDING_REVIEW.
 *
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
type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface GeneratedQuestion {
  question_text: string;
  options?: string[];
  correct_answer: string;
  grading_rubric: string;
  ai_grading_prompt: string;
}

// ─── Assessable nodes — mirrors getAssessableNodes() from oopHierarchy.ts ────
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

// ─── Bloom level metadata ─────────────────────────────────────────────────────

const BLOOM_LABELS: Record<BloomLevel, string> = {
  1: 'Remember — recall facts and definitions',
  2: 'Understand — explain concepts in own words',
  3: 'Apply — use the concept to solve a problem',
  4: 'Analyze — break down, compare, or identify issues',
  5: 'Evaluate — justify, critique, or assess a design',
  6: 'Create — design, construct, or produce a solution',
};

const BLOOM_STARTERS: Record<BloomLevel, string> = {
  1: 'Start with "Define...", "What is...", or "List the..."',
  2: 'Start with "Explain...", "Describe in your own words...", or "Give an example of..."',
  3: 'Start with "Write code that...", "Use [concept] to solve...", or "Implement a..."',
  4: 'Start with "Compare and contrast...", "What is the difference between...", or "Identify the problem in this code..."',
  5: 'Start with "Justify why...", "Which design is better and why...", or "Critique this implementation..."',
  6: 'Start with "Design a class hierarchy for...", "Write a complete solution for...", or "Create a system that..."',
};

// difficulty mapping: lower Bloom levels use D1, higher use D2/D3
const BLOOM_TO_DIFFICULTY: Record<BloomLevel, 1 | 2 | 3> = {
  1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3,
};

interface SeedItem {
  concept: string;
  bloomLevel: BloomLevel;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
}

// 9 questions per concept: 2+2+2+1+1+1 across Bloom's levels 1–6
const BLOOM_PLAN: Array<{ bloomLevel: BloomLevel; type: QuestionType; count: number }> = [
  { bloomLevel: 1, type: 'MULTIPLE_CHOICE', count: 2 },
  { bloomLevel: 2, type: 'FREE_FORM',       count: 2 },
  { bloomLevel: 3, type: 'CODE_WRITING',    count: 2 },
  { bloomLevel: 4, type: 'FREE_FORM',       count: 1 },
  { bloomLevel: 5, type: 'FREE_FORM',       count: 1 },
  { bloomLevel: 6, type: 'CODE_WRITING',    count: 1 },
];

const SEED_PLAN: SeedItem[] = ASSESSABLE_CONCEPTS.flatMap(concept =>
  BLOOM_PLAN.flatMap(({ bloomLevel, type, count }) =>
    Array.from({ length: count }, () => ({
      concept,
      bloomLevel,
      type,
      difficulty: BLOOM_TO_DIFFICULTY[bloomLevel],
    }))
  )
);

// ─── Generation ───────────────────────────────────────────────────────────────

async function generateOne(
  concept: string,
  type: QuestionType,
  difficulty: 1 | 2 | 3,
  bloomLevel: BloomLevel
): Promise<GeneratedQuestion> {
  const isMC = type === 'MULTIPLE_CHOICE';
  const isCode = type === 'CODE_WRITING';

  const typeInstructions = isMC
    ? 'Include an "options" array with exactly 4 strings. The correct_answer must exactly match one of the options.'
    : isCode
      ? 'No options needed. correct_answer is a model C# code solution. ai_grading_prompt evaluates student code using placeholder {{student_code}}.'
      : 'No options needed. correct_answer is a model answer. ai_grading_prompt evaluates student response using placeholder {{student_answer}}.';

  const prompt = `You are an expert C# / OOP instructor. Generate exactly 1 ${type.replace(/_/g, ' ').toLowerCase()} question about "${concept}" for an OOP course.

Difficulty: ${difficulty}/3
Bloom's Taxonomy level: ${bloomLevel}/6 — ${BLOOM_LABELS[bloomLevel]}
${BLOOM_STARTERS[bloomLevel]}

Context: The question should test understanding of "${concept}" at the specified Bloom's level, including sub-topics it encompasses.

${typeInstructions}

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

  // Strip markdown code fences if present
  const cleaned = text.startsWith('```')
    ? text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    : text;

  return JSON.parse(cleaned) as GeneratedQuestion;
}

function saveQuestion(
  concept: string,
  type: QuestionType,
  difficulty: 1 | 2 | 3,
  bloomLevel: BloomLevel,
  q: GeneratedQuestion
): void {
  const questionId = uuidv4();
  const approvalId = uuidv4();
  const optionsJson = q.options ? JSON.stringify(q.options) : null;

  db.prepare(`
    INSERT INTO questions (id, concept, type, difficulty, bloom_level, question_text, options, correct_answer, grading_rubric, ai_grading_prompt, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(questionId, concept, type, difficulty, bloomLevel, q.question_text, optionsJson, q.correct_answer, q.grading_rubric, q.ai_grading_prompt);

  db.prepare(`
    INSERT INTO question_approvals (id, question_id, status, generated_by_ai)
    VALUES (?, ?, 'PENDING_REVIEW', 1)
  `).run(approvalId, questionId);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${SEED_PLAN.length} questions`);
  console.log(`(${ASSESSABLE_CONCEPTS.length} concepts × 9 questions each, Bloom levels 1–6)\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < SEED_PLAN.length; i++) {
    const { concept, difficulty, type, bloomLevel } = SEED_PLAN[i];
    process.stdout.write(`[${String(i + 1).padStart(3)}/${SEED_PLAN.length}] ${concept.padEnd(30)} B${bloomLevel} D${difficulty} ${type.padEnd(16)}... `);

    try {
      const q = await generateOne(concept, type, difficulty, bloomLevel);
      saveQuestion(concept, type, difficulty, bloomLevel, q);
      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`);
      fail++;
    }

    // Polite pacing to avoid rate limits
    await new Promise(r => setTimeout(r, 400));
  }

  const { cnt } = db.prepare("SELECT COUNT(*) as cnt FROM question_approvals WHERE status = 'PENDING_REVIEW'").get() as { cnt: number };
  console.log(`\nDone. Generated: ${ok} ✓  Failed: ${fail} ✗`);
  console.log(`Total PENDING_REVIEW questions in DB: ${cnt}`);
  console.log(`\nNext step: Review and approve questions via the Instructor Dashboard.`);
}

main().catch(console.error);
