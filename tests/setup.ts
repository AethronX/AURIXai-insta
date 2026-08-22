import { vi } from "vitest";

process.env.AUTH_SECRET ??= "test-auth-secret-please-do-not-use-in-prod-0000";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.CREDENTIALS_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.AURIX_WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.MOCK_MODE ??= "true";
// AI_PROVIDER has no schema default (lib/env.ts) — an unset value is a diagnosable
// PROVIDER_NOT_CONFIGURED error, not a silent fallback to Claude. Tests that don't specifically
// exercise that unset case need a real value here so getEnv() doesn't throw on import.
process.env.AI_PROVIDER ??= "claude";

vi.mock("server-only", () => ({}));
