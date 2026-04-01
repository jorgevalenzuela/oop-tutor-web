import Anthropic from '@anthropic-ai/sdk';
import { QuestionType, Question, GradingResult } from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Question Generation ────────────────────────────────────────────────────

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

// ─── Answer Grading ─────────────────────────────────────────────────────────

function gradeMC(question: Question, answerGiven: string): GradingResult {
  const isCorrect = answerGiven.trim() === question.correct_answer.trim();
  return {
    score: isCorrect ? 1.0 : 0.0,
    feedback: isCorrect
      ? 'Correct!'
      : `Incorrect. The correct answer is: ${question.correct_answer}`,
    isCorrect,
  };
}

function gradeConceptMatching(question: Question, answerGiven: string): GradingResult {
  // Expect answerGiven to be a JSON string of matches: [{ concept, definition }]
  // correct_answer is also a JSON string of the same shape
  try {
    const studentMatches: Record<string, string>[] = JSON.parse(answerGiven);
    const correctMatches: Record<string, string>[] = JSON.parse(question.correct_answer);

    let correct = 0;
    for (const cm of correctMatches) {
      const sm = studentMatches.find((m) => m.concept === cm.concept);
      if (sm && sm.definition === cm.definition) correct++;
    }
    const score = correctMatches.length > 0 ? correct / correctMatches.length : 0;
    const isCorrect = score >= 1.0;
    return {
      score,
      feedback: isCorrect
        ? 'Perfect match!'
        : `You matched ${correct} of ${correctMatches.length} correctly. Review the rubric: ${question.grading_rubric}`,
      isCorrect,
    };
  } catch {
    return { score: 0, feedback: 'Could not parse your answer. Please try again.', isCorrect: false };
  }
}

async function gradeWithAI(question: Question, answerGiven: string): Promise<GradingResult> {
  const placeholder = question.type === 'CODE_WRITING' ? '{{student_code}}' : '{{student_answer}}';
  const gradingPrompt = question.ai_grading_prompt.replace(placeholder, answerGiven);

  const systemPrompt = `You are a strict but fair OOP course grader. Evaluate the student's answer and return ONLY valid JSON with no markdown or explanation.

Return exactly:
{
  "score": <float 0.0 to 1.0>,
  "feedback": "<concise feedback for the student>",
  "isCorrect": <true if score >= 0.8, false otherwise>
}`;

  const userPrompt = `Question: ${question.question_text}

Correct answer / rubric:
${question.correct_answer}

Grading rubric:
${question.grading_rubric}

Student's answer:
${answerGiven}

${gradingPrompt}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude grader');
  }

  let result: { score: number; feedback: string; isCorrect: boolean };
  try {
    result = JSON.parse(content.text.trim());
  } catch {
    throw new Error('Claude grader returned invalid JSON: ' + content.text.slice(0, 200));
  }

  return {
    score: Math.max(0, Math.min(1, result.score)),
    feedback: result.feedback,
    isCorrect: result.score >= 0.8,
  };
}

export async function gradeAnswer(question: Question, answerGiven: string): Promise<GradingResult> {
  if (question.type === 'MULTIPLE_CHOICE') {
    return gradeMC(question, answerGiven);
  }
  if (question.type === 'CONCEPT_MATCHING') {
    return gradeConceptMatching(question, answerGiven);
  }
  return gradeWithAI(question, answerGiven);
}
