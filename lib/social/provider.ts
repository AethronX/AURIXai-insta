/**
 * Platform-agnostic social publishing abstraction (spec § future extensibility). Instagram is the
 * first implementation; TikTok/Facebook/LinkedIn/X/YouTube/Threads/Google Business/WhatsApp/email
 * slot in behind this same interface later without touching the publishing pipeline.
 */

export interface SocialAccountInfo {
  id: string;
  name: string;
  username?: string;
}

export interface PublishContentInput {
  contentId: string;
  format: "POST" | "CAROUSEL" | "STORY" | "REEL";
  caption: string;
  imageUrls: string[]; // in slide order for carousels; single entry for posts
}

export interface PublishResult {
  externalPostId: string;
  publishedAt: string;
}

export interface PlatformMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  profileVisits: number;
}

export class PlatformNotConnectedError extends Error {
  constructor(platform: string) {
    super(`${platform} connection required. Connect it in Settings > Integrations, or enable MOCK_MODE for development.`);
    this.name = "PlatformNotConnectedError";
  }
}

export interface SocialPlatformProvider {
  readonly name: string;
  readonly mock: boolean;
  connect(credentials: Record<string, string>): Promise<SocialAccountInfo>;
  getAccount(): Promise<SocialAccountInfo>;
  publish(input: PublishContentInput): Promise<PublishResult>;
  getAnalytics(externalPostId: string): Promise<PlatformMetrics>;
  disconnect(): Promise<void>;
}
