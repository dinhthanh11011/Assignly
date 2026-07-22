import { Badge } from "@/components/ui/badge";

const map = {
  PENDING: { label: "Unassigned", variant: "warning" as const },
  ASSIGNED: { label: "Assigned", variant: "default" as const },
  DONE: { label: "Done", variant: "success" as const },
  MISSED: { label: "Missed", variant: "destructive" as const },
};

export function StatusBadge({ status }: { status: keyof typeof map }) {
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
