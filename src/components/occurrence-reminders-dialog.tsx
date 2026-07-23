"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReminderTimeFields } from "@/components/reminder-fields";
import { utcTimeToLocal } from "@/lib/utils";
import { setOccurrenceReminders } from "@/lib/actions";

export function OccurrenceRemindersDialog({
  open,
  onOpenChange,
  taskId,
  dateKey,
  unassignedOverride,
  doOverride,
  taskUnassigned,
  taskDo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  taskId: string;
  dateKey: string;
  unassignedOverride: string | null;
  doOverride: string | null;
  taskUnassigned: string | null;
  taskDo: string | null;
}) {
  const [unassignedTime, setUnassignedTime] = useState(unassignedOverride ?? "");
  const [doTime, setDoTime] = useState(doOverride ?? "");
  const [pending, start] = useTransition();

  const inherited = (t: string | null) =>
    t ? `Task default: ${utcTimeToLocal(t)}` : "No task default set";

  function save() {
    start(async () => {
      try {
        await setOccurrenceReminders({
          taskId,
          date: dateKey,
          unassignedReminderTime: unassignedTime || null,
          doReminderTime: doTime || null,
        });
        toast.success("Reminders updated for this day");
        onOpenChange(false);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setUnassignedTime(unassignedOverride ?? "");
          setDoTime(doOverride ?? "");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reminders for this day</DialogTitle>
          <DialogDescription>
            Override the task&apos;s reminder times just for this occurrence. Leave a field empty to
            inherit the task default.
          </DialogDescription>
        </DialogHeader>

        <ReminderTimeFields
          unassignedValue={unassignedTime}
          doValue={doTime}
          onUnassignedChange={setUnassignedTime}
          onDoChange={setDoTime}
          unassignedHint={inherited(taskUnassigned)}
          doHint={inherited(taskDo)}
        />

        <DialogFooter>
          <Button variant="gradient" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
