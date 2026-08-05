"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import {
  getMembership,
  getNotifications,
  getTransactions,
  type TransactionFilter,
} from "@/lib/queries";
import { createJoinRequest } from "@/lib/join";
import { notifyUser } from "@/lib/push";
import { defaultCategoriesCreate } from "@/lib/categories";
import { dateFromKey, formatMoney, generateInviteCode } from "@/lib/utils";

async function assertMember(userId: string, groupId: string) {
  const m = await getMembership(userId, groupId);
  if (!m) throw new Error("Bạn không phải thành viên của sổ này");
  return m;
}

/** Làm mới mọi trang phụ thuộc dữ liệu của một sổ. */
function revalidateGroup(groupId: string) {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/loans");
  revalidatePath("/categories");
  revalidatePath("/reports");
  revalidatePath(`/groups/${groupId}`);
}

/** Báo cho các thành viên khác trong sổ (bỏ qua chính người thao tác). */
async function notifyOtherMembers(
  groupId: string,
  actorId: string,
  payload: { title: string; body: string; url?: string }
) {
  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { not: actorId } },
    select: { userId: true },
  });
  await Promise.all(members.map((m) => notifyUser(m.userId, "LEDGER", payload)));
}

// ─── Sổ ──────────────────────────────────────────────────────────────────────
export async function createGroup(formData: FormData) {
  const userId = await requireUserId();
  const name = z.string().min(1).max(80).parse(formData.get("name"));

  const group = await prisma.group.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
      invites: { create: { code: generateInviteCode() } },
      categories: { create: defaultCategoriesCreate() },
    },
  });
  revalidatePath("/groups");
  revalidatePath("/");
  return { id: group.id };
}

export async function renameGroup(groupId: string, name: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ chủ sổ và quản trị viên mới đổi được tên sổ");
  await prisma.group.update({
    where: { id: groupId },
    data: { name: z.string().min(1).max(80).parse(name) },
  });
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role !== "OWNER") throw new Error("Chỉ chủ sổ mới xoá được sổ");
  await prisma.group.delete({ where: { id: groupId } });
  revalidatePath("/groups");
  revalidatePath("/");
}

/**
 * Xin vào một sổ bằng mã mời. Tạo yêu cầu chờ duyệt — chưa cấp quyền ngay.
 */
export async function requestToJoinByCode(code: string) {
  const userId = await requireUserId();
  const parsed = z.string().min(4).parse(code.trim().toUpperCase());

  const invite = await prisma.groupInvite.findUnique({ where: { code: parsed } });
  if (!invite) throw new Error("Mã mời không hợp lệ");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Mã mời đã hết hạn");

  const status = await createJoinRequest(userId, invite.groupId);
  revalidatePath("/groups");
  revalidatePath(`/groups/${invite.groupId}`);
  return { status, groupId: invite.groupId };
}

export async function approveJoinRequest(requestId: string) {
  const userId = await requireUserId();
  const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Không tìm thấy yêu cầu");
  if (req.status !== "PENDING") throw new Error("Yêu cầu này đã được xử lý");
  const m = await assertMember(userId, req.groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ chủ sổ và quản trị viên mới duyệt được yêu cầu");

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
    title: "Yêu cầu được duyệt",
    body: `Bạn đã là thành viên của sổ ${group?.name ?? ""}.`,
    url: `/groups/${req.groupId}`,
  });

  revalidatePath(`/groups/${req.groupId}`);
  revalidatePath("/groups");
}

