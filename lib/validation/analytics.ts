import { z } from "zod";

export const externalMetricsPayloadSchema = z.object({
  contentId: z.string().min(1),
  capturedAt: z.string().datetime().optional(),
  source: z.string().default("n8n_external"),
  metrics: z.object({
    likes: z.number().int().min(0).default(0),
    comments: z.number().int().min(0).default(0),
    shares: z.number().int().min(0).default(0),
    saves: z.number().int().min(0).default(0),
    reach: z.number().int().min(0).default(0),
    impressions: z.number().int().min(0).default(0),
    profileVisits: z.number().int().min(0).default(0),
    followerDelta: z.number().int().default(0),
  }),
});
export type ExternalMetricsPayload = z.infer<typeof externalMetricsPayloadSchema>;
