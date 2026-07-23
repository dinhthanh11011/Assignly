import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/push";
import { formatDate } from "@/lib/utils";
import { resolveOccurrences } from "@/lib/occurrences";

/** Parse an "HH:MM" clock time into minutes-of-day, or null if invalid/empty. */
function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins < 1440 ? mins : null;
}

/**
 * Core reminder sweep. Occurrences are virtual: this expands each task's
 * schedule for today, merges any per-day override, and fires two events. Reminder
 * times are "HH:MM" UTC; the per-day override wins, then the task default.
 *
 *   • UNASSIGNED — still unassigned → nudge the whole group. When no time is
 *     configured this fires as soon as the day arrives (legacy behavior).
 *   • DO_TASK — assigned but not done → nudge the assignee. Opt-in: only fires
 *     when a time is configured.
 *
 * Idempotent via the ReminderLog ledger keyed on (taskId, date, kind). MISSED is
 * derived on read, so there is nothing to sweep for it.
 */
export async function runReminderSweep() {
  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  // Only tasks whose schedule could produce a day today matter. We over-select
  // (all tasks) and let resolveOccurrences filter — task counts are small.
  const tasks = await prisma.task.findMany({
    include: {
      rules: true,
      group: { include: { members: { select: { userId: true } } } },
      occurrences: { where: { date: { gte: today, lt: tomorrow } } },
      reminderLogs: { where: { date: { gte: today, lt: tomorrow } } },
    },
  });

  let remindedUnassigned = 0;
  let remindedAssignees = 0;
  let notified = 0;

  for (const task of tasks) {
    const [occ] = resolveOccurrences(task, task.rules, task.occurrences, today, tomorrow, now);
    if (!occ || occ.date >= tomorrow) continue;

    const sent = new Set(task.reminderLogs.map((l) => l.kind));

    // 1) Unassigned → nudge the group.
    if (occ.status === "PENDING" && !occ.assigneeId && !sent.has("UNASSIGNED")) {
      const configured = toMinutes(occ.unassignedReminderTime ?? task.unassignedReminderTime);
      // No time set → keep legacy "as soon as the day is here" behavior.
      if (configured === null || nowMinutes >= configured) {
        await Promise.all(
          task.group.members.map((m) =>
            notifyUser(m.userId, "UNASSIGNED_TASK", {
              title: `Unassigned: ${task.title}`,
              body: `"${task.title}" is due ${formatDate(occ.date)} in ${task.group.name} and nobody is assigned yet. Tap to assign.`,
              url: `/tasks/${task.id}`,
              tag: `occ-unassigned-${task.id}-${occ.dateKey}`,
            })
          )
        );
        await logReminder(task.id, occ.date, "UNASSIGNED");
        notified += task.group.members.length;
        remindedUnassigned++;
      }
    }

    // 2) Assigned but not done → nudge the assignee (opt-in).
    if (occ.status === "ASSIGNED" && occ.assigneeId && !sent.has("DO_TASK")) {
      const configured = toMinutes(occ.doReminderTime ?? task.doReminderTime);
      if (configured !== null && nowMinutes >= configured) {
        await notifyUser(occ.assigneeId, "DO_TASK", {
          title: `Reminder: ${task.title}`,
          body: `"${task.title}" is on you today in ${task.group.name}. Tap to mark it done.`,
          url: `/tasks/${task.id}`,
          tag: `occ-do-${task.id}-${occ.dateKey}`,
        });
        await logReminder(task.id, occ.date, "DO_TASK");
        notified += 1;
        remindedAssignees++;
      }
    }
  }

  return {
    remindedUnassigned,
    remindedAssignees,
    notificationsSent: notified,
  };
}

/** Record that a reminder fired for a day, ignoring races on the unique key. */
async function logReminder(taskId: string, date: Date, kind: "UNASSIGNED" | "DO_TASK") {
  await prisma.reminderLog
    .create({ data: { taskId, date, kind } })
    .catch(() => {}); // unique (taskId,date,kind) already logged — nothing to do
}
