import { requireBrandOrRedirect } from "@/lib/brand/service";

export default async function DashboardPage() {
  const { brand } = await requireBrandOrRedirect();
  return (
    <div className="text-sm text-muted">
      Overview for {brand.name} — full widgets (upcoming content, approval queue, performance,
      recommendations) are built in Phase 5 of this session.
    </div>
  );
}