export async function rejectJoinRequest(requestId: string) {
  const userId = await requireUserId();
  const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Không tìm thấy yêu cầu");
  if (req.status !== "PENDING") throw new Error("Yêu cầu này đã được xử lý");
  const m = await assertMember(userId, req.groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ chủ sổ và quản trị viên mới xử lý được yêu cầu");

  await prisma.groupJoinRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  const group = await prisma.group.findUnique({
    where: { id: req.groupId },
    select: { name: true },
  });
  await notifyUser(req.userId, "JOIN_REJECTED", {
    title: "Yêu cầu bị từ chối",
    body: `Yêu cầu tham gia sổ ${group?.name ?? ""} không được chấp nhận.`,
    url: `/groups`,
  });

  revalidatePath(`/groups/${req.groupId}`);
}

export async function removeMember(groupId: string, memberUserId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ chủ sổ và quản trị viên mới xoá được thành viên");
  if (memberUserId === userId) throw new Error("Dùng “Rời sổ” để tự rời khỏi sổ");

  const target = await getMembership(memberUserId, groupId);
  if (!target) throw new Error("Người này không phải thành viên");
  if (target.role === "OWNER") throw new Error("Không thể xoá chủ sổ");

  await prisma.groupMember.deleteMany({ where: { userId: memberUserId, groupId } });
  // Xoá yêu cầu cũ để họ có thể xin vào lại sau này.
  await prisma.groupJoinRequest.deleteMany({ where: { userId: memberUserId, groupId } });
  revalidatePath(`/groups/${groupId}`);
}

export async function rotateInvite(groupId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ quản trị viên mới đổi được mã mời");
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
  revalidatePath("/");
}

// ─── Danh mục ────────────────────────────────────────────────────────────────
const categorySchema = z.object({
  groupId: z.string(),
  name: z.string().min(1, "Nhập tên danh mục").max(50),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().max(8).optional().nullable(),
});

export async function createCategory(input: z.input<typeof categorySchema>) {
  const userId = await requireUserId();
  const data = categorySchema.parse(input);
  await assertMember(userId, data.groupId);

  const existing = await prisma.category.findUnique({
    where: { groupId_type_name: { groupId: data.groupId, type: data.type, name: data.name } },
  });
  if (existing) throw new Error("Danh mục này đã tồn tại");

  const category = await prisma.category.create({
    data: { ...data, icon: data.icon || null },
  });
  revalidateGroup(data.groupId);
  return { id: category.id };
}

export async function updateCategory(
  categoryId: string,
  input: { name: string; icon?: string | null }
) {
  const userId = await requireUserId();
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Không tìm thấy danh mục");
  await assertMember(userId, category.groupId);

  const name = z.string().min(1).max(50).parse(input.name);
  await prisma.category.update({
    where: { id: categoryId },
    data: { name, icon: input.icon || null },
  });
  revalidateGroup(category.groupId);
}

/** Xoá danh mục; giao dịch cũ giữ nguyên và chuyển thành "Chưa phân loại". */
export async function deleteCategory(categoryId: string) {
  const userId = await requireUserId();
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Không tìm thấy danh mục");
  await assertMember(userId, category.groupId);

  await prisma.category.delete({ where: { id: categoryId } });
  revalidateGroup(category.groupId);
}

// ─── Giao dịch ───────────────────────────────────────────────────────────────
const transactionSchema = z.object({
  groupId: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  categoryId: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function createTransaction(input: z.input<typeof transactionSchema>) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);
  await assertMember(userId, data.groupId);

  // Danh mục phải thuộc cùng sổ và cùng loại thu/chi.
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat || cat.groupId !== data.groupId || cat.type !== data.type) {
      throw new Error("Danh mục không hợp lệ");
    }
  }

  const tx = await prisma.transaction.create({
    data: {
      groupId: data.groupId,
      type: data.type,
      amount: data.amount,
      date: dateFromKey(data.date),
      categoryId: data.categoryId || null,
      note: data.note || null,
      createdById: userId,
    },
  });
  revalidateGroup(data.groupId);
  return { id: tx.id };
}

export async function updateTransaction(
  transactionId: string,
  input: Omit<z.input<typeof transactionSchema>, "groupId">
) {
  const userId = await requireUserId();
  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw new Error("Không tìm thấy giao dịch");
  await assertMember(userId, existing.groupId);

  const data = transactionSchema.parse({ ...input, groupId: existing.groupId });
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat || cat.groupId !== existing.groupId || cat.type !== data.type) {
      throw new Error("Danh mục không hợp lệ");
    }
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      type: data.type,
      amount: data.amount,
      date: dateFromKey(data.date),
      categoryId: data.categoryId || null,
      note: data.note || null,
    },
  });
  revalidateGroup(existing.groupId);
}

export async function deleteTransaction(transactionId: string) {
  const userId = await requireUserId();
  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw new Error("Không tìm thấy giao dịch");
  await assertMember(userId, existing.groupId);

  await prisma.transaction.delete({ where: { id: transactionId } });
  revalidateGroup(existing.groupId);
}

/** Trang giao dịch kế tiếp cho nút “Xem thêm”. */
export async function loadTransactions(
  groupId: string,
  filter: TransactionFilter,
  cursor: string
) {
  const userId = await requireUserId();
  const page = await getTransactions(userId, groupId, filter, cursor);
  if (!page) throw new Error("Không tìm thấy sổ");
  return { items: page.items, nextCursor: page.nextCursor };
}

