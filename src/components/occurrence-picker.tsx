"use client";
import { Check } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export type PickableOccurrence = {
  dateKey: string;
  date: Date;
  status: "PENDING" | "ASSIGNED" | "DONE" | "MISSED";
  assignee?: { name?: string | null; email?: string | null } | null;
};

/** Multi-select list of occurrences (by day). DONE ones are not selectable. */
export function OccurrencePicker({
  occurrences,
  selected,
  onChange,
}: {
  occurrences: PickableOccurrence[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const selectable = occurrences.filter((o) => o.status !== "DONE");

  function toggle(dateKey: string) {
    const next = new Set(selected);
    if (next.has(dateKey)) next.delete(dateKey);
    else next.add(dateKey);
    onChange(next);
  }

  function setAll(on: boolean) {
    onChange(on ? new Set(selectable.map((o) => o.dateKey)) : new Set());
  }

  const allOn = selectable.length > 0 && selectable.every((o) => selected.has(o.dateKey));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Which days? <span className="text-muted-foreground">({selected.size} selected)</span>
        </span>
        <button
          type="button"
          onClick={() => setAll(!allOn)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {allOn ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
        {selectable.length === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">
            No assignable occurrences.
          </p>
        ) : (
          selectable.map((o) => {
            const on = selected.has(o.dateKey);
            return (
              <button
                key={o.dateKey}
                type="button"
                onClick={() => toggle(o.dateKey)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  on ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                >
                  {on && <Check className="size-3.5" />}
                </span>
                <span className="flex-1 font-medium">{formatDate(o.date)}</span>
                {o.assignee && (
                  <span className="truncate text-xs text-muted-foreground">
                    {o.assignee.name || o.assignee.email}
                  </span>
                )}
                <StatusBadge status={o.status} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
