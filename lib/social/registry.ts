import "server-only";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { decryptSecret } from "@/lib/security/crypto";
import { getMockInstagramProvider } from "@/lib/social/instagram/mock-provider";
import { InstagramGraphProvider, type InstagramCredentials } from "@/lib/social/instagram/graph-provider";
import { PlatformNotConnectedError, type SocialPlatformProvider } from "@/lib/social/provider";

/**
 * Resolves the Instagram provider for a brand: a real connection if one exists, otherwise the
 * mock provider when MOCK_MODE is enabled (the default), otherwise a clear "connection required"
 * error. Never silently returns mock data as if it were real.
 */
export async function getInstagramProviderForBrand(brandId: string): Promise<{
  provider: SocialPlatformProvider;
  isMock: boolean;
}> {
  const integration = await prisma.integration.findUnique({
    where: { brandId_type: { brandId, type: "INSTAGRAM" } },
  });

  if (integration?.status === "CONNECTED" && integration.encryptedCredentials) {
    const credentials = JSON.parse(decryptSecret(integration.encryptedCredentials)) as InstagramCredentials;
    return { provider: new InstagramGraphProvider(credentials), isMock: false };
  }

  if (getEnv().MOCK_MODE) {
    return { provider: getMockInstagramProvider(), isMock: true };
  }

  throw new PlatformNotConnectedError("Instagram");
}
