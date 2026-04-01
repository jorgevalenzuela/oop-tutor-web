import Anthropic from '@anthropic-ai/sdk';
import { QuestionType } from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GeneratedQuestion {
  question_text: string;
  options?: string[];
  correct_answer: string;
  grading_rubric: string;
  ai_grading_prompt: string;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'beginner (recall and basic understanding)',
  2: 'intermediate (application and analysis)',
  3: 'advanced (synthesis, evaluation, and complex problem-solving)',
};

const TYPE_INSTRUCTIONS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE:
    'Include an "options" array with exactly 4 strings (A–D choices, without the letter prefix). The correct_answer must be one of the option strings exactly.',
  FREE_FORM:
    'No options field needed. correct_answer should be a model answer. ai_grading_prompt should be a prompt template for grading student responses (use {{student_answer}} as a placeholder).',
  CODE_WRITING:
    'No options field needed. correct_answer should be a model solution. ai_grading_prompt should prompt an AI to evaluate student code for correctness and style (use {{student_code}} as placeholder).',
  CONCEPT_MATCHING:
    'No options field needed. correct_answer should describe the correct matching. ai_grading_prompt should guide grading of student matching answers (use {{student_answer}} as placeholder).',
};

export async function generateQuestions(
  concept: string,
  type: QuestionType,
  difficulty: 1 | 2 | 3,
  count: number
): Promise<GeneratedQuestion[]> {
  const diffLabel = DIFFICULTY_LABELS[difficulty];
  const typeInstructions = TYPE_INSTRUCTIONS[type];

  const prompt = `You are an expert computer science instructor creating questions for an Object-Oriented Programming course.

Generate exactly ${count} ${type.replace(/_/g, ' ').toLowerCase()} question(s) about the OOP concept: "${concept}"

Difficulty: ${difficulty}/3 — ${diffLabel}

Question type instructions:
${typeInstructions}

Return ONLY a valid JSON array with no markdown, no explanation, no code fences. Each element must have:
- "question_text": string — the question asked to the student
${type === 'MULTIPLE_CHOICE' ? '- "options": string[] — exactly 4 answer choices\n' : ''}- "correct_answer": string — the correct answer or model solution
- "grading_rubric": string — human-readable rubric explaining how to grade this question
- "ai_grading_prompt": string — a prompt template for an AI grader to evaluate student responses

Example output format:
[
  {
    "question_text": "...",
    ${type === 'MULTIPLE_CHOICE' ? '"options": ["...", "...", "...", "..."],' : ''}
    "correct_answer": "...",
    "grading_rubric": "...",
    "ai_grading_prompt": "..."
  }
]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let parsed: GeneratedQuestion[];
  try {
    parsed = JSON.parse(content.text.trim());
  } catch {
    throw new Error('Claude returned invalid JSON. Raw: ' + content.text.slice(0, 200));
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Claude returned an empty or non-array response');
  }

  return parsed;
}
