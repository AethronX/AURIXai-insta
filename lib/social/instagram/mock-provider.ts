import "server-only";
import { randomUUID } from "crypto";
import type {
  SocialPlatformProvider,
  SocialAccountInfo,
  PublishContentInput,
  PublishResult,
  PlatformMetrics,
} from "@/lib/social/provider";

function hashToUnitInterval(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

/**
 * Simulates Instagram publishing and analytics deterministically from the post id, so the same
 * post always reports a consistent "personality" (a naturally engaging post stays engaging) while
 * metrics still grow with elapsed time since publish — realistic enough to exercise the full
 * pipeline (calendar -> publish -> analytics -> insights) without a live Meta connection.
 */
export class MockInstagramProvider implements SocialPlatformProvider {
  readonly name = "instagram";
  readonly mock = true;

  async connect(): Promise<SocialAccountInfo> {
    return { id: "mock_account", name: "Mock Instagram Account", username: "mock.brand" };
  }

  async getAccount(): Promise<SocialAccountInfo> {
    return { id: "mock_account", name: "Mock Instagram Account", username: "mock.brand" };
  }

  async publish(input: PublishContentInput): Promise<PublishResult> {
    const externalPostId = `mock_${input.contentId}_${Date.now()}_${randomUUID().slice(0, 8)}`;
    return { externalPostId, publishedAt: new Date().toISOString() };
  }

  async getAnalytics(externalPostId: string): Promise<PlatformMetrics> {
    const quality = 0.4 + hashToUnitInterval(externalPostId) * 0.6; // 0.4-1.0 "how good this post is"

    const publishedAtMatch = externalPostId.match(/_(\d{10,})_/);
    const publishedAtMs = publishedAtMatch ? Number(publishedAtMatch[1]) : Date.now();
    const hoursElapsed = Math.max(0, (Date.now() - publishedAtMs) / (1000 * 60 * 60));
    const growth = 1 - Math.exp(-hoursElapsed / 36); // saturating growth curve over ~1.5 days

    const reach = Math.round(400 + quality * 4000 * growth);
    const impressions = Math.round(reach * (1.15 + hashToUnitInterval(externalPostId + "i") * 0.4));
    const likes = Math.round(reach * (0.03 + quality * 0.09));
    const comments = Math.round(likes * (0.03 + hashToUnitInterval(externalPostId + "c") * 0.05));
    const shares = Math.round(likes * (0.01 + hashToUnitInterval(externalPostId + "s") * 0.03));
    const saves = Math.round(likes * (0.05 + quality * 0.1));
    const profileVisits = Math.round(reach * (0.01 + quality * 0.03));

    return { likes, comments, shares, saves, reach, impressions, profileVisits };
  }

  async disconnect(): Promise<void> {
    // no-op — nothing to revoke for a simulated connection
  }
}

let cached: MockInstagramProvider | null = null;
export function getMockInstagramProvider(): MockInstagramProvider {
  if (!cached) cached = new MockInstagramProvider();
  return cached;
}
