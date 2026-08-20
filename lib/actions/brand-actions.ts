"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/security/auth";
import { getStorageProvider } from "@/lib/storage/local-provider";
import {
  businessSchema,
  audienceSchema,
  voiceSchema,
  visualIdentitySchema,
  contentRulesSchema,
} from "@/lib/validation/brand";
import {
  createBrandFromOnboarding,
  getPrimaryBrand,
  updateAudience,
  updateBusinessProfile,
  updateContentRules,
  updateVisualIdentity,
  updateVoice,
  type FullBrandInput,
} from "@/lib/brand/service";
import { recordAuditEvent } from "@/lib/observability/audit";
import type { FormState } from "@/lib/actions/auth-actions";

function readList(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

async function maybeUploadLogo(formData: FormData): Promise<string | undefined> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return undefined;
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const key = `logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { url } = await getStorageProvider().upload({ key, data: buffer, contentType: file.type });
  return url;
}

export async function completeOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const logoUrl = await maybeUploadLogo(formData);

  const business = businessSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    description: formData.get("description"),
    website: formData.get("website"),
    instagram: formData.get("instagram"),
    location: formData.get("location"),
    targetMarket: formData.get("targetMarket"),
    products: readList(formData, "products"),
    services: readList(formData, "services"),
  });

  const audience = audienceSchema.safeParse({
    targetCustomer: formData.get("targetCustomer"),
    ageRangeMin: formData.get("ageRangeMin") || undefined,
    ageRangeMax: formData.get("ageRangeMax") || undefined,
    interests: readList(formData, "interests"),
    painPoints: readList(formData, "painPoints"),
    desires: readList(formData, "desires"),
    buyingBehavior: formData.get("buyingBehavior"),
  });

  const voice = voiceSchema.safeParse({
    primaryTone: formData.get("primaryTone"),
    secondaryTones: formData.getAll("secondaryTones"),
    customInstructions: formData.get("customInstructions"),
  });

  const visualIdentity = visualIdentitySchema.safeParse({
    logoUrl,
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
    fontPrimary: formData.get("fontPrimary"),
    fontSecondary: formData.get("fontSecondary"),
    imageStyle: formData.get("imageStyle"),
    designReferences: readList(formData, "designReferences"),
  });

  const contentRules = contentRulesSchema.safeParse({
    wordsToUse: readList(formData, "wordsToUse"),
    wordsToAvoid: readList(formData, "wordsToAvoid"),
    claimsToAvoid: readList(formData, "claimsToAvoid"),
    topicsToAvoid: readList(formData, "topicsToAvoid"),
    ctaStyle: formData.get("ctaStyle"),
    hashtagStrategy: formData.get("hashtagStrategy"),
    language: formData.get("language") || "en",
    dialect: formData.get("dialect") || "NONE",
  });

  const results = { business, audience, voice, visualIdentity, contentRules };
  for (const [name, result] of Object.entries(results)) {
    if (!result.success) {
      return {
        error: `Please fix the ${name} section: ${result.error.issues[0]?.message ?? "invalid input"}`,
      };
    }
  }

  const input: FullBrandInput = {
    ...business.data!,
    audience: audience.data!,
    voice: voice.data!,
    visualIdentity: visualIdentity.data!,
    contentRules: contentRules.data!,
  };

  const brand = await createBrandFromOnboarding(user.organizationId, input);
  await recordAuditEvent({
    category: "ai",
    action: "brand.onboarded",
    organizationId: user.organizationId,
    actorId: user.id,
    metadata: { brandId: brand.id },
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function updateBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) return { error: "No brand found." };

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    description: formData.get("description"),
    website: formData.get("website"),
    instagram: formData.get("instagram"),
    location: formData.get("location"),
    targetMarket: formData.get("targetMarket"),
    products: readList(formData, "products"),
    services: readList(formData, "services"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateBusinessProfile(brand.id, parsed.data);
  revalidatePath("/brand");
  return {};
}

export async function updateAudienceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) return { error: "No brand found." };

  const parsed = audienceSchema.safeParse({
    targetCustomer: formData.get("targetCustomer"),
    ageRangeMin: formData.get("ageRangeMin") || undefined,
    ageRangeMax: formData.get("ageRangeMax") || undefined,
    interests: readList(formData, "interests"),
    painPoints: readList(formData, "painPoints"),
    desires: readList(formData, "desires"),
    buyingBehavior: formData.get("buyingBehavior"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateAudience(brand.id, parsed.data);
  revalidatePath("/brand");
  return {};
}

export async function updateVoiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) return { error: "No brand found." };

  const parsed = voiceSchema.safeParse({
    primaryTone: formData.get("primaryTone"),
    secondaryTones: formData.getAll("secondaryTones"),
    customInstructions: formData.get("customInstructions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateVoice(brand.id, parsed.data);
  revalidatePath("/brand");
  return {};
}

export async function updateVisualIdentityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) return { error: "No brand found." };

  const logoUrl = await maybeUploadLogo(formData);

  const parsed = visualIdentitySchema.safeParse({
    logoUrl: logoUrl ?? formData.get("existingLogoUrl") ?? "",
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
    fontPrimary: formData.get("fontPrimary"),
    fontSecondary: formData.get("fontSecondary"),
    imageStyle: formData.get("imageStyle"),
    designReferences: readList(formData, "designReferences"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateVisualIdentity(brand.id, parsed.data);
  revalidatePath("/brand");
  return {};
}

export async function updateContentRulesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) return { error: "No brand found." };

  const parsed = contentRulesSchema.safeParse({
    wordsToUse: readList(formData, "wordsToUse"),
    wordsToAvoid: readList(formData, "wordsToAvoid"),
    claimsToAvoid: readList(formData, "claimsToAvoid"),
    topicsToAvoid: readList(formData, "topicsToAvoid"),
    ctaStyle: formData.get("ctaStyle"),
    hashtagStrategy: formData.get("hashtagStrategy"),
    language: formData.get("language") || "en",
    dialect: formData.get("dialect") || "NONE",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateContentRules(brand.id, parsed.data);
  revalidatePath("/brand");
  return {};
}
