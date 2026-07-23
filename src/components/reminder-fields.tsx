"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { localTimeToUtc, utcTimeToLocal } from "@/lib/utils";

function Row({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // `value`/`onChange` speak UTC; the input shows/edits the browser's local
  // time. Before mount we render the raw UTC value so SSR and the first client
  // render agree, then switch to local once the timezone is known.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const display = mounted && value ? utcTimeToLocal(value) : value;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="time"
          value={display}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v && mounted ? localTimeToUtc(v) : v);
          }}
          className="w-32"
        />
        {value && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Two reminder-time inputs (unassigned nudge + do-the-task nudge). Empty string
 * means "no reminder" at the task level, or "inherit the task default" for a
 * per-occurrence override — the caller sets the hints accordingly.
 */
export function ReminderTimeFields({
  unassignedValue,
  doValue,
  onUnassignedChange,
  onDoChange,
  unassignedHint = "When nobody's assigned yet, nudge the group",
  doHint = "Nudge the assignee to get it done",
}: {
  unassignedValue: string;
  doValue: string;
  onUnassignedChange: (v: string) => void;
  onDoChange: (v: string) => void;
  unassignedHint?: string;
  doHint?: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Reminders (your local time)
      </Label>
      <Row
        label="If unassigned"
        hint={unassignedHint}
        value={unassignedValue}
        onChange={onUnassignedChange}
      />
      <Row label="To do it" hint={doHint} value={doValue} onChange={onDoChange} />
    </div>
  );
}
