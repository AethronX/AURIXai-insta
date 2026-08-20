import Link from "next/link";
import { StatusBadge } from "@/components/content/status-badge";
import { cn } from "@/lib/utils";
import type { ContentStatus, ContentFormat } from "@prisma/client";

export interface CalendarItemData {
  id: string;
  title: string;
  scheduledFor: Date;
  format: ContentFormat;
  content: { id: string; status: ContentStatus; title: string } | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthGrid({ year, month, items }: { year: number; month: number; items: CalendarItemData[] }) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = new Date();

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(Date.UTC(year, month, d)) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const itemsByDay = new Map<number, CalendarItemData[]>();
  for (const item of items) {
    const day = new Date(item.scheduledFor).getUTCDate();
    if (!itemsByDay.has(day)) itemsByDay.set(day, []);
    itemsByDay.get(day)!.push(item);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-hover text-xs font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday =
            cell.date &&
            cell.date.getUTCFullYear() === today.getFullYear() &&
            cell.date.getUTCMonth() === today.getMonth() &&
            cell.date.getUTCDate() === today.getDate();
          const dayItems = cell.date ? itemsByDay.get(cell.date.getUTCDate()) ?? [] : [];

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0",
                !cell.date && "bg-surface-hover/40"
              )}
            >
              {cell.date && (
                <>
                  <p className={cn("mb-1 text-xs font-medium", isToday ? "text-brand" : "text-muted")}>
                    {cell.date.getUTCDate()}
                  </p>
                  <div className="space-y-1">
                    {dayItems.map((item) => (
                      <Link
                        key={item.id}
                        href={item.content ? `/content/${item.content.id}` : "#"}
                        className="block truncate rounded border border-border bg-surface px-1.5 py-1 text-[11px] hover:bg-surface-hover"
                        title={item.title}
                      >
                        <span className="block truncate font-medium">{item.title}</span>
                        {item.content && (
                          <span className="mt-0.5 inline-block">
                            <StatusBadge status={item.content.status} />
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
