# AURIX Social AI — Implementation Plan

## Audit findings

The repository (`AethronX/AURIXai-insta`, branch `claude/aurix-social-ai-platform-uvbqr0`) was
completely empty at the start of this build — no commits, no files. This is a greenfield build.

Environment available in this session:
- Node v22.22.2 / npm 10.9.7
- PostgreSQL 16 installed locally and started (`aurix_social_ai` database, `aurix` role) — used for
  real migrations, seeding, and manual verification during development.
- No `ANTHROPIC_API_KEY` configured in this session → the Claude provider is built for real against
  the Anthropic SDK, but generation calls cannot be exercised live here. `MOCK_MODE` and provider
  abstractions let the whole pipeline be verified without it.
- No Instagram/Meta or n8n credentials configured → Instagram publishing and n8n calls are built
  against real contracts (Graph API adapter, signed webhooks) but run through mock providers here.
- Chromium is pre-installed for Playwright e2e tests.

## Key engineering decisions

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict | Matches requested stack, server actions + route handlers cover both UI and n8n-facing APIs |
| Styling | Tailwind CSS v3.4 + small design-token layer | Stable, fast, avoids v4 tooling churn |
| Database | PostgreSQL + Prisma ORM | Requested; strong typing, migration story |
| Auth | Auth.js (NextAuth v5) Credentials provider, bcrypt, DB sessions | Self-hosted, no external SaaS dependency, org-scoped from day one |
| AI | `AIProvider` interface; `ClaudeProvider` (Anthropic SDK) as the only implementation initially | Swappable, testable with `MockAIProvider` |
| Images | `ImageProvider` interface; mock provider now, provider slot for a real API (e.g. Anthropic-compatible image gen / third-party) later | No credentials available now; never fake success silently |
| Social publishing | `SocialPlatformProvider` interface; `InstagramGraphProvider` (Meta Graph API) + `MockInstagramProvider` | Instagram first, future platforms slot in cleanly |
| Automation | n8n calls into the app via signed webhooks; app calls out to n8n via a thin `N8nClient` | Business logic stays in the app and is unit-testable, not buried in n8n |
| Multi-tenancy | `Organization → Brand → {Content, Calendar, Analytics, Integration}` from the first migration | Avoids a painful rewrite later, even though v1 UI only exposes one org/brand |
| Validation | Zod schemas for every AI structured output + every API boundary | Required — never trust raw LLM output |
| Testing | Vitest (unit/integration) + Playwright (e2e, using the pre-installed Chromium) | Matches environment, fast feedback |
| Logging | `pino` structured logger with request/correlation IDs, `AuditEvent`/`AIJob` DB tables for durable observability | Cheap, production-grade |

## Phases (tracked as tasks #1–#10)

1. Audit + this plan.
2. Foundation — Next.js/Tailwind/Prisma scaffold, env config, auth, base layout, logging, error
   handling primitives.
3. Brand Brain — onboarding, brand profile, visual identity, content rules, brand memory/feedback.
4. AI Content Engine — `AIProvider`/`ImageProvider` abstractions, prompt library with versioning,
   strategy agent, content/carousel/caption generator, creative director, quality reviewer, Zod
   validation + repair loop.
5. Content Workspace — calendar (statuses per spec §10), content studio, carousel editor, approval
   workflow with stored rejection feedback, content versions.
6. n8n integration — signed/idempotent webhook endpoints, event contract, `docs/n8n/` workflow specs
   + importable JSON templates for the 5 workflows in the spec.
7. Instagram publishing — provider interface, Graph API adapter, mock provider, publishing job queue
   with retries/backoff and status tracking, `MOCK_MODE`.
8. Analytics engine — normalized metrics schema, ingestion, dashboard, AI analytics agent.
9. Self-improvement loop — pattern detection over analytics, confidence-gated strategy
   recommendations (never silently rewrites brand rules).
10. QA — seed data, docs set, tests, lint/typecheck/build green, final deliverable report.

## Acceptance walkthrough (spec §41)

Every step of the 24-step flow in the spec is implemented against real DB-backed services. Where an
external credential (Claude API key, Instagram token, n8n instance) is absent in this dev environment,
the corresponding provider runs in `MOCK_MODE` and is clearly labeled as such in the UI and in the
final report — never presented as a live integration.
