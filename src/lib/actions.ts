"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getMembership, getNotifications, getTaskOccurrencePage } from "@/lib/queries";
import { computeDueDates, dateFromKey, DEFAULT_WINDOW_DAYS } from "@/lib/occurrences";
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
  if (req.status !== "PENDING") throw new Error("This request has already been handled");
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
  if (req.status !== "PENDING") throw new Error("This request has already been handled");
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

  // No occurrences are materialized — days are expanded from the schedule on read.
  revalidatePath(`/groups/${data.groupId}`);
  revalidatePath("/");
  return { id: task.id };
}

/** Upsert the sparse override row for one day of a task. */
async function upsertOverride(
  taskId: string,
  dateKey: string,
  data: Prisma.TaskOccurrenceUncheckedUpdateInput
) {
  const date = dateFromKey(dateKey);
  return prisma.taskOccurrence.upsert({
    where: { taskId_date: { taskId, date } },
    update: data,
    create: { taskId, date, ...data } as Prisma.TaskOccurrenceUncheckedCreateInput,
  });
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

  // Occurrences are virtual: changing the schedule simply changes which days are
  // expanded on read. Existing override rows for days no longer in the schedule
  // are harmless — the resolver only emits days the schedule still produces.
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

/** Load the next page of a task's upcoming days for the "load more" control. */
export async function loadTaskOccurrences(taskId: string, afterDateKey: string | null) {
  const userId = await requireUserId();
  const page = await getTaskOccurrencePage(userId, taskId, afterDateKey);
  if (!page) throw new Error("Task not found");
  return page;
}

// ─── Assignment ───────────────────────────────────────────────────────────────
export async function setOccurrenceAssignee(
  taskId: string,
  dateKey: string,
  assigneeId: string | null
) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);

  await upsertOverride(taskId, dateKey, {
    assigneeSet: true,
    assigneeId: assigneeId ?? null,
    assignedById: assigneeId ? userId : null,
    status: assigneeId ? "ASSIGNED" : "PENDING",
  });
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
}

const occReminderSchema = z.object({
  taskId: z.string(),
  date: z.string(),
  unassignedReminderTime: reminderTime,
  doReminderTime: reminderTime,
});

/**
 * Set (or clear) per-day reminder-time overrides. Null on a field means "inherit
 * the task's default". Changing a time re-arms its reminder (by clearing the
 * ReminderLog for the day) so an already-sent one can fire again at the new time.
 */
export async function setOccurrenceReminders(input: z.input<typeof occReminderSchema>) {
  const userId = await requireUserId();
  const data = occReminderSchema.parse(input);
  await assertTaskMember(userId, data.taskId);

  await upsertOverride(data.taskId, data.date, {
    unassignedReminderTime: data.unassignedReminderTime ?? null,
    doReminderTime: data.doReminderTime ?? null,
  });
  // Re-arm so edits take effect for a reminder already sent earlier today.
  await prisma.reminderLog.deleteMany({
    where: { taskId: data.taskId, date: dateFromKey(data.date) },
  });
  revalidatePath(`/tasks/${data.taskId}`);
  revalidatePath("/");
}

export async function toggleOccurrenceDone(taskId: string, dateKey: string, done: boolean) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);

  await upsertOverride(
    taskId,
    dateKey,
    done ? { status: "DONE", completedAt: new Date() } : { status: "PENDING", completedAt: null }
  );
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
}

export async function randomAssignTaskAction(taskId: string, dates?: string[]) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);
  const res = await randomAssignTask(taskId, dates);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  return res;
}

/**
 * Assign days of a task to one member. When `dates` is given, only those days are
 * touched; otherwise every future day in the scheduling window is (skipping ones
 * already marked done).
 */
export async function assignTaskToMember(taskId: string, memberId: string, dates?: string[]) {
  const userId = await requireUserId();
  const { groupId } = await assertTaskMember(userId, taskId);
  const target = await getMembership(memberId, groupId);
  if (!target) throw new Error("That person is not a member of this group");

  const dateKeys = dates?.length ? dates : await futureDateKeys(taskId);
  const done = await completedDateKeys(taskId, dateKeys);

  let assigned = 0;
  for (const dateKey of dateKeys) {
    if (done.has(dateKey)) continue;
    await upsertOverride(taskId, dateKey, {
      assigneeSet: true,
      assigneeId: memberId,
      assignedById: userId,
      status: "ASSIGNED",
    });
    assigned++;
  }
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  return { assigned };
}

export async function randomAssignOccurrenceAction(taskId: string, dateKey: string) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);
  await randomAssignOccurrence(taskId, dateKey);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
}

/** Day keys for a task's schedule from today across the default window. */
async function futureDateKeys(taskId: string): Promise<string[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { scheduleType: true, rrule: true, specificDates: true },
  });
  if (!task) return [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const until = new Date(today.getTime() + DEFAULT_WINDOW_DAYS * 86_400_000);
  return computeDueDates(task, today, until).map((d) => d.toISOString().slice(0, 10));
}

/** Of the given day keys, which already have a DONE override. */
async function completedDateKeys(taskId: string, dateKeys: string[]): Promise<Set<string>> {
  const rows = await prisma.taskOccurrence.findMany({
    where: { taskId, status: "DONE", date: { in: dateKeys.map(dateFromKey) } },
    select: { date: true },
  });
  return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
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
  // Rules are applied when days are expanded on read — nothing to materialize.
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
