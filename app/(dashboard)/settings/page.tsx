import { requireBrandOrRedirect } from "@/lib/brand/service";
import { prisma } from "@/lib/db";
import { getEnv, isClaudeConfigured, isN8nConfigured } from "@/lib/env";
import { isInstagramGraphConfigured } from "@/lib/social/instagram/graph-provider";
import { InstagramPanel } from "@/components/settings/instagram-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const { brand, user } = await requireBrandOrRedirect();
  const env = getEnv();
  const instagram = await prisma.integration.findUnique({ where: { brandId_type: { brandId: brand.id, type: "INSTAGRAM" } } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">Integrations, AI configuration, and account details.</p>
      </div>

      <InstagramPanel
        status={instagram?.status ?? "NOT_CONNECTED"}
        accountName={instagram?.accountName ?? null}
        graphConfigured={isInstagramGraphConfigured()}
      />

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>AI (Claude)</CardTitle>
            <CardDescription>Configured via environment variables — see docs/AI.md</CardDescription>
          </div>
          <Badge tone={isClaudeConfigured() ? "success" : "warning"}>{isClaudeConfigured() ? "Connected" : "Not configured"}</Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted">
          <p>Strategy model: <span className="text-foreground">{env.AI_MODEL_STRATEGY}</span></p>
          <p>Content model: <span className="text-foreground">{env.AI_MODEL_CONTENT}</span></p>
          <p>Fast-task model: <span className="text-foreground">{env.AI_MODEL_FAST}</span></p>
          <p>Quality gate threshold: <span className="text-foreground">{env.AI_QUALITY_THRESHOLD}/100</span></p>
          {!isClaudeConfigured() && <p className="mt-2 text-warning">Add ANTHROPIC_API_KEY to your environment to enable generation.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>n8n automation</CardTitle>
            <CardDescription>Webhook contract documented in docs/N8N.md</CardDescription>
          </div>
          <Badge tone={isN8nConfigured() ? "success" : "neutral"}>{isN8nConfigured() ? "Configured" : "Not configured"}</Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted">
          <p>Inbound webhook (n8n → AURIX): <span className="text-foreground">{env.APP_URL}/api/webhooks/n8n</span></p>
          <p>Outbound target (AURIX → n8n): <span className="text-foreground">{env.N8N_BASE_URL || "not set"}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted">
          <p>Signed in as <span className="text-foreground">{user.email}</span></p>
          <p>Role: <span className="text-foreground">{user.role}</span></p>
          <p>Mode: <Badge tone={env.MOCK_MODE ? "warning" : "success"}>{env.MOCK_MODE ? "Mock mode" : "Live mode"}</Badge></p>
        </CardContent>
      </Card>
    </div>
  );
}
