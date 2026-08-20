import "server-only";
import { prisma } from "@/lib/db";
import { getMemoryContext } from "@/lib/brand/memory";

/**
 * A compact, structured summary of everything the AI needs to know about a brand —
 * built once per generation call from selective retrieval, never by dumping the whole
 * database into the prompt (see docs/AI.md § cost control).
 */
export interface BrandContext {
  id: string;
  name: string;
  industry: string | null;
  description: string | null;
  products: string[];
  services: string[];
  location: string | null;
  targetMarket: string | null;
  audience: {
    targetCustomer: string | null;
    ageRange: string | null;
    interests: string[];
    painPoints: string[];
    desires: string[];
    buyingBehavior: string | null;
  } | null;
  voice: {
    primaryTone: string;
    secondaryTones: string[];
    customInstructions: string | null;
  } | null;
  visualIdentity: {
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    fontPrimary: string | null;
    imageStyle: string | null;
  } | null;
  contentRules: {
    wordsToUse: string[];
    wordsToAvoid: string[];
    claimsToAvoid: string[];
    topicsToAvoid: string[];
    ctaStyle: string | null;
    hashtagStrategy: string | null;
    language: string;
    dialect: string;
  } | null;
  learnedPreferences: Array<{ insight: string; confidence: number }>;
  activeStrategySummary: string | null;
  topPillars: Array<{ name: string; description: string }>;
}

