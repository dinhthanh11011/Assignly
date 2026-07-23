"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getMembership, getNotifications } from "@/lib/queries";
import { generateOccurrences, computeDueDates, HORIZON_DAYS } from "@/lib/occurrences";
import { randomAssignTask, randomAssignOccurrence } from "@/lib/assignment";
import { createJoinRequest } from "@/lib/join";
import { notifyUser } from "@/lib/push";
import { generateInviteCode } from "@/lib/utils";

async function assertMember(userId: string, groupId: string) {
  const m = await getMembership(userId, groupId);
  if (!m) throw new Error("You are not a member of this group");
  return m;
}

async function assertTaskMember(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { groupId: true } });
  if (!task) throw new Error("Task not found");
  await assertMember(userId, task.groupId);
  return task;
}

// ─── Groups ─────────────────────────────────────────────────────────────────
export async function createGroup(formData: FormData) {
  const userId = await requireUserId();
  const name = z.string().min(1).max(80).parse(formData.get("name"));

  const group = await prisma.group.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
      invites: { create: { code: generateInviteCode() } },
    },
  });
  revalidatePath("/groups");
  return { id: group.id };
}

/**
 * Ask to join a group by invite code. Creates a pending request that an
 * owner/admin must approve — it does not grant membership immediately.
 */
export async function requestToJoinByCode(code: string) {
  const userId = await requireUserId();
  const parsed = z.string().min(4).parse(code.trim().toUpperCase());

  const invite = await prisma.groupInvite.findUnique({ where: { code: parsed } });
  if (!invite) throw new Error("Invalid invite code");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite expired");

  const status = await createJoinRequest(userId, invite.groupId);
  revalidatePath("/groups");
  revalidatePath(`/groups/${invite.groupId}`);
  return { status, groupId: invite.groupId };
}

export async function approveJoinRequest(requestId: string) {
  const userId = await requireUserId();
  const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Request not found");
  const m = await assertMember(userId, req.groupId);
  if (m.role === "MEMBER") throw new Error("Only owners and admins can manage join requests");

  await prisma.$transaction([
    prisma.groupMember.upsert({
      where: { userId_groupId: { userId: req.userId, groupId: req.groupId } },
      update: {},
      create: { userId: req.userId, groupId: req.groupId, role: "MEMBER" },
    }),
    prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedAt: new Date() },
    }),
  ]);

  const group = await prisma.group.findUnique({
    where: { id: req.groupId },
    select: { name: true },
  });
  await notifyUser(req.userId, "JOIN_APPROVED", {
    title: "Request approved",
    body: `You're now a member of ${group?.name ?? "the group"}.`,
    url: `/groups/${req.groupId}`,
  });

  revalidatePath(`/groups/${req.groupId}`);
  revalidatePath("/groups");
}

export async function rejectJoinRequest(requestId: string) {
  const userId = await requireUserId();
  const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Request not found");
  const m = await assertMember(userId, req.groupId);
  if (m.role === "MEMBER") throw new Error("Only owners and admins can manage join requests");

  await prisma.groupJoinRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  const group = await prisma.group.findUnique({
    where: { id: req.groupId },
    select: { name: true },
  });
  await notifyUser(req.userId, "JOIN_REJECTED", {
    title: "Request declined",
    body: `Your request to join ${group?.name ?? "the group"} wasn't approved.`,
    url: `/groups`,
  });

  revalidatePath(`/groups/${req.groupId}`);
}

export async function removeMember(groupId: string, memberUserId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Only owners and admins can remove members");
  if (memberUserId === userId) throw new Error("Use “Leave group” to remove yourself");

  const target = await getMembership(memberUserId, groupId);
  if (!target) throw new Error("That person is not a member");
  if (target.role === "OWNER") throw new Error("The group owner can't be removed");

  await prisma.groupMember.deleteMany({ where: { userId: memberUserId, groupId } });
  // Clear any old request so they can ask to re-join later.
  await prisma.groupJoinRequest.deleteMany({ where: { userId: memberUserId, groupId } });
  revalidatePath(`/groups/${groupId}`);
}

