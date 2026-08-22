import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { getEnv } from "@/lib/env";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { logoutAction } from "@/lib/actions/auth-actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const brand = await getPrimaryBrand(user.organizationId);

  // Every route besides /onboarding requires a brand and redirects back here without one — so
  // showing the full nav before onboarding is complete just invites a click that silently wipes
  // whatever the user typed into the wizard (a real bug: felt like "it reset the questions").
  if (!brand) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
          <span className="text-sm font-semibold">AURIX Social AI</span>
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-medium text-muted hover:text-foreground">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar brandName={brand.name} userName={user.name} userEmail={user.email} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar userName={user.name} userEmail={user.email} mockMode={getEnv().MOCK_MODE} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
