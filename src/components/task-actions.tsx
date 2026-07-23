"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OccurrencePicker, type PickableOccurrence } from "@/components/occurrence-picker";
import { randomAssignTaskAction, deleteTask } from "@/lib/actions";

export function TaskActions({
  taskId,
  groupId,
  allowRandom,
  occurrences,
}: {
  taskId: string;
  groupId: string;
  allowRandom: boolean;
  occurrences: PickableOccurrence[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const selectableIds = useMemo(
    () => occurrences.filter((o) => o.status !== "DONE").map((o) => o.dateKey),
    [occurrences]
  );

  function randomAssign() {
    start(async () => {
      try {
        const res = await randomAssignTaskAction(taskId, [...selected]);
        toast.success(`Randomly assigned ${res.assigned} occurrence(s)`);
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="flex gap-2">
      {allowRandom && (
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) setSelected(new Set(selectableIds));
          }}
        >
          <DialogTrigger asChild>
            <Button variant="secondary">
              <Shuffle className="size-4" /> Random assign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Random assign</DialogTitle>
              <DialogDescription>
                Fairly spreads the selected days across the group, balancing load.
              </DialogDescription>
            </DialogHeader>

            <OccurrencePicker
              occurrences={occurrences}
              selected={selected}
              onChange={setSelected}
            />

            <DialogFooter>
              <Button
                variant="gradient"
                onClick={randomAssign}
                disabled={pending || selected.size === 0}
              >
                {pending ? "Assigning…" : `Assign ${selected.size} day(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive"
        aria-label="Delete task"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this task and all its occurrences?")) return;
          start(async () => {
            try {
              await deleteTask(taskId);
              toast.success("Task deleted");
              router.push(`/groups/${groupId}`);
            } catch (e) {
              toast.error((e as Error).message);
            }
          });
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
