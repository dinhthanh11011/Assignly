import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/push";
import { formatDate } from "@/lib/utils";

/** Parse an "HH:MM" clock time into minutes-of-day, or null if invalid/empty. */
function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins < 1440 ? mins : null;
}

/**
 * Core reminder sweep. Reminder times are configured per task and can be
 * overridden per occurrence ("HH:MM", UTC); the occurrence override wins, then
 * the task default. Two events fire on an occurrence's due day:
 *
 *   • UNASSIGNED — still unassigned → nudge the whole group. When no time is
 *     configured this fires as soon as the day arrives (legacy behavior).
 *   • DO_TASK — assigned but not done → nudge the assignee. Opt-in: only fires
 *     when a time is configured.
 *
 * Idempotent per occurrence via reminderSentAt / doReminderSentAt. Also flags
 * overdue unassigned occurrences as MISSED.
 */
export async function runReminderSweep() {
  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const dueToday = await prisma.taskOccurrence.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: {
      assignee: { select: { id: true } },
      task: { include: { group: { include: { members: true } } } },
    },
  });

  let remindedUnassigned = 0;
  let remindedAssignees = 0;
  let notified = 0;

  for (const occ of dueToday) {
    const task = occ.task;

    // 1) Unassigned → nudge the group.
    if (occ.status === "PENDING" && !occ.assigneeId && !occ.reminderSentAt) {
      const configured = toMinutes(occ.unassignedReminderTime ?? task.unassignedReminderTime);
      // No time set → keep legacy "as soon as the day is here" behavior.
      if (configured === null || nowMinutes >= configured) {
        await Promise.all(
          task.group.members.map((m) =>
            notifyUser(m.userId, "UNASSIGNED_TASK", {
              title: `Unassigned: ${task.title}`,
              body: `"${task.title}" is due ${formatDate(occ.date)} in ${task.group.name} and nobody is assigned yet. Tap to assign.`,
              url: `/tasks/${occ.taskId}`,
              tag: `occ-unassigned-${occ.id}`,
            })
          )
        );
        await prisma.taskOccurrence.update({
          where: { id: occ.id },
          data: { reminderSentAt: new Date() },
        });
        notified += task.group.members.length;
        remindedUnassigned++;
      }
    }

    // 2) Assigned but not done → nudge the assignee (opt-in).
    if (occ.status === "ASSIGNED" && occ.assigneeId && !occ.doReminderSentAt) {
      const configured = toMinutes(occ.doReminderTime ?? task.doReminderTime);
      if (configured !== null && nowMinutes >= configured) {
        await notifyUser(occ.assigneeId, "DO_TASK", {
          title: `Reminder: ${task.title}`,
          body: `"${task.title}" is on you today in ${task.group.name}. Tap to mark it done.`,
          url: `/tasks/${occ.taskId}`,
          tag: `occ-do-${occ.id}`,
        });
        await prisma.taskOccurrence.update({
          where: { id: occ.id },
          data: { doReminderSentAt: new Date() },
        });
        notified += 1;
        remindedAssignees++;
      }
    }
  }

  // 3) Past unassigned occurrences → mark MISSED.
  const missed = await prisma.taskOccurrence.updateMany({
    where: { status: "PENDING", assigneeId: null, date: { lt: today } },
    data: { status: "MISSED" },
  });

  return {
    remindedUnassigned,
    remindedAssignees,
    notificationsSent: notified,
    markedMissed: missed.count,
  };
}
