import Link from "next/link";
import { requireBrandOrRedirect } from "@/lib/brand/service";
import { listCalendarItemsInRange } from "@/lib/calendar/service";
import { MonthGrid } from "@/components/calendar/month-grid";
import { Button } from "@/components/ui/button";

function parseMonthParam(param?: string): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthParam(year: number, month: number): string {
  const normalizedYear = year + Math.floor(month / 12);
  const normalizedMonth = ((month % 12) + 12) % 12;
  return `${normalizedYear}-${String(normalizedMonth + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { brand } = await requireBrandOrRedirect();
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonthParam(monthParamValue);

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const items = await listCalendarItemsInRange(brand.id, start, end);

  const monthLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calendar</h1>
          <p className="mt-1 text-sm text-muted">{items.length} scheduled for {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?month=${monthParam(year, month - 1)}`}>
            <Button variant="outline" size="sm">← Prev</Button>
          </Link>
          <span className="text-sm font-medium">{monthLabel}</span>
          <Link href={`/calendar?month=${monthParam(year, month + 1)}`}>
            <Button variant="outline" size="sm">Next →</Button>
          </Link>
        </div>
      </div>

      <MonthGrid year={year} month={month} items={items} />
    </div>
  );
}
