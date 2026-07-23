import { prisma } from "@/lib/db";
import { computeDueDates, resolveOccurrences } from "@/lib/occurrences";
import { randomAssignTask } from "@/lib/assignment";
import { runReminderSweep } from "@/lib/reminders";
import { getGroupReport } from "@/lib/queries";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓ " + msg);
}

/** Resolve a task's days over the next `days` days (virtual + overrides). */
async function resolveTask(taskId: string, days: number) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { rules: true } });
  if (!task) throw new Error("task not found");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const until = new Date(today.getTime() + days * 86_400_000);
  const overrides = await prisma.taskOccurrence.findMany({
    where: { taskId, date: { gte: today, lte: until } },
  });
  return resolveOccurrences(task, task.rules, overrides, today, until);
}

async function main() {
  // Clean slate
  await prisma.notification.deleteMany({});
  await prisma.reminderLog.deleteMany({});
  await prisma.taskOccurrence.deleteMany({});
  await prisma.assignmentRule.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: "@verify.test" } } });

  console.log("1) Seed users + group");
  const alice = await prisma.user.create({ data: { name: "Alice", email: "alice@verify.test" } });
  const bob = await prisma.user.create({ data: { name: "Bob", email: "bob@verify.test" } });
  const group = await prisma.group.create({
    data: {
      name: "Verify Group",
      ownerId: alice.id,
      members: { create: [{ userId: alice.id, role: "OWNER" }, { userId: bob.id, role: "MEMBER" }] },
    },
  });
  assert(group.id, "group created with two members");

  console.log("2) Recurring daily task → days expand virtually (no rows created)");
  const daily = await prisma.task.create({
    data: {
      groupId: group.id,
      title: "Daily standup",
      createdById: alice.id,
      scheduleType: "RECURRING",
      rrule: "FREQ=DAILY;INTERVAL=1",
      allowRandomAssign: true,
    },
  });
  const rowsAfterCreate = await prisma.taskOccurrence.count({ where: { taskId: daily.id } });
  assert(rowsAfterCreate === 0, `no occurrence rows materialized on create (got ${rowsAfterCreate})`);
  const dailyDays = await resolveTask(daily.id, 14);
  assert(dailyDays.length >= 14 && dailyDays.length <= 15, `~14 daily days resolved (got ${dailyDays.length})`);

  console.log("3) Weekly task with weekday rule pre-assignment (computed, not stored)");
  const weekly = await prisma.task.create({
    data: {
      groupId: group.id,
      title: "Trash duty",
      createdById: alice.id,
      scheduleType: "RECURRING",
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR",
      allowRandomAssign: true,
      rules: { create: { scope: "WEEKDAY", target: { weekday: 1 }, assigneeId: bob.id } },
    },
  });
  const weeklyDays = await resolveTask(weekly.id, 21);
  const bobDays = weeklyDays.filter((o) => o.assigneeId === bob.id);
  assert(bobDays.length > 0, `Monday rule pre-assigns Bob (${bobDays.length} days)`);
  assert(bobDays.every((o) => o.date.getUTCDay() === 1), "all rule-assigned days fall on Monday");
  const weeklyRows = await prisma.taskOccurrence.count({ where: { taskId: weekly.id } });
  assert(weeklyRows === 0, `rule assignment stored no rows (got ${weeklyRows})`);

  console.log("4) computeDueDates specific dates");
  const dates = computeDueDates(
    { scheduleType: "SPECIFIC_DATES", rrule: null, specificDates: ["2099-01-01", "2099-01-05"] },
    new Date("2099-01-01"),
    new Date("2099-12-31")
  );
  assert(dates.length === 2, "two specific dates computed");

  console.log("5) Random assign balances load (writes only override rows)");
  const res = await randomAssignTask(daily.id);
  assert(res.assigned > 0, `random assign filled ${res.assigned} pending days`);
  const counts = await prisma.taskOccurrence.groupBy({
    by: ["assigneeId"],
    where: { taskId: daily.id, assigneeId: { not: null } },
    _count: { _all: true },
  });
  const loads = counts.map((c) => c._count._all);
  const spread = Math.max(...loads) - Math.min(...loads);
  assert(counts.length === 2, "both members received assignments");
  assert(spread <= 1, `load balanced within 1 (spread=${spread})`);

  console.log("6) Reminder sweep notifies group for unassigned-due-today (no pre-created row)");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lonely = await prisma.task.create({
    data: {
      groupId: group.id,
      title: "Water the plants",
      createdById: alice.id,
      scheduleType: "SPECIFIC_DATES",
      specificDates: [today.toISOString().slice(0, 10)],
    },
  });
  const sweep = await runReminderSweep();
  assert(sweep.remindedUnassigned >= 1, `reminded ${sweep.remindedUnassigned} day(s)`);
  assert(sweep.notificationsSent >= 2, `notified both members (${sweep.notificationsSent})`);
  const notifs = await prisma.notification.count({ where: { type: "UNASSIGNED_TASK" } });
  assert(notifs >= 2, `in-app notifications persisted (${notifs})`);
  const logged = await prisma.reminderLog.count({ where: { taskId: lonely.id } });
  assert(logged === 1, `reminder ledger recorded the send (got ${logged})`);

  const sweep2 = await runReminderSweep();
  assert(sweep2.remindedUnassigned === 0, "second sweep is idempotent (no duplicate reminders)");

  console.log("7) Report metrics (computed from virtual occurrences)");
  const report = await getGroupReport(alice.id, group.id, 30);
  assert(report !== null && report.total > 0, `report computed with ${report?.total} occurrences`);
  assert(report!.perMember.length === 2, "report has per-member load for both members");

  console.log("\nALL CHECKS PASSED ✅");
}

main()
  .catch((e) => {
    console.error("\n❌", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
