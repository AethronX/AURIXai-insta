import { vi } from "vitest";

process.env.AUTH_SECRET ??= "test-auth-secret-please-do-not-use-in-prod-0000";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.CREDENTIALS_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.AURIX_WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.MOCK_MODE ??= "true";

vi.mock("server-only", () => ({}));
