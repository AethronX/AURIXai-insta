"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/security/crypto";
import { isInstagramGraphConfigured } from "@/lib/social/instagram/graph-provider";
import { getEnv } from "@/lib/env";
import { recordAuditEvent } from "@/lib/observability/audit";
import { runDuePublishingJobs } from "@/lib/publishing/runner";
import type { ActionResult } from "@/lib/actions/ai-actions";

/** Real Meta OAuth is only reachable when META_APP_ID/SECRET are configured; otherwise this
 * explains exactly what's missing rather than pretending to connect. */
export async function getInstagramOAuthUrl(): Promise<{ url: string } | { error: string }> {
  const env = getEnv();
  if (!isInstagramGraphConfigured()) {
    return { error: "Add META_APP_ID and META_APP_SECRET to your environment to connect a real Instagram account." };
  }
  const redirectUri = env.META_REDIRECT_URI || `${env.APP_URL}/api/integrations/instagram/callback`;
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: redirectUri,
    scope: "instagram_basic,instagram_content_publish,pages_show_list,business_management",
    response_type: "code",
  });
  return { url: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}` };
}

/** Creates a clearly-labeled simulated Instagram connection so the full pipeline (including
 * publishing) can be exercised without a real Meta app — never presented as a live connection. */
export async function connectMockInstagramAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const brand = await getPrimaryBrand(user.organizationId);
    if (!brand) return { ok: false, error: "No brand found." };

    await prisma.integration.upsert({
      where: { brandId_type: { brandId: brand.id, type: "INSTAGRAM" } },
      create: {
        brandId: brand.id,
        type: "INSTAGRAM",
        status: "MOCK",
        accountId: "mock_account",
        accountName: "Mock Instagram Account (@mock.brand)",
        lastCheckedAt: new Date(),
      },
      update: { status: "MOCK", accountId: "mock_account", accountName: "Mock Instagram Account (@mock.brand)", lastCheckedAt: new Date(), lastError: null },
    });

    await recordAuditEvent({ category: "publishing", action: "integration.instagram.mock_connected", organizationId: user.organizationId, metadata: { brandId: brand.id } });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to connect." };
  }
}

export async function disconnectInstagramAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const brand = await getPrimaryBrand(user.organizationId);
    if (!brand) return { ok: false, error: "No brand found." };

    await prisma.integration.updateMany({
      where: { brandId: brand.id, type: "INSTAGRAM" },
      data: { status: "NOT_CONNECTED", encryptedCredentials: null, accountId: null, accountName: null },
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to disconnect." };
  }
}

export async function runPublishingNowAction(): Promise<ActionResult & { summary?: string }> {
  try {
    await requireUser();
    const result = await runDuePublishingJobs();
    revalidatePath("/settings");
    revalidatePath("/calendar");
    revalidatePath("/content");
    return {
      ok: true,
      summary: `Processed ${result.processed} job(s): ${result.published} published, ${result.retrying} retrying, ${result.failed} failed.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to run publishing." };
  }
}

/** Stores an access token obtained from the OAuth callback, encrypted at rest. */
export async function storeInstagramCredentials(brandId: string, accessToken: string, igUserId: string, accountName: string) {
  await prisma.integration.upsert({
    where: { brandId_type: { brandId, type: "INSTAGRAM" } },
    create: {
      brandId,
      type: "INSTAGRAM",
      status: "CONNECTED",
      encryptedCredentials: encryptSecret(JSON.stringify({ accessToken, igUserId })),
      accountId: igUserId,
      accountName,
      lastCheckedAt: new Date(),
    },
    update: {
      status: "CONNECTED",
      encryptedCredentials: encryptSecret(JSON.stringify({ accessToken, igUserId })),
      accountId: igUserId,
      accountName,
      lastCheckedAt: new Date(),
      lastError: null,
    },
  });
}
