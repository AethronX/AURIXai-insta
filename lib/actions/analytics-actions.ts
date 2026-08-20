"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { syncAnalyticsForBrand } from "@/lib/analytics/sync";
import { generateAnalyticsInsight } from "@/lib/ai/analytics-agent";
import { applyInsight, dismissInsight } from "@/lib/ai/optimization";
import type { ActionResult } from "@/lib/actions/ai-actions";

export async function syncAnalyticsAction(): Promise<ActionResult & { summary?: string }> {
  try {
    const user = await requireUser();
    const brand = await getPrimaryBrand(user.organizationId);
    if (!brand) return { ok: false, error: "No brand found." };

    const result = await syncAnalyticsForBrand(brand.id);
    revalidatePath("/analytics");
    revalidatePath("/dashboard");
    return { ok: true, summary: `Checked ${result.checked} post(s), updated ${result.updated}, ${result.errors} error(s).` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to sync analytics." };
  }
}

export async function generateInsightsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const brand = await getPrimaryBrand(user.organizationId);
    if (!brand) return { ok: false, error: "No brand found." };

    await generateAnalyticsInsight({ brandId: brand.id, organizationId: user.organizationId });
    revalidatePath("/analytics");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to generate insights." };
  }
}

export async function applyInsightAction(insightId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await applyInsight({ insightId, organizationId: user.organizationId });
    revalidatePath("/analytics");
    revalidatePath("/strategy");
    revalidatePath("/brand");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to apply insight." };
  }
}

export async function dismissInsightAction(insightId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await dismissInsight(insightId, user.organizationId);
    revalidatePath("/analytics");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to dismiss insight." };
  }
}
