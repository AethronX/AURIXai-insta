import { logoutAction } from "@/lib/actions/auth-actions";
import { Badge } from "@/components/ui/badge";
import { getEnv } from "@/lib/env";

export function Topbar({ userName, userEmail }: { userName: string | null; userEmail: string }) {
  const mockMode = getEnv().MOCK_MODE;
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
      <div className="flex items-center gap-2">
        {mockMode && (
          <Badge tone="warning" title="Publishing, image generation, and analytics sync are simulated until you add live credentials.">
            Mock mode
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">{userName ?? userEmail}</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm font-medium text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
