import { prisma } from "@/lib/db";
import { generateOccurrences, computeDueDates } from "@/lib/occurrences";
import { randomAssignTask } from "@/lib/assignment";
import { runReminderSweep } from "@/lib/reminders";
import { getGroupReport } from "@/lib/queries";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓ " + msg);
}

async function main() {
  // Clean slate
  await prisma.notification.deleteMany({});
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

  console.log("2) Recurring daily task → occurrences generated");
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
  await generateOccurrences(daily.id, 14);
  const dailyOccs = await prisma.taskOccurrence.count({ where: { taskId: daily.id } });
  assert(dailyOccs >= 14 && dailyOccs <= 15, `~14 daily occurrences created (got ${dailyOccs})`);

  console.log("3) Weekly task with weekday rule pre-assignment");
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
  await generateOccurrences(weekly.id, 21);
  const mondayAssigned = await prisma.taskOccurrence.findMany({ where: { taskId: weekly.id, assigneeId: bob.id } });
  assert(mondayAssigned.length > 0, `Monday rule pre-assigned Bob (${mondayAssigned.length} occ)`);
  assert(
    mondayAssigned.every((o) => new Date(o.date).getUTCDay() === 1),
    "all rule-assigned occurrences fall on Monday"
  );

  console.log("4) computeDueDates specific dates");
  const dates = computeDueDates(
    { scheduleType: "SPECIFIC_DATES", rrule: null, specificDates: ["2099-01-01", "2099-01-05"] },
    new Date("2099-01-01"),
    new Date("2099-12-31")
  );
  assert(dates.length === 2, "two specific dates computed");

  console.log("5) Random assign balances load");
  const res = await randomAssignTask(daily.id);
  assert(res.assigned > 0, `random assign filled ${res.assigned} pending occurrences`);
  const counts = await prisma.taskOccurrence.groupBy({
    by: ["assigneeId"],
    where: { taskId: daily.id, assigneeId: { not: null } },
    _count: { _all: true },
  });
  const loads = counts.map((c) => c._count._all);
  const spread = Math.max(...loads) - Math.min(...loads);
  assert(counts.length === 2, "both members received assignments");
  assert(spread <= 1, `load balanced within 1 (spread=${spread})`);

  console.log("6) Reminder sweep notifies group for unassigned-due-today");
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
  await prisma.taskOccurrence.create({ data: { taskId: lonely.id, date: today, status: "PENDING" } });
  const sweep = await runReminderSweep();
  assert(sweep.remindedOccurrences >= 1, `reminded ${sweep.remindedOccurrences} occurrence(s)`);
  assert(sweep.notificationsSent >= 2, `notified both members (${sweep.notificationsSent})`);
  const notifs = await prisma.notification.count({ where: { type: "UNASSIGNED_TASK" } });
  assert(notifs >= 2, `in-app notifications persisted (${notifs})`);

  const sweep2 = await runReminderSweep();
  assert(sweep2.remindedOccurrences === 0, "second sweep is idempotent (no duplicate reminders)");

  console.log("7) Report metrics");
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