export async function rotateInvite(groupId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Only admins can rotate invites");
  const invite = await prisma.groupInvite.create({
    data: { groupId, code: generateInviteCode() },
  });
  revalidatePath(`/groups/${groupId}`);
  return { code: invite.code };
}

export async function leaveGroup(groupId: string) {
  const userId = await requireUserId();
  await assertMember(userId, groupId);
  await prisma.groupMember.deleteMany({ where: { userId, groupId } });
  revalidatePath("/groups");
}

// ─── Tasks ──────────────────────────────────────────────────────────────────
/** "HH:MM" clock time, or null to mean "no reminder" / "inherit". */
const reminderTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
  .nullable()
  .optional();

const taskSchema = z
  .object({
    groupId: z.string(),
    title: z.string().min(1).max(120),
    description: z.string().max(1000).optional().nullable(),
    scheduleType: z.enum(["RECURRING", "SPECIFIC_DATES"]),
    rrule: z.string().optional().nullable(),
    specificDates: z.array(z.string()).optional().nullable(),
    allowRandomAssign: z.boolean().default(true),
    defaultAssigneeId: z.string().optional().nullable(),
    unassignedReminderTime: reminderTime,
    doReminderTime: reminderTime,
  })
  .refine((v) => (v.scheduleType === "RECURRING" ? !!v.rrule : true), {
    message: "A recurrence rule is required",
  })
  .refine(
    (v) => (v.scheduleType === "SPECIFIC_DATES" ? !!v.specificDates?.length : true),
    { message: "Select at least one date" }
  );

export async function createTask(input: z.input<typeof taskSchema>) {
  const userId = await requireUserId();
  const data = taskSchema.parse(input);
  await assertMember(userId, data.groupId);

  const task = await prisma.task.create({
    data: {
      groupId: data.groupId,
      title: data.title,
      description: data.description || null,
      createdById: userId,
      scheduleType: data.scheduleType,
      rrule: data.scheduleType === "RECURRING" ? data.rrule : null,
      specificDates:
        data.scheduleType === "SPECIFIC_DATES" ? data.specificDates ?? undefined : undefined,
      allowRandomAssign: data.allowRandomAssign,
      unassignedReminderTime: data.unassignedReminderTime ?? null,
      doReminderTime: data.doReminderTime ?? null,
      rules: data.defaultAssigneeId
        ? { create: { scope: "WHOLE_TASK", assigneeId: data.defaultAssigneeId } }
        : undefined,
    },
  });

  await generateOccurrences(task.id);
  revalidatePath(`/groups/${data.groupId}`);
  revalidatePath("/");
  return { id: task.id };
}

const updateTaskSchema = z
  .object({
    taskId: z.string(),
    title: z.string().min(1).max(120),
    description: z.string().max(1000).optional().nullable(),
    scheduleType: z.enum(["RECURRING", "SPECIFIC_DATES"]),
    rrule: z.string().optional().nullable(),
    specificDates: z.array(z.string()).optional().nullable(),
    allowRandomAssign: z.boolean().default(true),
    unassignedReminderTime: reminderTime,
    doReminderTime: reminderTime,
  })
  .refine((v) => (v.scheduleType === "RECURRING" ? !!v.rrule : true), {
    message: "A recurrence rule is required",
  })
  .refine(
    (v) => (v.scheduleType === "SPECIFIC_DATES" ? !!v.specificDates?.length : true),
    { message: "Select at least one date" }
  );

