import { rrulestr } from "rrule";
import { prisma } from "@/lib/db";
import { toDateOnly } from "@/lib/utils";
import type { Task } from "@prisma/client";

export const HORIZON_DAYS = 60;

/** Compute the due dates for a task within [from, until] (UTC date-only). */
export function computeDueDates(task: Pick<Task, "scheduleType" | "rrule" | "specificDates">, from: Date, until: Date): Date[] {
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
 * Materialize TaskOccurrence rows for the rolling horizon.
 * Idempotent: relies on the @@unique([taskId, date]) constraint.
 * Applies AssignmentRules to pre-assign the occurrence when possible.
 */
export async function generateOccurrences(taskId: string, horizonDays = HORIZON_DAYS) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { rules: true },
  });
  if (!task) return;

  const from = new Date();
  const until = new Date(from.getTime() + horizonDays * 86_400_000);
  const dates = computeDueDates(task, from, until);

  for (const date of dates) {
    const assigneeId = resolveRuleAssignee(task.rules, date);
    await prisma.taskOccurrence.upsert({
      where: { taskId_date: { taskId, date } },
      update: {}, // never clobber an existing occurrence's manual assignment
      create: {
        taskId,
        date,
        assigneeId: assigneeId ?? undefined,
        status: assigneeId ? "ASSIGNED" : "PENDING",
      },
    });
  }
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
