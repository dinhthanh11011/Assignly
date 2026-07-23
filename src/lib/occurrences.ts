import { rrulestr } from "rrule";
import { toDateOnly } from "@/lib/utils";
import type { Task, TaskOccurrence, OccurrenceStatus } from "@prisma/client";

/** Default look-ahead window used when a caller doesn't specify one. */
export const DEFAULT_WINDOW_DAYS = 60;

/** Compute the due dates for a task within [from, until] (UTC date-only). */
export function computeDueDates(
  task: Pick<Task, "scheduleType" | "rrule" | "specificDates">,
  from: Date,
  until: Date
): Date[] {
  const fromD = toDateOnly(from);
  const untilD = toDateOnly(until);

  if (task.scheduleType === "SPECIFIC_DATES") {
    const raw = (task.specificDates as string[] | null) ?? [];
    return raw
      .map((s) => toDateOnly(new Date(s)))
      .filter((d) => d >= fromD && d <= untilD)
      .sort((a, b) => a.getTime() - b.getTime());
  }

  if (task.scheduleType === "RECURRING" && task.rrule) {
    try {
      const rule = rrulestr(task.rrule);
      // rrule works in UTC when dates are constructed at UTC midnight.
      return rule.between(fromD, untilD, true).map(toDateOnly);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * A single day of a task, resolved from the schedule + assignment rules + any
 * sparse TaskOccurrence override. This is what the UI and reports consume; most
 * days have no override row and are computed entirely on the fly.
 */
export type EffectiveOccurrence = {
  taskId: string;
  date: Date; // UTC midnight
  dateKey: string; // "YYYY-MM-DD" — stable identity for a day
  status: OccurrenceStatus;
  assigneeId: string | null;
  assignedById: string | null;
  completedAt: Date | null;
  /** Effective reminder-time overrides for this day (null = inherit task). */
  unassignedReminderTime: string | null;
  doReminderTime: string | null;
  /** Whether a persisted override row backs this day. */
  hasOverride: boolean;
};

/** Override columns the resolver needs from a TaskOccurrence row. */
export type OverrideRow = Pick<
  TaskOccurrence,
  | "date"
  | "status"
  | "assigneeSet"
  | "assigneeId"
  | "assignedById"
  | "completedAt"
  | "unassignedReminderTime"
  | "doReminderTime"
>;

/** Derive the effective status of a day. DONE and assignment win; a past,
 * unassigned, not-done day is MISSED (matches the old sweep semantics). */
export function computeStatus(
  assigneeId: string | null,
  completedAt: Date | null,
  date: Date,
  today: Date
): OccurrenceStatus {
  if (completedAt) return "DONE";
  if (assigneeId) return "ASSIGNED";
  if (date < today) return "MISSED";
  return "PENDING";
}

/**
 * Expand a task into its effective days over [from, until], merging the sparse
 * overrides on top of the rrule/specificDates schedule and assignment rules.
 * Pure — no DB access; callers load the task, its rules, and any overrides.
 */
export function resolveOccurrences(
  task: Pick<Task, "id" | "scheduleType" | "rrule" | "specificDates">,
  rules: RuleLike[],
  overrides: OverrideRow[],
  from: Date,
  until: Date,
  now: Date = new Date()
): EffectiveOccurrence[] {
  const today = toDateOnly(now);
  const byKey = new Map<string, OverrideRow>();
  for (const o of overrides) byKey.set(isoDate(o.date), o);

  return computeDueDates(task, from, until).map((date) => {
    const dateKey = isoDate(date);
    const ov = byKey.get(dateKey);

    // The override controls the assignee only when it was set explicitly;
    // otherwise the day falls back to the task's assignment rules.
    const assigneeId = ov?.assigneeSet ? ov.assigneeId : resolveRuleAssignee(rules, date);
    const assignedById = ov?.assigneeSet ? ov.assignedById : null;
    const completedAt = ov?.completedAt ?? null;

    return {
      taskId: task.id,
      date,
      dateKey,
      status: computeStatus(assigneeId, completedAt, date, today),
      assigneeId,
      assignedById,
      completedAt,
      unassignedReminderTime: ov?.unassignedReminderTime ?? null,
      doReminderTime: ov?.doReminderTime ?? null,
      hasOverride: !!ov,
    };
  });
}

type RuleLike = {
  scope: "WHOLE_TASK" | "DATE" | "WEEKDAY" | "WEEK";
  target: unknown;
  assigneeId: string;
};

/** Most-specific rule wins: DATE > WEEK > WEEKDAY > WHOLE_TASK. */
export function resolveRuleAssignee(rules: RuleLike[], date: Date): string | null {
  const priority: Record<RuleLike["scope"], number> = {
    DATE: 4,
    WEEK: 3,
    WEEKDAY: 2,
    WHOLE_TASK: 1,
  };
  let best: { p: number; assignee: string } | null = null;

  for (const r of rules) {
    if (!matchesRule(r, date)) continue;
    const p = priority[r.scope];
    if (!best || p > best.p) best = { p, assignee: r.assigneeId };
  }
  return best?.assignee ?? null;
}

function matchesRule(rule: RuleLike, date: Date): boolean {
  const target = (rule.target ?? {}) as Record<string, unknown>;
  switch (rule.scope) {
    case "WHOLE_TASK":
      return true;
    case "WEEKDAY":
      return date.getUTCDay() === Number(target.weekday);
    case "DATE":
      return isoDate(date) === String(target.date);
    case "WEEK": {
      const start = toDateOnly(new Date(String(target.weekStart)));
      const end = new Date(start.getTime() + 6 * 86_400_000);
      return date >= start && date <= end;
    }
    default:
      return false;
  }
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a "YYYY-MM-DD" day key into a UTC-midnight Date. */
export function dateFromKey(dateKey: string): Date {
  return toDateOnly(new Date(`${dateKey}T00:00:00.000Z`));
}
