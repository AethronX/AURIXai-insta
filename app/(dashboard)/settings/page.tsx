import { requireBrandOrRedirect } from "@/lib/brand/service";
import { getEnv } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const { user } = await requireBrandOrRedirect();
  const env = getEnv();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted">
          <p>Signed in as <span className="text-foreground">{user.email}</span></p>
          <p>Role: <span className="text-foreground">{user.role}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>Automation &amp; guardrails</CardTitle>
            <CardDescription>Configured via environment variables — see docs/ENVIRONMENT.md</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border-light pb-4">
            <div>
              <p className="font-medium">Human approval required before publishing</p>
              <p className="text-xs text-muted">
                Not configurable — the content status state machine has no path from AI review to
                Scheduled/Published without a human-triggered approval. This is a hard invariant,
                not a preference.
              </p>
            </div>
            <Badge tone="success">Always on</Badge>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border-light pb-4">
            <div>
              <p className="font-medium">AI review approval threshold</p>
              <p className="text-xs text-muted">AI_QUALITY_THRESHOLD — routes to Pending Approval at/above this score, Needs Edit below it.</p>
            </div>
            <Badge tone="neutral">{env.AI_QUALITY_THRESHOLD}/100</Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Mock mode</p>
              <p className="text-xs text-muted">
                MOCK_MODE — runs the full pipeline (publishing, analytics, images) without live
                credentials. Change it in your environment and restart to take effect.
              </p>
            </div>
            <Badge tone={env.MOCK_MODE ? "warning" : "success"}>{env.MOCK_MODE ? "On" : "Off"}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