export async function updateTask(input: z.input<typeof updateTaskSchema>) {
  const userId = await requireUserId();
  const data = updateTaskSchema.parse(input);
  const { groupId } = await assertTaskMember(userId, data.taskId);

  await prisma.task.update({
    where: { id: data.taskId },
    data: {
      title: data.title,
      description: data.description || null,
      scheduleType: data.scheduleType,
      rrule: data.scheduleType === "RECURRING" ? data.rrule : null,
      specificDates:
        data.scheduleType === "SPECIFIC_DATES"
          ? data.specificDates ?? undefined
          : Prisma.DbNull,
      allowRandomAssign: data.allowRandomAssign,
      unassignedReminderTime: data.unassignedReminderTime ?? null,
      doReminderTime: data.doReminderTime ?? null,
    },
  });

  // Drop future occurrences no longer implied by the schedule, but never
  // clobber ones people have already been assigned or completed.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const until = new Date(today.getTime() + HORIZON_DAYS * 86_400_000);
  const validDates = new Set(
    computeDueDates(
      {
        scheduleType: data.scheduleType,
        rrule: data.scheduleType === "RECURRING" ? data.rrule ?? null : null,
        specificDates: data.scheduleType === "SPECIFIC_DATES" ? data.specificDates ?? null : null,
      },
      today,
      until
    ).map((d) => d.toISOString().slice(0, 10))
  );
  const future = await prisma.taskOccurrence.findMany({
    where: { taskId: data.taskId, status: "PENDING", date: { gte: today } },
    select: { id: true, date: true },
  });
  const stale = future
    .filter((o) => !validDates.has(o.date.toISOString().slice(0, 10)))
    .map((o) => o.id);
  if (stale.length) {
    await prisma.taskOccurrence.deleteMany({ where: { id: { in: stale } } });
  }

  await generateOccurrences(data.taskId);
  revalidatePath(`/tasks/${data.taskId}`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/");
  return { id: data.taskId };
}

export async function deleteTask(taskId: string) {
  const userId = await requireUserId();
  const { groupId } = await assertTaskMember(userId, taskId);
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/groups/${groupId}`);
}

export async function regenerateOccurrences(taskId: string) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);
  await generateOccurrences(taskId);
  revalidatePath(`/tasks/${taskId}`);
}

// ─── Assignment ───────────────────────────────────────────────────────────────
export async function setOccurrenceAssignee(occurrenceId: string, assigneeId: string | null) {
  const userId = await requireUserId();
  const occ = await prisma.taskOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { task: { select: { groupId: true, id: true } } },
  });
  if (!occ) throw new Error("Occurrence not found");
  await assertMember(userId, occ.task.groupId);

  await prisma.taskOccurrence.update({
    where: { id: occurrenceId },
    data: {
      assigneeId,
      status: assigneeId ? "ASSIGNED" : "PENDING",
      ...(assigneeId ? { assignedById: userId } : {}),
    },
  });
  revalidatePath(`/tasks/${occ.task.id}`);
  revalidatePath("/");
}

const occReminderSchema = z.object({
  occurrenceId: z.string(),
  unassignedReminderTime: reminderTime,
  doReminderTime: reminderTime,
});

/**
 * Set (or clear) per-occurrence reminder-time overrides. Null on a field means
 * "inherit the task's default". Changing a time re-arms its reminder so an
 * already-sent one can fire again at the new time.
 */
export async function setOccurrenceReminders(input: z.input<typeof occReminderSchema>) {
  const userId = await requireUserId();
  const data = occReminderSchema.parse(input);
  const occ = await prisma.taskOccurrence.findUnique({
    where: { id: data.occurrenceId },
    include: { task: { select: { groupId: true, id: true } } },
  });
  if (!occ) throw new Error("Occurrence not found");
  await assertMember(userId, occ.task.groupId);

  await prisma.taskOccurrence.update({
    where: { id: data.occurrenceId },
    data: {
      unassignedReminderTime: data.unassignedReminderTime ?? null,
      doReminderTime: data.doReminderTime ?? null,
      // Re-arm so edits take effect for a reminder already sent earlier today.
      reminderSentAt: null,
      doReminderSentAt: null,
    },
  });
  revalidatePath(`/tasks/${occ.task.id}`);
  revalidatePath("/");
}

export async function toggleOccurrenceDone(occurrenceId: string, done: boolean) {
  const userId = await requireUserId();
  const occ = await prisma.taskOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { task: { select: { groupId: true, id: true } } },
  });
  if (!occ) throw new Error("Occurrence not found");
  await assertMember(userId, occ.task.groupId);

  await prisma.taskOccurrence.update({
    where: { id: occurrenceId },
    data: done
      ? { status: "DONE", completedAt: new Date() }
      : { status: occ.assigneeId ? "ASSIGNED" : "PENDING", completedAt: null },
  });
  revalidatePath(`/tasks/${occ.task.id}`);
  revalidatePath("/");
}

export async function randomAssignTaskAction(taskId: string, occurrenceIds?: string[]) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);
  const res = await randomAssignTask(taskId, occurrenceIds);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  return res;
}

/**
 * Assign occurrences of a task to one member. When `occurrenceIds` is given,
 * only those are touched; otherwise every future, not-yet-done occurrence is.
 */
export async function assignTaskToMember(
  taskId: string,
  memberId: string,
  occurrenceIds?: string[]
) {
  const userId = await requireUserId();
  const { groupId } = await assertTaskMember(userId, taskId);
  const target = await getMembership(memberId, groupId);
  if (!target) throw new Error("That person is not a member of this group");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const res = await prisma.taskOccurrence.updateMany({
    where: occurrenceIds?.length
      ? { taskId, id: { in: occurrenceIds }, status: { not: "DONE" } }
      : { taskId, date: { gte: today }, status: { not: "DONE" } },
    data: { assigneeId: memberId, status: "ASSIGNED", assignedById: userId },
  });
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  return { assigned: res.count };
}

export async function randomAssignOccurrenceAction(occurrenceId: string) {
  const userId = await requireUserId();
  const occ = await prisma.taskOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { task: { select: { groupId: true, id: true } } },
  });
  if (!occ) throw new Error("Occurrence not found");
  await assertMember(userId, occ.task.groupId);
  await randomAssignOccurrence(occurrenceId);
  revalidatePath(`/tasks/${occ.task.id}`);
  revalidatePath("/");
}

// ─── Assignment rules (pre-assignment) ─────────────────────────────────────────
const ruleSchema = z.object({
  taskId: z.string(),
  scope: z.enum(["WHOLE_TASK", "DATE", "WEEKDAY", "WEEK"]),
  assigneeId: z.string(),
  target: z.record(z.string(), z.union([z.string(), z.number()])).optional().nullable(),
});

export async function addAssignmentRule(input: z.input<typeof ruleSchema>) {
  const userId = await requireUserId();
  const data = ruleSchema.parse(input);
  await assertTaskMember(userId, data.taskId);

  await prisma.assignmentRule.create({
    data: {
      taskId: data.taskId,
      scope: data.scope,
      assigneeId: data.assigneeId,
      target: data.target ?? undefined,
    },
  });
  // Re-apply rules to future occurrences.
  await generateOccurrences(data.taskId);
  revalidatePath(`/tasks/${data.taskId}`);
}

export async function deleteAssignmentRule(ruleId: string) {
  const userId = await requireUserId();
  const rule = await prisma.assignmentRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new Error("Rule not found");
  await assertTaskMember(userId, rule.taskId);
  await prisma.assignmentRule.delete({ where: { id: ruleId } });
  revalidatePath(`/tasks/${rule.taskId}`);
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function markNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}

/** Mark a single notification as read (seen). */
export async function markNotificationRead(notificationId: string) {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}

/** Fetch a page of the user's notifications for cursor-based "load more". */
export async function loadNotifications(cursor?: string) {
  const userId = await requireUserId();
  return getNotifications(userId, cursor);
}
