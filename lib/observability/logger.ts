import pino from "pino";
import { randomUUID } from "crypto";
import { getEnv } from "@/lib/env";

const env = getEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
  base: { service: "aurix-social-ai" },
});

export function newRequestId(): string {
  return randomUUID();
}

/** Returns a child logger carrying a correlation/request ID through a unit of work. */
export function childLogger(requestId: string, extra?: Record<string, unknown>) {
  return logger.child({ requestId, ...extra });
}
