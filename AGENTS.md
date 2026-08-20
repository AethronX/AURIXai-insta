<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AURIX Social AI — project guidance

Read `docs/ARCHITECTURE.md` first. Key rules for working in this codebase:

- **Provider interfaces, not vendor SDKs, in business logic.** `AIProvider`, `ImageProvider`,
  `SocialPlatformProvider`, `StorageProvider` (all in `lib/*/provider.ts` or similar) are the only
  places that should import `@anthropic-ai/sdk` or call the Meta Graph API directly. New AI/image/
  social/storage capabilities implement the existing interface rather than reaching around it.
- **Business logic lives in `lib/`, not in pages or Server Actions.** `app/**/page.tsx` and
  `lib/actions/*.ts` should stay thin — resolve session, call a `lib/**` function, render/return.
  This is what keeps `tests/integration/*` able to exercise real logic without Next.js running.
- **Every AI generator goes through `generateValidatedJSON`** (`lib/ai/structured-output.ts`).
  Don't hand-roll a new Claude call + JSON.parse — extend the existing pipeline.
- **Never let AI output bypass human approval.** The `ContentStatus` transition table
  (`lib/content/status.ts`) has no path from AI review to `SCHEDULED`/`PUBLISHED` without passing
  through `APPROVED`, which only a human-triggered action sets. Preserve this if you touch the
  state machine.
- **`import "server-only"` files cannot run under plain `tsx`** (e.g. `prisma/seed.ts`) — it only
  resolves via Next's bundler `react-server` condition. Seed/CLI scripts talk to Prisma directly.
- **Prisma client property names**: models with a leading acronym (`AIJob`, `AIInsight`) generate
  `prisma.aIJob` / `prisma.aIInsight` (Prisma lowercases only the first character). Not a typo.
- **Never pass an inline closure wrapping a `"use server"` action from a Server Component directly
  into a Client Component prop** — Next.js rejects it at runtime ("Event handlers cannot be passed
  to Client Component props"). Wrap the call in a small dedicated Client Component instead (see
  `components/analytics/sync-button.tsx` for the pattern, and the Phase 8 commit that fixed a real
  instance of this).
- **A conditional swap of a button's `type` attribute across the same DOM slot** (e.g.
  `type="button"` in one branch, `type="submit"` in another, same JSX position) can race with a
  fast click and submit early. Give each branch a distinct `key` so React remounts instead of
  patching the attribute in place — see `components/brand/onboarding-form.tsx` and the commit that
  fixed this exact bug (found via Playwright, confirmed via server logs).
- **Run the real thing before calling something done.** This app has real Postgres available
  locally in dev; use `npm run db:seed` + the running dev server + Playwright to verify UI changes
  actually work, not just that they typecheck. Several real bugs in this codebase's history were
  only caught that way, not by reading the code.

Docs index: `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/ENVIRONMENT.md`, `docs/DATABASE.md`,
`docs/AI.md`, `docs/N8N.md`, `docs/INSTAGRAM.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`.
