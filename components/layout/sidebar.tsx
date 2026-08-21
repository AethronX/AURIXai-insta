"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  ClipboardCheck,
  CalendarDays,
  BrainCircuit,
  Sparkles,
  BarChart3,
  Plug,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WORKSPACE_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/content", label: "Content Studio", icon: PenSquare },
  { href: "/review", label: "AI Review", icon: ClipboardCheck },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const INTELLIGENCE_NAV = [
  { href: "/brand", label: "Brand Brain", icon: BrainCircuit },
  { href: "/strategy", label: "AI Strategy", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const SYSTEM_NAV = [
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavGroup({ label, items, pathname }: { label: string; items: typeof WORKSPACE_NAV; pathname: string }) {
  return (
    <div>
      <div className="px-2 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">{label}</div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <Icon size={15} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar({
  brandName,
  userName,
  userEmail,
}: {
  brandName?: string | null;
  userName: string | null;
  userEmail: string;
}) {
  const pathname = usePathname();
  const initials = (userName ?? userEmail).slice(0, 2).toUpperCase();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-5 border-r border-border bg-surface px-3 py-4 md:flex">
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <Image src="/aurix-logo.png" alt="AURIX" width={78} height={20} className="h-[22px] w-auto" priority />
        <span className="whitespace-nowrap rounded-[5px] border border-brand/20 bg-brand-soft px-[7px] py-[2px] text-[11px] font-semibold tracking-[0.04em] text-brand">
          Social AI
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        <NavGroup label="WORKSPACE" items={WORKSPACE_NAV} pathname={pathname} />
        <NavGroup label="INTELLIGENCE" items={INTELLIGENCE_NAV} pathname={pathname} />
        <NavGroup label="SYSTEM" items={SYSTEM_NAV} pathname={pathname} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface-subtle p-2">
          <div className="h-[22px] w-[22px] shrink-0 rounded-md bg-[repeating-linear-gradient(135deg,#242833_0_4px,#1a1d25_4px_8px)]" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold">{brandName ?? "No brand yet"}</span>
            <span className="text-[11px] text-muted">Brand · active</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-[7px]">
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-border-strong text-[11px] font-semibold text-foreground">
            {initials}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-medium">{userName ?? userEmail}</span>
            <span className="text-[11px] text-muted">Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
