import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/security/auth";
import { getPrimaryBrand } from "@/lib/brand/service";
import { getEnv } from "@/lib/env";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const brand = await getPrimaryBrand(user.organizationId);

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar brandName={brand?.name} userName={user.name} userEmail={user.email} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar userName={user.name} userEmail={user.email} mockMode={getEnv().MOCK_MODE} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
