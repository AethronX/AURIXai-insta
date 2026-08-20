# AURIX Social AI

An AI-powered Instagram content operations platform: brand intelligence, strategy, content and
carousel generation, human approval workflows, scheduling/publishing, analytics, and an AI
insights loop that feeds learnings back into future content — built on Next.js, PostgreSQL/Prisma,
and Claude.

## Quick start

```bash
cp .env.example .env        # fill in secrets (see docs/ENVIRONMENT.md)
npm install
npm run db:migrate          # creates schema against DATABASE_URL
npm run db:seed             # optional: realistic demo brand + content
npm run dev
```

Open http://localhost:3000. The app runs fully in `MOCK_MODE` (the default) with zero external
credentials — Instagram publishing, image generation, and analytics sync are simulated so you can
exercise the entire pipeline before connecting real accounts.

## Documentation

- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — audit + phased build plan
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture
- [`docs/SETUP.md`](docs/SETUP.md) — local setup
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — every environment variable explained
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema and migrations
- [`docs/AI.md`](docs/AI.md) — Claude configuration and prompt system
- [`docs/N8N.md`](docs/N8N.md) — automation/orchestration contract and workflows
- [`docs/INSTAGRAM.md`](docs/INSTAGRAM.md) — Meta/Instagram Graph API setup
- [`docs/TESTING.md`](docs/TESTING.md) — running unit/integration/e2e tests
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying to production

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma · Claude
(`@anthropic-ai/sdk`) · Zod · Vitest · Playwright
