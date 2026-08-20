import "server-only";
import { prisma } from "@/lib/db";
import type { MemorySource } from "@prisma/client";

const CONFIDENCE_STEP = 0.15;
const CONFIDENCE_CAP = 0.95;
const CONFIDENCE_FLOOR = 0.35;

/**
 * Rejection reasons are free text. Bucketing them into a small, stable set of keys lets
 * repeated feedback reinforce the same memory entry (raising confidence) instead of spawning
 * unbounded near-duplicate rows. This is intentionally simple keyword matching, not an AI
 * call — brand memory writes must stay cheap and deterministic; Phase 4's quality reviewer and
 * Phase 9's analytics agent are the AI-driven memory sources (MemorySource.PERFORMANCE_INSIGHT).
 */
const REJECTION_KEYWORDS: Array<{ key: string; insight: string; patterns: RegExp }> = [
  {
    key: "tone.promotional_language",
    insight: "Reduce promotional / salesy language — audience reacts better to a softer tone.",
    patterns: /promo|salesy|too sales|pushy|hard.?sell/i,
  },
  {
    key: "tone.too_formal",
    insight: "Content is landing as too formal/stiff for this brand's voice.",
    patterns: /too formal|stiff|robotic|corporate/i,
  },
  {
    key: "tone.too_casual",
    insight: "Content is landing as too casual for this brand's voice.",
    patterns: /too casual|unprofessional|too informal/i,
  },
  {
    key: "hook.weak",
    insight: "Hooks aren't grabbing attention — invest more in the opening line/slide 1.",
    patterns: /weak hook|boring hook|no hook|doesn't hook|hook is weak/i,
  },
  {
    key: "cta.unclear",
    insight: "CTAs are unclear or missing — be more explicit about the desired action.",
    patterns: /cta|call.to.action/i,
  },
  {
    key: "accuracy.factual_issue",
    insight: "Content has included unverified or incorrect claims about the business.",
    patterns: /wrong|incorrect|inaccurate|not true|false claim|made up/i,
  },
  {
    key: "length.too_long",
    insight: "Captions/slides are running too long — keep future drafts tighter.",
    patterns: /too long|too much text|overcrowded|wordy/i,
  },
  {
    key: "visual.off_brand",
    insight: "Visual direction doesn't match brand identity — reinforce logo/color/style rules.",
    patterns: /off.brand|doesn't match brand|wrong colors|wrong style/i,
  },
];

function classifyFeedback(reason: string): { key: string; insight: string } {
  for (const rule of REJECTION_KEYWORDS) {
    if (rule.patterns.test(reason)) return { key: rule.key, insight: rule.insight };
  }
  return { key: "general.feedback", insight: reason.slice(0, 300) };
}

/** Records structured feedback from a rejection/change-request, reinforcing confidence on repeat. */
export async function recordFeedbackMemory(params: {
  brandId: string;
  contentId?: string;
  source: MemorySource;
  reason: string;
}): Promise<void> {
  const { key, insight } = classifyFeedback(params.reason);

  const existing = await prisma.brandMemoryEntry.findFirst({
    where: { brandId: params.brandId, key },
    orderBy: { createdAt: "desc" },
  });

  const confidence = existing
    ? Math.min(CONFIDENCE_CAP, existing.confidence + CONFIDENCE_STEP)
    : CONFIDENCE_FLOOR;

  await prisma.brandMemoryEntry.create({
    data: {
      brandId: params.brandId,
      contentId: params.contentId,
      source: params.source,
      key,
      insight,
      confidence,
    },
  });
}

export async function addManualMemory(brandId: string, key: string, insight: string) {
  return prisma.brandMemoryEntry.create({
    data: { brandId, key, insight, source: "MANUAL", confidence: 0.6 },
  });
}

export interface MemoryContextEntry {
  key: string;
  insight: string;
  confidence: number;
}

/**
 * Returns the strongest, most recent, deduplicated-by-key memory entries for a brand —
 * meant to be injected into AI prompt context. Only entries with confidence above 0.5 are
 * treated as established preferences; weaker/single-instance feedback is surfaced in the UI
 * but withheld from prompts to avoid over-fitting to one data point.
 */
export async function getMemoryContext(brandId: string, limit = 12): Promise<MemoryContextEntry[]> {
  const entries = await prisma.brandMemoryEntry.findMany({
    where: { brandId, confidence: { gte: 0.5 } },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
  });

  const byKey = new Map<string, MemoryContextEntry>();
  for (const e of entries) {
    if (!byKey.has(e.key)) {
      byKey.set(e.key, { key: e.key, insight: e.insight, confidence: e.confidence });
    }
  }
  return Array.from(byKey.values()).slice(0, limit);
}

export async function listAllMemory(brandId: string) {
  return prisma.brandMemoryEntry.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
