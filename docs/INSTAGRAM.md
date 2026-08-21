# Instagram / Meta Configuration

Instagram publishing is implemented against the real Meta Graph API (Instagram Content Publishing
+ Insights). It is behind a `SocialPlatformProvider` interface (`lib/social/provider.ts`) with two
implementations:

- `InstagramGraphProvider` (`lib/social/instagram/graph-provider.ts`) — real API calls.
- `MockInstagramProvider` (`lib/social/instagram/mock-provider.ts`) — deterministic simulated
  publish/analytics, used automatically whenever no Instagram integration is connected and
  `MOCK_MODE=true` (the default).

`lib/social/registry.ts` picks between them per brand — never presents mock output as if it were
a live connection (the Integrations page and every publishing job record whether `mock: true`).

## Requirements for a real connection

1. A **Meta App** (developers.facebook.com) with the **Instagram Graph API** product added.
2. A **Facebook Page** connected to an **Instagram Professional (Business or Creator) account**.
3. App review / permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`,
   `business_management`. (Development-mode apps can publish to accounts added as testers without
   full App Review.)
4. Environment variables:

   ```bash
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=https://your-domain.com/api/integrations/instagram/callback
   ```

## Connecting

In **Settings → Instagram**, click **Connect with Meta**. This is disabled with an explanatory
message until `META_APP_ID`/`META_APP_SECRET` are set — AURIX never pretends a connection exists.

The OAuth flow (`app/api/integrations/instagram/callback/route.ts`):

1. Exchanges the authorization `code` for a short-lived user token.
2. Exchanges that for a long-lived token (`fb_exchange_token`).
3. Lists the user's Facebook Pages and finds the one with a connected `instagram_business_account`.
4. Stores `{ accessToken, igUserId }` **encrypted at rest** (AES-256-GCM, `CREDENTIALS_ENCRYPTION_KEY`)
   on the brand's `Integration` row, status `CONNECTED`.

## Mock connection (for development/testing without a Meta app)

**Settings → Instagram → "Use mock connection for testing"** sets the integration status to
`MOCK` and every subsequent publish uses `MockInstagramProvider`. This is clearly labeled
everywhere (Settings badge, `PublishingJob.provider = "mock"`, audit log `mock: true`) — it is
never presented as a real connection, and switching `MOCK_MODE=false` in production disables the
fallback entirely (publishing then requires a real `CONNECTED` integration).

## Publishing requirements

- **Image URLs must be public HTTPS** the Graph API can fetch. The default local-disk storage
  provider (`lib/storage/local-provider.ts`) serves files from `{APP_URL}/uploads/...`, which only
  works if `APP_URL` is a publicly reachable HTTPS origin. For any deployment where you intend to
  actually publish, configure `STORAGE_PROVIDER=s3` (or another public object store) — see
  `docs/ENVIRONMENT.md`.
- Carousels: each slide is uploaded as a carousel item container, then combined into one
  `media_type: CAROUSEL` container before publishing — see `InstagramGraphProvider.publish`.

## Analytics

Metrics can be pulled two ways:

1. **n8n-driven** (recommended, see `docs/n8n/workflow-3-analytics-sync.md`) — n8n calls the Graph
   API's Insights endpoint directly and pushes normalized results into AURIX.
2. **AURIX-driven** — `provider.getAnalytics(externalPostId)` is implemented on both providers and
   used by `lib/analytics/sync.ts` if you prefer AURIX to own the Graph API calls itself.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Instagram connection required" error on publish | No `CONNECTED`/`MOCK` integration and `MOCK_MODE=false` |
| OAuth callback redirects with `instagram=error` | Check the `message` query param — usually a missing Page/Instagram link, or an app not yet approved for the requested scopes |
| Publish succeeds in mock but fails for real | Almost always the image URL isn't publicly fetchable — check `STORAGE_PROVIDER` |
| Graph API 190 error | Access token expired — reconnect via Settings |
