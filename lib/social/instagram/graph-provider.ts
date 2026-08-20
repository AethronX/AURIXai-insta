import "server-only";
import { getEnv } from "@/lib/env";
import { PlatformNotConnectedError } from "@/lib/social/provider";
import type {
  SocialPlatformProvider,
  SocialAccountInfo,
  PublishContentInput,
  PublishResult,
  PlatformMetrics,
} from "@/lib/social/provider";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface InstagramCredentials {
  accessToken: string;
  igUserId: string;
}

async function graphFetch(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const init: RequestInit = { method };
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    const body = new URLSearchParams(params);
    init.body = body;
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
  }
  const response = await fetch(url.toString(), init);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Instagram Graph API error: ${json.error?.message ?? response.statusText}`);
  }
  return json;
}

/**
 * Real Meta Graph API integration for Instagram Content Publishing. Requires a connected
 * Instagram Business/Creator account behind a Facebook Page, and an access token with
 * instagram_content_publish permission (see docs/INSTAGRAM.md). Image URLs must be public HTTPS
 * URLs Meta's servers can fetch — a local dev storage URL will not work; use S3/CDN storage in
 * any environment where you intend to actually publish live.
 */
export class InstagramGraphProvider implements SocialPlatformProvider {
  readonly name = "instagram";
  readonly mock = false;

  constructor(private credentials: InstagramCredentials | null) {}

  private requireCredentials(): InstagramCredentials {
    if (!this.credentials) throw new PlatformNotConnectedError("Instagram");
    return this.credentials;
  }

  async connect(credentials: Record<string, string>): Promise<SocialAccountInfo> {
    const accessToken = credentials.accessToken;
    const igUserId = credentials.igUserId;
    if (!accessToken || !igUserId) throw new Error("accessToken and igUserId are required");
    this.credentials = { accessToken, igUserId };
    return this.getAccount();
  }

  async getAccount(): Promise<SocialAccountInfo> {
    const { accessToken, igUserId } = this.requireCredentials();
    const data = await graphFetch(`/${igUserId}`, { fields: "id,username,name", access_token: accessToken });
    return { id: data.id, name: data.name ?? data.username, username: data.username };
  }

  async publish(input: PublishContentInput): Promise<PublishResult> {
    const { accessToken, igUserId } = this.requireCredentials();

    let creationId: string;
    if (input.format === "CAROUSEL" && input.imageUrls.length > 1) {
      const childIds: string[] = [];
      for (const imageUrl of input.imageUrls) {
        const child = await graphFetch(
          `/${igUserId}/media`,
          { image_url: imageUrl, is_carousel_item: "true", access_token: accessToken },
          "POST"
        );
        childIds.push(child.id);
      }
      const container = await graphFetch(
        `/${igUserId}/media`,
        { media_type: "CAROUSEL", children: childIds.join(","), caption: input.caption, access_token: accessToken },
        "POST"
      );
      creationId = container.id;
    } else {
      const container = await graphFetch(
        `/${igUserId}/media`,
        { image_url: input.imageUrls[0], caption: input.caption, access_token: accessToken },
        "POST"
      );
      creationId = container.id;
    }

    const published = await graphFetch(
      `/${igUserId}/media_publish`,
      { creation_id: creationId, access_token: accessToken },
      "POST"
    );

    return { externalPostId: published.id, publishedAt: new Date().toISOString() };
  }

  async getAnalytics(externalPostId: string): Promise<PlatformMetrics> {
    const { accessToken } = this.requireCredentials();
    const data = await graphFetch(`/${externalPostId}/insights`, {
      metric: "reach,impressions,saved,likes,comments,shares,profile_visits",
      access_token: accessToken,
    });
    const byName: Record<string, number> = {};
    for (const entry of data.data ?? []) {
      byName[entry.name] = entry.values?.[0]?.value ?? 0;
    }
    return {
      likes: byName.likes ?? 0,
      comments: byName.comments ?? 0,
      shares: byName.shares ?? 0,
      saves: byName.saved ?? 0,
      reach: byName.reach ?? 0,
      impressions: byName.impressions ?? 0,
      profileVisits: byName.profile_visits ?? 0,
    };
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
  }
}

export function isInstagramGraphConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.META_APP_ID && env.META_APP_SECRET);
}
