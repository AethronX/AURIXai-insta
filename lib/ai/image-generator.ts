import "server-only";
import { prisma } from "@/lib/db";
import { getImageProvider } from "@/lib/ai/mock-image-provider";
import { recordAuditEvent } from "@/lib/observability/audit";
import type { CreativeBriefOutput } from "@/lib/validation/ai-schemas";

export interface GenerateImagesParams {
  contentId: string;
  organizationId: string;
}

/** Turns each stored DESIGN_BRIEF asset into a rendered IMAGE asset via the configured ImageProvider. */
export async function generateImagesFromBriefs(params: GenerateImagesParams) {
  const content = await prisma.content.findUniqueOrThrow({
    where: { id: params.contentId },
    include: { assets: { where: { type: "DESIGN_BRIEF" } }, brand: { include: { visualIdentity: true } } },
  });

  if (content.assets.length === 0) {
    throw new Error("No visual briefs found — generate creative direction first.");
  }

  const provider = getImageProvider();
  const created = [];

  for (const brief of content.assets) {
    const vb = brief.visualBrief as unknown as CreativeBriefOutput["briefs"][number];
    const image = await provider.generateImage({
      prompt: `${vb.imageryDirection} — ${vb.composition}`,
      aspectRatio: vb.aspectRatio || "4:5",
      brandColors: {
        primary: content.brand.visualIdentity?.primaryColor,
        secondary: content.brand.visualIdentity?.secondaryColor,
        accent: content.brand.visualIdentity?.accentColor,
      },
      label: vb.slideNumber ? `Slide ${vb.slideNumber}` : content.title,
    });

    const asset = await prisma.contentAsset.create({
      data: {
        contentId: content.id,
        slideNumber: vb.slideNumber,
        type: "IMAGE",
        provider: image.provider,
        url: image.url,
      },
    });
    created.push(asset);
  }

  await recordAuditEvent({
    category: "ai",
    action: "content.images.generated",
    organizationId: params.organizationId,
    metadata: { contentId: content.id, provider: provider.name, count: created.length },
  });

  return created;
}
