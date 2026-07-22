import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/push";
import { formatDate } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Core reminder sweep. For every task occurrence whose day has arrived (today or
 * earlier) that is still unassigned and has not been reminded, notify every
 * member of the owning group to assign it. Also flags overdue occurrences as MISSED.
 * Idempotent per occurrence via reminderSentAt.
 */
export async function runReminderSweep() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  // 1) Unassigned occurrences due today (not yet reminded) → notify the group.
  const due = await prisma.taskOccurrence.findMany({
    where: {
      status: "PENDING",
      assigneeId: null,
      reminderSentAt: null,
      date: { gte: today, lt: tomorrow },
    },
    include: {
      task: { include: { group: { include: { members: true } } } },
    },
  });

  let notified = 0;
  for (const occ of due) {
    const members = occ.task.group.members;
    await Promise.all(
      members.map((m) =>
        notifyUser(m.userId, "UNASSIGNED_TASK", {
          title: `Unassigned: ${occ.task.title}`,
          body: `"${occ.task.title}" is due ${formatDate(occ.date)} in ${occ.task.group.name} and nobody is assigned yet. Tap to assign.`,
          url: `${APP_URL}/tasks/${occ.taskId}`,
          tag: `occ-${occ.id}`,
        })
      )
    );
    await prisma.taskOccurrence.update({
      where: { id: occ.id },
      data: { reminderSentAt: new Date() },
    });
    notified += members.length;
  }

  // 2) Past unassigned occurrences → mark MISSED.
  const missed = await prisma.taskOccurrence.updateMany({
    where: { status: "PENDING", assigneeId: null, date: { lt: today } },
    data: { status: "MISSED" },
  });

  return {
    remindedOccurrences: due.length,
    notificationsSent: notified,
    markedMissed: missed.count,
  };
}
