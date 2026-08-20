import { z } from "zod";

/**
 * Every AI structured output is validated against one of these schemas before it ever reaches
 * the database (see lib/ai/structured-output.ts). Invalid output triggers a repair retry, never
 * a silent pass-through.
 */

export const strategyOutputSchema = z.object({
  strategy: z.string().min(20),
  contentPillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        targetRatio: z.number().min(0).max(1).optional(),
      })
    )
    .min(2)
    .max(8),
  weeklyThemes: z.array(z.string()).min(1),
  recommendedFormats: z.array(z.string()).min(1),
  goals: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
});
export type StrategyOutput = z.infer<typeof strategyOutputSchema>;

export const postOutputSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  hook: z.string().min(1),
  caption: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).max(30),
  visualDirection: z.string().min(1),
  assumptions: z.array(z.string()).default([]),
});
export type PostOutput = z.infer<typeof postOutputSchema>;

export const carouselSlideSchema = z.object({
  number: z.number().int().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
  purpose: z.string().min(1),
  visualDirection: z.string().min(1),
  cta: z.string().optional().default(""),
});

export const carouselOutputSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  hook: z.string().min(1),
  slides: z.array(carouselSlideSchema).min(3).max(10),
  caption: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).max(30),
  assumptions: z.array(z.string()).default([]),
});
export type CarouselOutput = z.infer<typeof carouselOutputSchema>;

export const captionOutputSchema = z.object({
  caption: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).max(30),
});
export type CaptionOutput = z.infer<typeof captionOutputSchema>;

export const creativeBriefSchema = z.object({
  briefs: z
    .array(
      z.object({
        slideNumber: z.number().int().nullable(),
        layoutRecommendation: z.string().min(1),
        visualHierarchy: z.string().min(1),
        typography: z.string().min(1),
        imageryDirection: z.string().min(1),
        composition: z.string().min(1),
        ctaPlacement: z.string().min(1),
        brandingPlacement: z.string().min(1),
        aspectRatio: z.string().min(1),
        safeAreaNotes: z.string().min(1),
      })
    )
    .min(1),
});
export type CreativeBriefOutput = z.infer<typeof creativeBriefSchema>;

export const qualityScoreBreakdownSchema = z.object({
  hook: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  value: z.number().min(0).max(100),
  brandFit: z.number().min(0).max(100),
  audienceFit: z.number().min(0).max(100),
  originality: z.number().min(0).max(100),
  cta: z.number().min(0).max(100),
  visualDirection: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  platformFit: z.number().min(0).max(100),
});

export const qualityReviewOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  scores: qualityScoreBreakdownSchema,
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  approved: z.boolean(),
});
export type QualityReviewOutput = z.infer<typeof qualityReviewOutputSchema>;

export const analyticsInsightOutputSchema = z.object({
  summary: z.string().min(1),
  winningPatterns: z.array(z.string()).default([]),
  losingPatterns: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  experiments: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});
export type AnalyticsInsightOutput = z.infer<typeof analyticsInsightOutputSchema>;
