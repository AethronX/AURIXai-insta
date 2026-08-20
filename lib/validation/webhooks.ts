import { z } from "zod";

export const n8nInboundEnvelopeSchema = z.object({
  eventType: z.string().min(1),
  eventId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  timestamp: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const generateRequestedPayloadSchema = z.object({
  brandId: z.string().min(1),
  format: z.enum(["POST", "CAROUSEL"]).default("POST"),
  objective: z.string().min(3),
  contentPillarId: z.string().optional(),
});
