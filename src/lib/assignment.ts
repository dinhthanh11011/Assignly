import { prisma } from "@/lib/db";

/**
 * Randomly assign a member to each unassigned occurrence of a task, balancing
 * load: the member with the fewest current assignments for this task is picked
 * (ties broken randomly). Only affects PENDING occurrences from today onward.
 */
export async function randomAssignTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { members: true } } },
  });
  if (!task) throw new Error("Task not found");

  const memberIds = task.group.members.map((m) => m.userId);
  if (memberIds.length === 0) return { assigned: 0 };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const pending = await prisma.taskOccurrence.findMany({
    where: { taskId, status: "PENDING", date: { gte: today } },
    orderBy: { date: "asc" },
  });

  // Seed the load counter with existing assignments for this task.
  const existing = await prisma.taskOccurrence.groupBy({
    by: ["assigneeId"],
    where: { taskId, assigneeId: { not: null } },
    _count: { _all: true },
  });
  const load = new Map<string, number>(memberIds.map((id) => [id, 0]));
  for (const row of existing) {
    if (row.assigneeId) load.set(row.assigneeId, row._count._all);
  }

  let assigned = 0;
  for (const occ of pending) {
    const min = Math.min(...memberIds.map((id) => load.get(id) ?? 0));
    const candidates = memberIds.filter((id) => (load.get(id) ?? 0) === min);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    await prisma.taskOccurrence.update({
      where: { id: occ.id },
      data: { assigneeId: picked, status: "ASSIGNED" },
    });
    load.set(picked, (load.get(picked) ?? 0) + 1);
    assigned++;
  }
  return { assigned };
}

/** Randomly assign a single occurrence to a group member. */
export async function randomAssignOccurrence(occurrenceId: string) {
  const occ = await prisma.taskOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { task: { include: { group: { include: { members: true } } } } },
  });
  if (!occ) throw new Error("Occurrence not found");
  const memberIds = occ.task.group.members.map((m) => m.userId);
  if (memberIds.length === 0) return null;
  const picked = memberIds[Math.floor(Math.random() * memberIds.length)];
  await prisma.taskOccurrence.update({
    where: { id: occurrenceId },
    data: { assigneeId: picked, status: "ASSIGNED" },
  });
  return picked;
}
