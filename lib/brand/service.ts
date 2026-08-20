import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, type SessionUser } from "@/lib/security/auth";
import type {
  BusinessInput,
  AudienceInput,
  VoiceInput,
  VisualIdentityInput,
  ContentRulesInput,
} from "@/lib/validation/brand";

/** v1 is single-brand-per-organization; this is the seam multi-tenancy expands from later. */
export async function getPrimaryBrand(organizationId: string) {
  return prisma.brand.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: {
      audience: true,
      voice: true,
      visualIdentity: true,
      contentRules: true,
    },
  });
}

export async function brandExists(organizationId: string): Promise<boolean> {
  const count = await prisma.brand.count({ where: { organizationId } });
  return count > 0;
}

type PrimaryBrand = NonNullable<Awaited<ReturnType<typeof getPrimaryBrand>>>;

/** Shared guard for pages that need a brand to render: redirects to onboarding when missing. */
export async function requireBrandOrRedirect(): Promise<{ user: SessionUser; brand: PrimaryBrand }> {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) {
    redirect("/onboarding");
  }
  return { user, brand };
}

export type FullBrandInput = BusinessInput & {
  audience: AudienceInput;
  voice: VoiceInput;
  visualIdentity: VisualIdentityInput;
  contentRules: ContentRulesInput;
};

/** Creates the brand and all of its sub-profiles from the onboarding wizard in one transaction. */
export async function createBrandFromOnboarding(organizationId: string, input: FullBrandInput) {
  return prisma.brand.create({
    data: {
      organizationId,
      name: input.name,
      industry: input.industry || null,
      description: input.description || null,
      website: input.website || null,
      instagram: input.instagram || null,
      location: input.location || null,
      targetMarket: input.targetMarket || null,
      products: input.products,
      services: input.services,
      onboardingCompletedAt: new Date(),
      audience: {
        create: {
          targetCustomer: input.audience.targetCustomer || null,
          ageRangeMin: input.audience.ageRangeMin ?? null,
          ageRangeMax: input.audience.ageRangeMax ?? null,
          interests: input.audience.interests,
          painPoints: input.audience.painPoints,
          desires: input.audience.desires,
          buyingBehavior: input.audience.buyingBehavior || null,
        },
      },
      voice: {
        create: {
          primaryTone: input.voice.primaryTone,
          secondaryTones: input.voice.secondaryTones,
          customInstructions: input.voice.customInstructions || null,
        },
      },
      visualIdentity: {
        create: {
          logoUrl: input.visualIdentity.logoUrl || null,
          primaryColor: input.visualIdentity.primaryColor || null,
          secondaryColor: input.visualIdentity.secondaryColor || null,
          accentColor: input.visualIdentity.accentColor || null,
          fontPrimary: input.visualIdentity.fontPrimary || null,
          fontSecondary: input.visualIdentity.fontSecondary || null,
          imageStyle: input.visualIdentity.imageStyle || null,
          designReferences: input.visualIdentity.designReferences,
        },
      },
      contentRules: {
        create: {
          wordsToUse: input.contentRules.wordsToUse,
          wordsToAvoid: input.contentRules.wordsToAvoid,
          claimsToAvoid: input.contentRules.claimsToAvoid,
          topicsToAvoid: input.contentRules.topicsToAvoid,
          ctaStyle: input.contentRules.ctaStyle || null,
          hashtagStrategy: input.contentRules.hashtagStrategy || null,
          language: input.contentRules.language,
          dialect: input.contentRules.dialect,
        },
      },
    },
  });
}

export async function updateBusinessProfile(brandId: string, input: BusinessInput) {
  return prisma.brand.update({
    where: { id: brandId },
    data: {
      name: input.name,
      industry: input.industry || null,
      description: input.description || null,
      website: input.website || null,
      instagram: input.instagram || null,
      location: input.location || null,
      targetMarket: input.targetMarket || null,
      products: input.products,
      services: input.services,
    },
  });
}

export async function updateAudience(brandId: string, input: AudienceInput) {
  return prisma.brandAudience.upsert({
    where: { brandId },
    create: { brandId, ...normalizeAudience(input) },
    update: normalizeAudience(input),
  });
}

function normalizeAudience(input: AudienceInput) {
  return {
    targetCustomer: input.targetCustomer || null,
    ageRangeMin: input.ageRangeMin ?? null,
    ageRangeMax: input.ageRangeMax ?? null,
    interests: input.interests,
    painPoints: input.painPoints,
    desires: input.desires,
    buyingBehavior: input.buyingBehavior || null,
  };
}

export async function updateVoice(brandId: string, input: VoiceInput) {
  const data = {
    primaryTone: input.primaryTone,
    secondaryTones: input.secondaryTones,
    customInstructions: input.customInstructions || null,
  };
  return prisma.brandVoice.upsert({
    where: { brandId },
    create: { brandId, ...data },
    update: data,
  });
}

export async function updateVisualIdentity(brandId: string, input: VisualIdentityInput) {
  const data = {
    logoUrl: input.logoUrl || null,
    primaryColor: input.primaryColor || null,
    secondaryColor: input.secondaryColor || null,
    accentColor: input.accentColor || null,
    fontPrimary: input.fontPrimary || null,
    fontSecondary: input.fontSecondary || null,
    imageStyle: input.imageStyle || null,
    designReferences: input.designReferences,
  };
  return prisma.brandVisualIdentity.upsert({
    where: { brandId },
    create: { brandId, ...data },
    update: data,
  });
}

export async function updateContentRules(brandId: string, input: ContentRulesInput) {
  const data = {
    wordsToUse: input.wordsToUse,
    wordsToAvoid: input.wordsToAvoid,
    claimsToAvoid: input.claimsToAvoid,
    topicsToAvoid: input.topicsToAvoid,
    ctaStyle: input.ctaStyle || null,
    hashtagStrategy: input.hashtagStrategy || null,
    language: input.language,
    dialect: input.dialect,
  };
  return prisma.brandContentRules.upsert({
    where: { brandId },
    create: { brandId, ...data },
    update: data,
  });
}
