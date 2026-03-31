# OOP Tutor — Assessment Service

AI-powered adaptive assessment platform for OOP Tutor Web.
Handles authentication, question bank, exam engine, mastery
tracking, and certificate generation.

## Stack
- Runtime: Node.js + TypeScript
- Framework: Express
- Database: SQLite via better-sqlite3
- AI Grading: Claude API

## Quick Start
```bash
cd assessment
npm install
cp .env.example .env   # fill in values
npm run dev
# API running at http://localhost:3002
```

## Structure
```
assessment/
├── src/
│   ├── routes/        ← API endpoints
│   ├── services/      ← Business logic
│   ├── models/        ← TypeScript types
│   ├── middleware/    ← Auth, validation
│   ├── database/      ← Schema, migrations
│   └── types/         ← Shared type definitions
├── DECISIONS.md       ← Engineering decisions (→ DIS)
└── README.md
```

## Iterations
- v2.1.0 — Auth + Question Bank
- v2.2.0 — Exam Engine + AI grading
- v2.3.0 — Mastery algorithm
- v2.4.0 — Certificate generation
- v2.5.0 — Instructor + TA dashboard

## Part of AI-SDLC
Engineering decisions tracked in the
[Decision Intelligence System](https://github.com/jorgevalenzuela/decision-intelligence).
See [DECISIONS.md](./DECISIONS.md) for the pointer.