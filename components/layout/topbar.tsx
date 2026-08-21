"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Badge } from "@/components/ui/badge";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Command center" },
  "/content": { title: "Content Studio", subtitle: "Generate from brand brain and active strategy" },
  "/review": { title: "AI Review & Approval", subtitle: "Human gate before anything publishes" },
  "/calendar": { title: "Calendar", subtitle: "Scheduled and published content" },
  "/brand": { title: "Brand Brain", subtitle: "What AURIX knows about this brand" },
  "/strategy": { title: "AI Strategy", subtitle: "The plan behind what gets created" },
  "/analytics": { title: "Analytics", subtitle: "Real performance, real insights" },
  "/integrations": { title: "Integrations", subtitle: "Connections that power the pipeline" },
  "/settings": { title: "Settings", subtitle: "Account and system configuration" },
};

function pageMetaFor(pathname: string): { title: string; subtitle: string } {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const base = "/" + pathname.split("/")[1];
  return PAGE_META[base] ?? { title: "AURIX", subtitle: "" };
}

export function Topbar({
  userName,
  userEmail,
  mockMode,
}: {
  userName: string | null;
  userEmail: string;
  mockMode: boolean;
}) {
  const pathname = usePathname();
  const { title, subtitle } = pageMetaFor(pathname);
  // Must start `null` on both server and client — reading `Date` during the initial render (even
  // via a lazy useState initializer) diverges from the server-rendered HTML and breaks hydration.
  // Setting the real value only happens post-mount, in the effect below.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Intentional: this is the one client-only value (current time) that cannot be computed
    // consistently during SSR, so it's set once after mount and then kept fresh on an interval.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] border border-border text-muted transition-colors hover:border-border-strong md:hidden"
          aria-label="Menu"
        >
          <Menu size={16} />
        </button>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[20px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
            {mockMode && (
              <Badge
                tone="warning"
                title="Publishing, image generation, and analytics sync are simulated until you add live credentials."
              >
                Mock mode
              </Badge>
            )}
          </div>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {now && (
          <span className="whitespace-nowrap pr-1 text-xs text-muted">
            {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
            {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <span className="text-sm text-muted">{userName ?? userEmail}</span>
        <Link
          href="/content"
          className="whitespace-nowrap rounded-[var(--radius-sm)] bg-[linear-gradient(180deg,var(--brand-gradient-top)_0%,var(--brand)_100%)] px-3.5 py-1.5 text-[13px] font-semibold text-brand-foreground shadow-[0_1px_2px_rgba(91,33,232,0.35)] transition-colors hover:bg-brand-hover"
        >
          Create
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="text-sm font-medium text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
