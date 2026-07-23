"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Shuffle, Sparkles, BellRing } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SpinWheel } from "@/components/spin-wheel";
import { OccurrenceRemindersDialog } from "@/components/occurrence-reminders-dialog";
import {
  setOccurrenceAssignee,
  toggleOccurrenceDone,
  randomAssignOccurrenceAction,
} from "@/lib/actions";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

export type OccurrenceView = {
  dateKey: string;
  date: Date;
  status: "PENDING" | "ASSIGNED" | "DONE" | "MISSED";
  assigneeId: string | null;
  assignee: U | null;
  unassignedReminderTime?: string | null;
  doReminderTime?: string | null;
  task: {
    id: string;
    title: string;
    group: { id: string; name: string };
    unassignedReminderTime?: string | null;
    doReminderTime?: string | null;
  };
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
  const [spinOpen, setSpinOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const done = occ.status === "DONE";
  const hasReminderOverride = !!(occ.unassignedReminderTime || occ.doReminderTime);

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
            toggleOccurrenceDone(occ.task.id, occ.dateKey, !done).catch((e) => toast.error(e.message));
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
            setOccurrenceAssignee(occ.task.id, occ.dateKey, v === UNASSIGNED ? null : v).catch((e) =>
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
            randomAssignOccurrenceAction(occ.task.id, occ.dateKey)
              .then(() => toast.success("Randomly assigned"))
              .catch((e) => toast.error(e.message));
          })
        }
      >
        <Shuffle className="size-4" />
      </Button>

      <Dialog open={spinOpen} onOpenChange={setSpinOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Spin to assign" disabled={members.length === 0}>
            <Sparkles className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spin for {formatDate(occ.date)}</DialogTitle>
            <DialogDescription>Let the wheel pick who takes this day.</DialogDescription>
          </DialogHeader>
          <SpinWheel
            members={members}
            busy={pending}
            onResult={(m) =>
              start(() => {
                setOccurrenceAssignee(occ.task.id, occ.dateKey, m.id)
                  .then(() => toast.success(`Assigned to ${m.name || m.email}`))
                  .catch((e) => toast.error(e.message));
              })
            }
          />
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="icon"
        title="Reminders for this day"
        className={cn(hasReminderOverride && "text-primary")}
        onClick={() => setRemindOpen(true)}
      >
        <BellRing className="size-4" />
      </Button>
      <OccurrenceRemindersDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        taskId={occ.task.id}
        dateKey={occ.dateKey}
        unassignedOverride={occ.unassignedReminderTime ?? null}
        doOverride={occ.doReminderTime ?? null}
        taskUnassigned={occ.task.unassignedReminderTime ?? null}
        taskDo={occ.task.doReminderTime ?? null}
      />
    </div>
  );
}
