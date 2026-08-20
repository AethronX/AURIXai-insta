import "server-only";
import { prisma } from "@/lib/db";

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
