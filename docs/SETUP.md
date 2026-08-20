# Setup

## Prerequisites

- Node.js 20.9+ (Next.js 16 requirement)
- PostgreSQL 14+ (any recent version works; developed against 16)
- npm (ships with Node)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

At minimum, set:

- `DATABASE_URL` — your Postgres connection string
- `AUTH_SECRET` — `openssl rand -hex 32`
- `CREDENTIALS_ENCRYPTION_KEY` — `openssl rand -base64 32`

Everything else has a safe default for local development (`MOCK_MODE=true`, no external
credentials required). See `docs/ENVIRONMENT.md` for the full reference.

### Local Postgres quick start

If you don't already have Postgres running:

```bash
# Debian/Ubuntu
sudo apt-get install postgresql
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER aurix WITH PASSWORD 'aurix_dev_password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE aurix_social_ai OWNER aurix;"
```

Then set `DATABASE_URL="postgresql://aurix:aurix_dev_password@localhost:5432/aurix_social_ai"`.

(Prisma's dev migration flow needs `CREATEDB` on the role to manage its shadow database.)

## 3. Run migrations

```bash
npm run db:migrate
```

This applies `prisma/migrations/` and generates the Prisma Client.

## 4. Seed demo data (recommended)

```bash
npm run db:seed
```

Creates a full example brand ("Acme Coffee Co") with content across every lifecycle stage,
analytics history, a strategy, brand memory, and an AI insight — so the dashboard is populated
immediately. Login with:

```
demo@aurix.ai / demo12345
```

Re-running the seed script is safe — it removes the previous demo organization/user first.

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000. You'll be redirected to `/login`; either sign in with the seeded demo
account or register a new organization (which walks you through onboarding).

## 6. (Optional) Connect real services

The app is fully usable in mock mode with zero external credentials. To connect real services:

- **Claude**: set `ANTHROPIC_API_KEY` — see `docs/AI.md`
- **Instagram**: set `META_APP_ID`/`META_APP_SECRET` — see `docs/INSTAGRAM.md`
- **n8n**: set `N8N_BASE_URL`/`N8N_WEBHOOK_SECRET`/`AURIX_WEBHOOK_SECRET` — see `docs/N8N.md`

## Common issues

| Symptom | Fix |
|---|---|
| `Prisma Migrate could not create the shadow database` | Grant `CREATEDB` to your Postgres role, or set `directUrl`/use `prisma migrate deploy` instead of `dev` |
| `Invalid environment configuration` on startup | Check `.env` against `.env.example` — `AUTH_SECRET` must be 32+ chars, `CREDENTIALS_ENCRYPTION_KEY` must be a valid base64 32-byte value |
| Generation buttons show "Claude is not configured" | Expected without `ANTHROPIC_API_KEY` — this is by design, not a bug (see `docs/AI.md`) |
| Images from the mock image provider look like flat color placeholders | Expected — `MockImageProvider` renders simple labeled SVGs so the pipeline is exercisable without a paid image API; connect a real `ImageProvider` implementation for production creative |
