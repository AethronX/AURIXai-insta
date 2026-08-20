import "server-only";
import { prisma } from "@/lib/db";

export async function listCalendarItemsInRange(brandId: string, start: Date, end: Date) {
  return prisma.calendarItem.findMany({
    where: { brandId, scheduledFor: { gte: start, lt: end } },
    include: { content: { select: { id: true, status: true, format: true, title: true } } },
    orderBy: { scheduledFor: "asc" },
  });
}
