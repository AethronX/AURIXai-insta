import "server-only";
import { prisma } from "@/lib/db";

export async function createNextVersion(
  contentId: string,
  snapshot: unknown,
  changeSummary: string,
  createdBy: string
) {
  const last = await prisma.contentVersion.findFirst({
    where: { contentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  return prisma.contentVersion.create({
    data: {
      contentId,
      versionNumber: (last?.versionNumber ?? 0) + 1,
      snapshot: snapshot as never,
      changeSummary,
      createdBy,
    },
  });
}
