import type { ContentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE } from "@/lib/content/status";

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={CONTENT_STATUS_TONE[status]}>{CONTENT_STATUS_LABEL[status]}</Badge>;
}
