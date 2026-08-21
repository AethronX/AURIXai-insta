import { requireBrandOrRedirect } from "@/lib/brand/service";
import { prisma } from "@/lib/db";
import { getEnv, isClaudeConfigured, isN8nConfigured } from "@/lib/env";
import { isInstagramGraphConfigured } from "@/lib/social/instagram/graph-provider";
import { InstagramPanel } from "@/components/settings/instagram-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function IntegrationsPage() {
  const { brand } = await requireBrandOrRedirect();
  const env = getEnv();
  const instagram = await prisma.integration.findUnique({
    where: { brandId_type: { brandId: brand.id, type: "INSTAGRAM" } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <InstagramPanel
        status={instagram?.status ?? "NOT_CONNECTED"}
        accountName={instagram?.accountName ?? null}
        graphConfigured={isInstagramGraphConfigured()}
      />

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>Claude</CardTitle>
            <CardDescription>Generation, quality review, strategy, and insights — docs/AI.md</CardDescription>
          </div>
          <Badge tone={isClaudeConfigured() ? "success" : "warning"}>
            {isClaudeConfigured() ? "Connected" : "Not configured"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted">
          <p>Strategy model: <span className="text-foreground">{env.AI_MODEL_STRATEGY}</span></p>
          <p>Content model: <span className="text-foreground">{env.AI_MODEL_CONTENT}</span></p>
          <p>Fast-task model: <span className="text-foreground">{env.AI_MODEL_FAST}</span></p>
          {!isClaudeConfigured() && (
            <p className="mt-2 text-warning">Add ANTHROPIC_API_KEY to your environment to enable generation.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>n8n</CardTitle>
            <CardDescription>Automation/orchestration layer — docs/N8N.md</CardDescription>
          </div>
          <Badge tone={isN8nConfigured() ? "success" : "neutral"}>{isN8nConfigured() ? "Configured" : "Not configured"}</Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted">
          <p>Inbound webhook (n8n → AURIX): <span className="text-foreground">{env.APP_URL}/api/webhooks/n8n</span></p>
          <p>Outbound target (AURIX → n8n): <span className="text-foreground">{env.N8N_BASE_URL || "not set"}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>Asset storage</CardTitle>
            <CardDescription>docs/DEPLOYMENT.md</CardDescription>
          </div>
          <Badge tone="neutral">{env.STORAGE_PROVIDER}</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          {env.STORAGE_PROVIDER === "local"
            ? "Local disk (public/uploads) — fine for development; use an S3-compatible provider for multi-instance or real Instagram publishing."
            : `${env.STORAGE_BUCKET || "bucket not set"} · ${env.STORAGE_REGION || "region not set"}`}
        </CardContent>
      </Card>
    </div>
  );
}