// ─── Cho vay / đi vay ────────────────────────────────────────────────────────
const loanSchema = z.object({
  groupId: z.string(),
  type: z.enum(["LEND", "BORROW"]),
  counterparty: z.string().min(1, "Nhập tên người vay/cho vay").max(80),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Hạn trả không hợp lệ")
    .optional()
    .nullable(),
  interestRate: z.number().min(0).max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function createLoan(input: z.input<typeof loanSchema>) {
  const userId = await requireUserId();
  const data = loanSchema.parse(input);
  await assertMember(userId, data.groupId);

  const loan = await prisma.loan.create({
    data: {
      groupId: data.groupId,
      type: data.type,
      counterparty: data.counterparty,
      amount: data.amount,
      date: dateFromKey(data.date),
      dueDate: data.dueDate ? dateFromKey(data.dueDate) : null,
      interestRate: data.interestRate ?? null,
      note: data.note || null,
      createdById: userId,
    },
  });

  await notifyOtherMembers(data.groupId, userId, {
    title: data.type === "LEND" ? "Khoản cho vay mới" : "Khoản đi vay mới",
    body: `${data.counterparty} · ${formatMoney(data.amount)}`,
    url: `/loans/${loan.id}`,
  });

  revalidateGroup(data.groupId);
  return { id: loan.id };
}

export async function updateLoan(
  loanId: string,
  input: Omit<z.input<typeof loanSchema>, "groupId">
) {
  const userId = await requireUserId();
  const existing = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!existing) throw new Error("Không tìm thấy khoản vay");
  await assertMember(userId, existing.groupId);

  const data = loanSchema.parse({ ...input, groupId: existing.groupId });
  await prisma.loan.update({
    where: { id: loanId },
    data: {
      type: data.type,
      counterparty: data.counterparty,
      amount: data.amount,
      date: dateFromKey(data.date),
      dueDate: data.dueDate ? dateFromKey(data.dueDate) : null,
      interestRate: data.interestRate ?? null,
      note: data.note || null,
    },
  });
  await syncLoanStatus(loanId);
  revalidateGroup(existing.groupId);
  revalidatePath(`/loans/${loanId}`);
}

export async function deleteLoan(loanId: string) {
  const userId = await requireUserId();
  const existing = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!existing) throw new Error("Không tìm thấy khoản vay");
  await assertMember(userId, existing.groupId);

  await prisma.loan.delete({ where: { id: loanId } });
  revalidateGroup(existing.groupId);
}

/**
 * Đặt lại trạng thái khoản vay theo số đã thu/trả: đủ gốc → PAID, còn thiếu →
 * ACTIVE. Khoản đã CANCELLED thì giữ nguyên.
 */
async function syncLoanStatus(loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { payments: { select: { amount: true } } },
  });
  if (!loan || loan.status === "CANCELLED") return;
  const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
  const status = paid >= loan.amount ? "PAID" : "ACTIVE";
  if (status !== loan.status) {
    await prisma.loan.update({ where: { id: loanId }, data: { status } });
  }
}

const paymentSchema = z.object({
  loanId: z.string(),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  note: z.string().max(500).optional().nullable(),
});

/** Ghi nhận một lần thu nợ (cho vay) hoặc trả nợ (đi vay). */
export async function addLoanPayment(input: z.input<typeof paymentSchema>) {
  const userId = await requireUserId();
  const data = paymentSchema.parse(input);
  const loan = await prisma.loan.findUnique({ where: { id: data.loanId } });
  if (!loan) throw new Error("Không tìm thấy khoản vay");
  await assertMember(userId, loan.groupId);

  await prisma.loanPayment.create({
    data: {
      loanId: data.loanId,
      amount: data.amount,
      date: dateFromKey(data.date),
      note: data.note || null,
      createdById: userId,
    },
  });
  await syncLoanStatus(data.loanId);

  await notifyOtherMembers(loan.groupId, userId, {
    title: loan.type === "LEND" ? "Đã thu nợ" : "Đã trả nợ",
    body: `${loan.counterparty} · ${formatMoney(data.amount)}`,
    url: `/loans/${loan.id}`,
  });

  revalidateGroup(loan.groupId);
  revalidatePath(`/loans/${data.loanId}`);
}

export async function deleteLoanPayment(paymentId: string) {
  const userId = await requireUserId();
  const payment = await prisma.loanPayment.findUnique({
    where: { id: paymentId },
    include: { loan: { select: { id: true, groupId: true } } },
  });
  if (!payment) throw new Error("Không tìm thấy khoản thanh toán");
  await assertMember(userId, payment.loan.groupId);

  await prisma.loanPayment.delete({ where: { id: paymentId } });
  await syncLoanStatus(payment.loan.id);
  revalidateGroup(payment.loan.groupId);
  revalidatePath(`/loans/${payment.loan.id}`);
}

/** Đánh dấu tất toán thủ công, huỷ nợ, hoặc mở lại khoản vay. */
export async function setLoanStatus(loanId: string, status: "ACTIVE" | "PAID" | "CANCELLED") {
  const userId = await requireUserId();
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error("Không tìm thấy khoản vay");
  await assertMember(userId, loan.groupId);

  await prisma.loan.update({ where: { id: loanId }, data: { status } });
  revalidateGroup(loan.groupId);
  revalidatePath(`/loans/${loanId}`);
}

// ─── Thông báo ───────────────────────────────────────────────────────────────
export async function markNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}

export async function markNotificationRead(notificationId: string) {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}

export async function loadNotifications(cursor?: string) {
  const userId = await requireUserId();
  return getNotifications(userId, cursor);
}
