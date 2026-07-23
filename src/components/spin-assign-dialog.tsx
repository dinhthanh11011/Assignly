"use client";
import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SpinWheel, type WheelMember } from "@/components/spin-wheel";
import { OccurrencePicker, type PickableOccurrence } from "@/components/occurrence-picker";
import { assignTaskToMember } from "@/lib/actions";

export function SpinAssignDialog({
  taskId,
  members,
  occurrences,
}: {
  taskId: string;
  members: WheelMember[];
  occurrences: PickableOccurrence[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const selectableIds = useMemo(
    () => occurrences.filter((o) => o.status !== "DONE").map((o) => o.id),
    [occurrences]
  );

  function reset() {
    setSelected(new Set(selectableIds)); // default: all days selected
  }

  function assign(member: WheelMember) {
    start(async () => {
      try {
        const res = await assignTaskToMember(taskId, member.id, [...selected]);
        toast.success(
          `${member.name || member.email} won — assigned ${res.assigned} occurrence(s)`
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={members.length === 0}>
          <Sparkles className="size-4" /> Spin to assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spin the wheel</DialogTitle>
          <DialogDescription>
            Pick the days, then let luck decide who takes them.
          </DialogDescription>
        </DialogHeader>

        <OccurrencePicker occurrences={occurrences} selected={selected} onChange={setSelected} />

        <SpinWheel
          members={members}
          onResult={assign}
          busy={pending}
          disabled={selected.size === 0}
        />
        {selected.size === 0 && (
          <p className="text-center text-xs text-muted-foreground">Select at least one day to spin.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
