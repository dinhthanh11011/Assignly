"use client";
import Link from "next/link";
import { useTransition } from "react";
import { Check, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setOccurrenceAssignee,
  toggleOccurrenceDone,
  randomAssignOccurrenceAction,
} from "@/lib/actions";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

export type OccurrenceView = {
  id: string;
  date: Date;
  status: "PENDING" | "ASSIGNED" | "DONE" | "MISSED";
  assigneeId: string | null;
  assignee: U | null;
  task: { id: string; title: string; group: { id: string; name: string } };
};

const UNASSIGNED = "__unassigned__";

export function OccurrenceItem({
  occ,
  members,
  showTask = true,
}: {
  occ: OccurrenceView;
  members: U[];
  showTask?: boolean;
}) {
  const [pending, start] = useTransition();
  const done = occ.status === "DONE";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border bg-card/60 p-3 transition-colors",
        pending && "opacity-60"
      )}
    >
      <button
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={() =>
          start(() => {
            toggleOccurrenceDone(occ.id, !done).catch((e) => toast.error(e.message));
          })
        }
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-transparent bg-[var(--color-success)] text-white" : "border-muted-foreground/40 hover:border-primary"
        )}
      >
        {done && <Check className="size-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>
          {showTask ? (
            <Link href={`/tasks/${occ.task.id}`} className="hover:underline">
              {occ.task.title}
            </Link>
          ) : (
            formatDate(occ.date)
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {showTask ? `${occ.task.group.name} · ${formatDate(occ.date)}` : occ.task.group.name}
        </div>
      </div>

      <StatusBadge status={occ.status} />

      <Select
        value={occ.assigneeId ?? UNASSIGNED}
        onValueChange={(v) =>
          start(() => {
            setOccurrenceAssignee(occ.id, v === UNASSIGNED ? null : v).catch((e) =>
              toast.error(e.message)
            );
          })
        }
      >
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Assign…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name || m.email || initials(m.name, m.email)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        title="Random assign"
        onClick={() =>
          start(() => {
            randomAssignOccurrenceAction(occ.id)
              .then(() => toast.success("Randomly assigned"))
              .catch((e) => toast.error(e.message));
          })
        }
      >
        <Shuffle className="size-4" />
      </Button>
    </div>
  );
}
