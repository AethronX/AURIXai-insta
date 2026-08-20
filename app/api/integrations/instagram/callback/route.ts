import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { storeInstagramCredentials } from "@/lib/actions/integration-actions";
import { logger } from "@/lib/observability/logger";

/**
 * Meta OAuth callback: exchanges the authorization code for a long-lived token, resolves the
 * Facebook Page's connected Instagram Business Account, and stores the credential encrypted.
 * Real flow, real API calls — only reachable once META_APP_ID/META_APP_SECRET are configured
 * (see docs/INSTAGRAM.md); unexercised in environments without a live Meta app.
 */
export async function GET(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const redirectTo = (status: "connected" | "error", message?: string) => {
    const dest = new URL("/settings", env.APP_URL);
    dest.searchParams.set("instagram", status);
    if (message) dest.searchParams.set("message", message);
    return NextResponse.redirect(dest);
  };

  if (oauthError) return redirectTo("error", oauthError);
  if (!code) return redirectTo("error", "Missing authorization code");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.APP_URL));

  const brand = await getPrimaryBrand(user.organizationId);
  if (!brand) return redirectTo("error", "Complete onboarding before connecting Instagram");

  try {
    const redirectUri = env.META_REDIRECT_URI || `${env.APP_URL}/api/integrations/instagram/callback`;

    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      })}`
    );
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson.error?.message ?? "Failed to exchange code for token");
    const shortLivedToken: string = tokenJson.access_token;

    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      })}`
    );
    const longLivedJson = await longLivedRes.json();
    if (!longLivedRes.ok) throw new Error(longLivedJson.error?.message ?? "Failed to get long-lived token");
    const accessToken: string = longLivedJson.access_token;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?${new URLSearchParams({
        fields: "id,name,instagram_business_account",
        access_token: accessToken,
      })}`
    );
    const pagesJson = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesJson.error?.message ?? "Failed to list Facebook Pages");

    const pageWithInstagram = (pagesJson.data ?? []).find((p: { instagram_business_account?: { id: string } }) => p.instagram_business_account?.id);
    if (!pageWithInstagram) {
      throw new Error("No Facebook Page with a connected Instagram Business account was found for this user.");
    }

    const igUserId: string = pageWithInstagram.instagram_business_account.id;
    const igDetailsRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?${new URLSearchParams({ fields: "username", access_token: accessToken })}`
    );
    const igDetailsJson = await igDetailsRes.json();
    const accountName = igDetailsJson.username ? `@${igDetailsJson.username}` : pageWithInstagram.name;

    await storeInstagramCredentials(brand.id, accessToken, igUserId, accountName);

    return redirectTo("connected");
  } catch (err) {
    logger.error({ err }, "Instagram OAuth callback failed");
    return redirectTo("error", err instanceof Error ? err.message : "Unknown error");
  }
}
