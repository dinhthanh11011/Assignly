"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getMembership } from "@/lib/queries";
import { generateOccurrences } from "@/lib/occurrences";
import { randomAssignTask, randomAssignOccurrence } from "@/lib/assignment";
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

export async function joinGroupByCode(formData: FormData) {
  const userId = await requireUserId();
  const code = z.string().min(4).parse(String(formData.get("code")).trim().toUpperCase());

  const invite = await prisma.groupInvite.findUnique({ where: { code } });
  if (!invite) throw new Error("Invalid invite code");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite expired");

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId, groupId: invite.groupId } },
    update: {},
    create: { userId, groupId: invite.groupId, role: "MEMBER" },
  });
  revalidatePath("/groups");
  return { id: invite.groupId };
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

export async function randomAssignTaskAction(taskId: string) {
  const userId = await requireUserId();
  await assertTaskMember(userId, taskId);
  const res = await randomAssignTask(taskId);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  return res;
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