export async function buildBrandContext(brandId: string): Promise<BrandContext> {
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
    include: {
      audience: true,
      voice: true,
      visualIdentity: true,
      contentRules: true,
    },
  });

  const [memory, activeStrategy, pillars] = await Promise.all([
    getMemoryContext(brandId),
    prisma.strategy.findFirst({ where: { brandId, isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.contentPillar.findMany({ where: { brandId }, take: 6, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    id: brand.id,
    name: brand.name,
    industry: brand.industry,
    description: brand.description,
    products: brand.products,
    services: brand.services,
    location: brand.location,
    targetMarket: brand.targetMarket,
    audience: brand.audience
      ? {
          targetCustomer: brand.audience.targetCustomer,
          ageRange:
            brand.audience.ageRangeMin != null && brand.audience.ageRangeMax != null
              ? `${brand.audience.ageRangeMin}-${brand.audience.ageRangeMax}`
              : null,
          interests: brand.audience.interests,
          painPoints: brand.audience.painPoints,
          desires: brand.audience.desires,
          buyingBehavior: brand.audience.buyingBehavior,
        }
      : null,
    voice: brand.voice
      ? {
          primaryTone: brand.voice.primaryTone,
          secondaryTones: brand.voice.secondaryTones,
          customInstructions: brand.voice.customInstructions,
        }
      : null,
    visualIdentity: brand.visualIdentity
      ? {
          primaryColor: brand.visualIdentity.primaryColor,
          secondaryColor: brand.visualIdentity.secondaryColor,
          accentColor: brand.visualIdentity.accentColor,
          fontPrimary: brand.visualIdentity.fontPrimary,
          imageStyle: brand.visualIdentity.imageStyle,
        }
      : null,
    contentRules: brand.contentRules
      ? {
          wordsToUse: brand.contentRules.wordsToUse,
          wordsToAvoid: brand.contentRules.wordsToAvoid,
          claimsToAvoid: brand.contentRules.claimsToAvoid,
          topicsToAvoid: brand.contentRules.topicsToAvoid,
          ctaStyle: brand.contentRules.ctaStyle,
          hashtagStrategy: brand.contentRules.hashtagStrategy,
          language: brand.contentRules.language,
          dialect: brand.contentRules.dialect,
        }
      : null,
    learnedPreferences: memory.map((m) => ({ insight: m.insight, confidence: m.confidence })),
    activeStrategySummary: activeStrategy?.summary ?? null,
    topPillars: pillars.map((p) => ({ name: p.name, description: p.description })),
  };
}

/** Renders the brand context as compact, LLM-friendly plain text for prompt interpolation. */
export function renderBrandContext(ctx: BrandContext): string {
  const lines: string[] = [];
  lines.push(`Brand: ${ctx.name}${ctx.industry ? ` (${ctx.industry})` : ""}`);
  if (ctx.description) lines.push(`Description: ${ctx.description}`);
  if (ctx.products.length) lines.push(`Products: ${ctx.products.join(", ")}`);
  if (ctx.services.length) lines.push(`Services: ${ctx.services.join(", ")}`);
  if (ctx.location) lines.push(`Location: ${ctx.location}`);
  if (ctx.targetMarket) lines.push(`Target market: ${ctx.targetMarket}`);

  if (ctx.audience) {
    lines.push("Audience:");
    if (ctx.audience.targetCustomer) lines.push(`- Who: ${ctx.audience.targetCustomer}`);
    if (ctx.audience.ageRange) lines.push(`- Age range: ${ctx.audience.ageRange}`);
    if (ctx.audience.interests.length) lines.push(`- Interests: ${ctx.audience.interests.join(", ")}`);
    if (ctx.audience.painPoints.length) lines.push(`- Pain points: ${ctx.audience.painPoints.join(", ")}`);
    if (ctx.audience.desires.length) lines.push(`- Desires: ${ctx.audience.desires.join(", ")}`);
    if (ctx.audience.buyingBehavior) lines.push(`- Buying behavior: ${ctx.audience.buyingBehavior}`);
  }

  if (ctx.voice) {
    lines.push(
      `Voice: ${[ctx.voice.primaryTone, ...ctx.voice.secondaryTones].join(", ")}${
        ctx.voice.customInstructions ? ` — ${ctx.voice.customInstructions}` : ""
      }`
    );
  }

  if (ctx.contentRules) {
    if (ctx.contentRules.wordsToUse.length) lines.push(`Use these words/phrases when natural: ${ctx.contentRules.wordsToUse.join(", ")}`);
    if (ctx.contentRules.wordsToAvoid.length) lines.push(`Never use: ${ctx.contentRules.wordsToAvoid.join(", ")}`);
    if (ctx.contentRules.claimsToAvoid.length) lines.push(`Never claim: ${ctx.contentRules.claimsToAvoid.join(", ")}`);
    if (ctx.contentRules.topicsToAvoid.length) lines.push(`Never discuss: ${ctx.contentRules.topicsToAvoid.join(", ")}`);
    if (ctx.contentRules.ctaStyle) lines.push(`CTA style: ${ctx.contentRules.ctaStyle}`);
    if (ctx.contentRules.hashtagStrategy) lines.push(`Hashtag strategy: ${ctx.contentRules.hashtagStrategy}`);
    lines.push(`Language: ${ctx.contentRules.language}${ctx.contentRules.dialect !== "NONE" ? ` (${ctx.contentRules.dialect} dialect)` : ""}`);
  }

  if (ctx.visualIdentity) {
    const vi = ctx.visualIdentity;
    const parts = [vi.primaryColor && `primary ${vi.primaryColor}`, vi.secondaryColor && `secondary ${vi.secondaryColor}`, vi.accentColor && `accent ${vi.accentColor}`]
      .filter(Boolean)
      .join(", ");
    if (parts) lines.push(`Brand colors: ${parts}`);
    if (vi.fontPrimary) lines.push(`Primary font: ${vi.fontPrimary}`);
    if (vi.imageStyle) lines.push(`Image style: ${vi.imageStyle}`);
  }

  if (ctx.activeStrategySummary) lines.push(`Current strategy: ${ctx.activeStrategySummary}`);
  if (ctx.topPillars.length) {
    lines.push(`Content pillars: ${ctx.topPillars.map((p) => p.name).join(", ")}`);
  }

  if (ctx.learnedPreferences.length) {
    lines.push("Learned preferences from past approvals/rejections (respect these):");
    for (const p of ctx.learnedPreferences) {
      lines.push(`- (confidence ${(p.confidence * 100).toFixed(0)}%) ${p.insight}`);
    }
  }

  return lines.join("\n");
}
