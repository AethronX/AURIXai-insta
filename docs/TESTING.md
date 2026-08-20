# Testing

Three layers, matching the spec's unit/integration/e2e split.

## Unit tests — pure logic, no I/O

```bash
npm test              # vitest run
npm run test:watch    # vitest, watch mode
```

`tests/unit/`:
- `structured-output.test.ts` — the AI validate-or-repair loop, against a fake `AIProvider`
  (mocked `@/lib/ai/claude-provider` module) and a mocked Prisma client. No live Claude key needed.
- `content-status.test.ts` — the content lifecycle state machine (`canTransition`), including the
  invariant that content can never skip human approval.
- `analytics-leaderboard.test.ts` — the top/low-performer split, including the regression test for
  a real bug (a small sample overlapping the same post into both "top" and "needs attention").

## Integration tests — real PostgreSQL, real business logic, mocked external APIs

Same `npm test` command (Vitest picks up `tests/integration/**` too) — these need `DATABASE_URL`
pointing at a real Postgres instance (loaded from `.env` by `vitest.config.mts`). Each suite
creates its own `Organization`/`Brand` (unique slug) and tears it down in `afterAll` — safe to run
against a shared dev database.

- `publishing-runner.test.ts` — queues a `PublishingJob`, runs `runDuePublishingJobs()` against the
  real mock Instagram provider, asserts it reaches `PUBLISHED`; also covers a job with no images
  (fails cleanly, doesn't hang) and a not-yet-due job (untouched).
- `analytics.test.ts` — `syncAnalyticsForBrand` pulling mock metrics, `ingestExternalMetrics`
  validating and storing an n8n-pushed payload (and rejecting a malformed one), and
  `getAnalyticsSummary` aggregating totals.
- `optimization.test.ts` — the confidence gate on `applyInsight` (refuses below 0.5, succeeds
  above it writing brand memory + strategy recommendations, is idempotent on re-apply), and
  `dismissInsight` (no side effects).
- `brand-memory.test.ts` — repeated rejection feedback on the same theme reinforces confidence
  instead of duplicating rows, crosses the prompt-injection threshold, and caps at 0.95.

None of these hit Claude, Instagram, or n8n over the network — they exercise real database
writes/reads through the real service-layer functions.

## End-to-end tests — Playwright against a running server

```bash
npm run dev              # in one terminal
npm run db:seed          # freshly seed the demo brand (some e2e tests mutate it)
npm run test:e2e         # in another terminal
```

`tests/e2e/`:
- `onboarding.spec.ts` — full register → 5-step onboarding wizard → dashboard flow; an
  unauthenticated visitor redirect; and the AI-not-configured error path (verifies no crash, no
  silent no-op, whether or not a real Claude key happens to be configured in the environment
  running the test).
- `seeded-demo.spec.ts` — walks the seeded "Acme Coffee Co" brand across every surface: dashboard
  widgets, calendar, content studio (every lifecycle status), a published carousel's slides, a
  rejected item's stored reason, the analytics leaderboard, strategy pillars, brand memory, the
  mock Instagram connection, and approving pending content.

`playwright.config.ts` points at the pre-installed Chromium
(`PLAYWRIGHT_CHROMIUM_PATH`, defaults to `/opt/pw-browsers/chromium` in this environment) and
doesn't spawn the dev server itself — run it against a server you can also open in a browser
yourself when debugging a failure.

**Note on `seeded-demo.spec.ts`**: the "approving pending content" test mutates the seeded
`PENDING_APPROVAL` item to `APPROVED`. Reseed (`npm run db:seed`) before re-running the full e2e
suite if you've already run it once.

## A real bug this suite caught

The onboarding wizard's "Continue"/"Finish setup" buttons occupied the same DOM slot (a ternary
flipping `type="button"` → `type="submit"`). A scripted click landing on the exact step-4
transition could race the re-render and submit the form one step early. Found by driving the
actual browser (not by code review), root-caused via server logs (confirmed a real extra POST, not
a Playwright artifact), fixed with a `key` prop so React remounts rather than mutates the button —
see the commit history and `components/brand/onboarding-form.tsx`. This is the argument for
running the real thing in a real browser, not just trusting that code "looks correct".

## What isn't covered

- No live calls to Claude, the real Meta Graph API, or a real n8n instance — this environment has
  no credentials for any of them. The provider abstractions and mock implementations mean the
  *pipeline* is fully tested; the *actual external API behavior* is only as verified as the
  provider implementations' adherence to each API's documented contract (Anthropic's Messages API,
  Meta's Graph API, n8n's HTTP semantics).
- No load/performance testing.
- No visual regression testing (screenshots were used manually during development to verify
  design quality — see the commit history — but aren't part of the automated suite).
