import { z } from "zod";

export const voiceToneSchema = z.enum([
  "PROFESSIONAL",
  "FRIENDLY",
  "BOLD",
  "EDUCATIONAL",
  "LUXURY",
  "MINIMAL",
  "HUMOROUS",
  "INSPIRATIONAL",
  "TECHNICAL",
]);

export const dialectSchema = z.enum(["MSA", "EGYPTIAN", "GULF", "LEVANTINE", "MAGHREBI", "NONE"]);

const stringListFromTextarea = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
  );

export const businessSchema = z.object({
  name: z.string().min(2, "Brand name is required").max(120),
  industry: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  website: z.string().max(300).optional().or(z.literal("")),
  instagram: z.string().max(120).optional().or(z.literal("")),
  location: z.string().max(160).optional().or(z.literal("")),
  targetMarket: z.string().max(500).optional().or(z.literal("")),
  products: stringListFromTextarea,
  services: stringListFromTextarea,
});

export const audienceSchema = z.object({
  targetCustomer: z.string().max(500).optional().or(z.literal("")),
  ageRangeMin: z.coerce.number().int().min(0).max(120).optional(),
  ageRangeMax: z.coerce.number().int().min(0).max(120).optional(),
  interests: stringListFromTextarea,
  painPoints: stringListFromTextarea,
  desires: stringListFromTextarea,
  buyingBehavior: z.string().max(1000).optional().or(z.literal("")),
});

export const voiceSchema = z.object({
  primaryTone: voiceToneSchema,
  secondaryTones: z.array(voiceToneSchema).default([]),
  customInstructions: z.string().max(2000).optional().or(z.literal("")),
});

export const visualIdentitySchema = z.object({
  logoUrl: z.string().optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex color like #4F46E5")
    .optional()
    .or(z.literal("")),
  secondaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional()
    .or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional()
    .or(z.literal("")),
  fontPrimary: z.string().max(120).optional().or(z.literal("")),
  fontSecondary: z.string().max(120).optional().or(z.literal("")),
  imageStyle: z.string().max(500).optional().or(z.literal("")),
  designReferences: stringListFromTextarea,
});

export const contentRulesSchema = z.object({
  wordsToUse: stringListFromTextarea,
  wordsToAvoid: stringListFromTextarea,
  claimsToAvoid: stringListFromTextarea,
  topicsToAvoid: stringListFromTextarea,
  ctaStyle: z.string().max(500).optional().or(z.literal("")),
  hashtagStrategy: z.string().max(500).optional().or(z.literal("")),
  language: z.string().min(2).max(10).default("en"),
  dialect: dialectSchema.default("NONE"),
});

export const onboardingSchema = businessSchema.merge(
  z.object({
    audience: audienceSchema,
    voice: voiceSchema,
    visualIdentity: visualIdentitySchema,
    contentRules: contentRulesSchema,
  })
);

export type BusinessInput = z.infer<typeof businessSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;
export type VoiceInput = z.infer<typeof voiceSchema>;
export type VisualIdentityInput = z.infer<typeof visualIdentitySchema>;
export type ContentRulesInput = z.infer<typeof contentRulesSchema>;
