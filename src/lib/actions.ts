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
import { clearActiveGroupId, writeActiveGroupId } from "@/lib/scope";
import { notifyUser } from "@/lib/push";
import { defaultCategoriesCreate } from "@/lib/categories";
import { dateFromKey, formatMoney, generateInviteCode } from "@/lib/utils";

async function assertMember(userId: string, groupId: string) {
  const m = await getMembership(userId, groupId);
  if (!m) throw new Error("Bạn không ở trong sổ này");
  return m;
}

/** Làm mới mọi trang phụ thuộc dữ liệu của một sổ. */
function revalidateGroup(groupId: string) {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/loans");
  revalidatePath("/categories");
  revalidatePath("/reports");
  revalidatePath("/balance");
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
/**
 * Ghim sổ đang xem. Từ lúc này mọi trang đều đọc sổ này (xem `getScope`) cho tới
 * khi người dùng chọn sổ khác — kể cả sau khi tải lại app.
 *
 * `revalidateGroup` là phần bắt buộc: không có nó, router cache phía client vẫn
 * còn bản dựng theo sổ cũ và trang khác sẽ hiện sai sổ cho tới khi hết hạn cache.
 */
export async function setActiveGroup(groupId: string) {
  const userId = await requireUserId();
  await assertMember(userId, groupId);
  await writeActiveGroupId(groupId);
  revalidateGroup(groupId);
}

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
  // Sổ vừa tạo trở thành sổ đang xem — đó là điều người dùng vừa yêu cầu.
  await writeActiveGroupId(group.id);
  revalidatePath("/groups");
  revalidatePath("/");
  return { id: group.id };
}

export async function renameGroup(groupId: string, name: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ người lập sổ và người quản lý mới đổi được tên sổ");
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
  if (m.role !== "OWNER") throw new Error("Chỉ người lập sổ mới xoá được sổ");
  await prisma.group.delete({ where: { id: groupId } });
  await clearActiveGroupId(groupId);
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
  if (!invite) throw new Error("Mã vào sổ không đúng");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Mã vào sổ đã hết hạn");

  const status = await createJoinRequest(userId, invite.groupId);
  revalidatePath("/groups");
  revalidatePath(`/groups/${invite.groupId}`);
  return { status, groupId: invite.groupId };
}

export async function approveJoinRequest(requestId: string) {
  const userId = await requireUserId();
  const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Không tìm thấy yêu cầu này");
  if (req.status !== "PENDING") throw new Error("Yêu cầu này đã được xử lý");
  const m = await assertMember(userId, req.groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ người lập sổ và người quản lý mới duyệt được");

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
    title: "Bạn đã được vào sổ",
    body: `Bạn đã là thành viên của sổ ${group?.name ?? ""}.`,
    url: `/groups/${req.groupId}`,
  });

  revalidatePath(`/groups/${req.groupId}`);
  revalidatePath("/groups");
}

export async function rejectJoinRequest(requestId: string) {
  const userId = await requireUserId();
  const req = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Không tìm thấy yêu cầu này");
  if (req.status !== "PENDING") throw new Error("Yêu cầu này đã được xử lý");
  const m = await assertMember(userId, req.groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ người lập sổ và người quản lý mới xử lý được");

  await prisma.groupJoinRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  const group = await prisma.group.findUnique({
    where: { id: req.groupId },
    select: { name: true },
  });
  await notifyUser(req.userId, "JOIN_REJECTED", {
    title: "Yêu cầu vào sổ bị từ chối",
    body: `Có người xin vào sổ ${group?.name ?? ""} không được chấp nhận.`,
    url: `/groups`,
  });

  revalidatePath(`/groups/${req.groupId}`);
}

export async function removeMember(groupId: string, memberUserId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ người lập sổ và người quản lý mới mời người khác ra được");
  if (memberUserId === userId) throw new Error("Muốn tự đi thì bấm “Tôi muốn rời sổ này”");

  const target = await getMembership(memberUserId, groupId);
  if (!target) throw new Error("Người này không ở trong sổ");
  if (target.role === "OWNER") throw new Error("Không mời người lập sổ ra được");

  await prisma.groupMember.deleteMany({ where: { userId: memberUserId, groupId } });
  // Xoá yêu cầu cũ để họ có thể xin vào lại sau này.
  await prisma.groupJoinRequest.deleteMany({ where: { userId: memberUserId, groupId } });
  revalidatePath(`/groups/${groupId}`);
}

export async function rotateInvite(groupId: string) {
  const userId = await requireUserId();
  const m = await assertMember(userId, groupId);
  if (m.role === "MEMBER") throw new Error("Chỉ người quản lý mới đổi được mã vào sổ");
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
  await clearActiveGroupId(groupId);
  revalidatePath("/groups");
  revalidatePath("/");
}

// ─── Danh mục ────────────────────────────────────────────────────────────────
const categorySchema = z.object({
  groupId: z.string(),
  name: z.string().min(1, "Nhập tên loại").max(50),
  type: z.enum(["INCOME", "EXPENSE"]),
  // 24 chứ không phải 8: người dùng chọn được emoji bất kỳ, mà cụm ghép như
  // "👨‍👩‍👧‍👦" dài 11 code unit — giới hạn cũ chặn oan. Xem ICON_MAX_LENGTH ở icon-picker.
  icon: z.string().max(24).optional().nullable(),
});

export async function createCategory(input: z.input<typeof categorySchema>) {
  const userId = await requireUserId();
  const data = categorySchema.parse(input);
  await assertMember(userId, data.groupId);

  // Không đọc trước rồi mới ghi: hai lần bấm gần nhau đều thấy "chưa có" rồi
  // cùng ghi, và unique index văng lỗi Prisma thô ra toast. Ghi thẳng rồi dịch
  // P2002 thành câu tiếng Việt — vừa hết đường đua, vừa bớt một lượt hỏi DB.
  let category;
  try {
    category = await prisma.category.create({
      data: { ...data, icon: data.icon || null },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new Error("Loại này đã có rồi");
    throw e;
  }
  revalidateGroup(data.groupId);
  // Trả về cả tên/icon để form giao dịch thêm ngay vào lưới chọn mà không cần
  // đợi trang tải lại.
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    type: category.type,
  };
}

export async function updateCategory(
  categoryId: string,
  input: { name: string; icon?: string | null }
) {
  const userId = await requireUserId();
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Không tìm thấy loại này");
  await assertMember(userId, category.groupId);

  const name = z.string().min(1).max(50).parse(input.name);
  await prisma.category.update({
    where: { id: categoryId },
    data: { name, icon: input.icon || null },
  });
  revalidateGroup(category.groupId);
}

/**
 * Xoá danh mục; giao dịch cũ giữ nguyên, chỉ bỏ liên kết tới danh mục này. Giao
 * dịch không còn danh mục nào thành "Chưa ghi là gì".
 */
export async function deleteCategory(categoryId: string) {
  const userId = await requireUserId();
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Không tìm thấy loại này");
  await assertMember(userId, category.groupId);

  await prisma.category.delete({ where: { id: categoryId } });
  revalidateGroup(category.groupId);
}

// ─── Giao dịch ───────────────────────────────────────────────────────────────
const splitSchema = z.object({
  userId: z.string(),
  /** Trọng số chia phần còn lại; bỏ qua khi `amount` có giá trị. */
  weight: z.number().min(0).max(1000).default(1),
  /** Số tiền cố định của người này; null = chia theo trọng số. */
  amount: z.number().min(0).nullable().optional(),
});

const transactionSchema = z.object({
  groupId: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  /** Một giao dịch có thể thuộc nhiều danh mục; thứ tự chọn được giữ nguyên. */
  categoryIds: z.array(z.string()).max(10, "Mỗi khoản chọn nhiều nhất 10 loại").optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  /** Người thực sự bỏ tiền / nhận tiền. Bỏ trống = người đang ghi sổ. */
  paidById: z.string().optional().nullable(),
  /** Cách chia. Bỏ trống = chia đều cho toàn bộ thành viên hiện tại của sổ. */
  splits: z.array(splitSchema).max(50).optional().nullable(),
  /**
   * Chỉ khoản đi qua hàng chờ ngoại tuyến mới có (xem `src/lib/offline-queue.ts`).
   * Nó là CHÌA KHOÁ CHỐNG GHI TRÙNG, không phải một mã tuỳ ý: giới hạn 64 ký tự
   * để một client hỏng không nhét được chuỗi dài vào một cột unique.
   * `updateTransaction` cũng parse bằng schema này nhưng dựng `data` tường minh
   * nên không bao giờ ghi đè cột này.
   */
  clientId: z.string().min(8).max(64).optional().nullable(),
});

type SplitInput = z.output<typeof splitSchema>;

/**
 * Bỏ danh mục trùng, kiểm tra tất cả đều thuộc cùng sổ và cùng loại thu/chi, rồi
 * trả về dữ liệu cho bảng nối (`position` = thứ tự người dùng đã chọn).
 */
async function resolveCategories(
  groupId: string,
  type: "INCOME" | "EXPENSE",
  categoryIds: string[] | null | undefined
) {
  const ids = [...new Set(categoryIds ?? [])];
  if (ids.length === 0) return [];

  const found = await prisma.category.findMany({
    where: { id: { in: ids }, groupId, type },
    select: { id: true },
  });
  if (found.length !== ids.length) throw new Error("Loại này không dùng được");

  return ids.map((categoryId, position) => ({ categoryId, position }));
}

/**
 * Kiểm tra người trả + cách chia, rồi trả về dữ liệu sẵn sàng ghi vào DB.
 *
 * Bỏ trống `splits` thì mặc định chia đều cho mọi thành viên **tại thời điểm ghi**
 * — lưu tường minh chứ không suy ra lúc đọc, để giao dịch cũ không bị thay đổi
 * cách chia khi sổ có thêm hoặc bớt người.
 */
async function resolveSplits(
  groupId: string,
  actorId: string,
  amount: number,
  paidById: string | null | undefined,
  splits: SplitInput[] | null | undefined
) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
    orderBy: { joinedAt: "asc" },
  });
  const memberIds = new Set(members.map((m) => m.userId));

  const payerId = paidById || actorId;
  if (!memberIds.has(payerId)) throw new Error("Người bỏ tiền phải ở trong sổ");

  const rows: SplitInput[] =
    splits && splits.length > 0
      ? splits
      : members.map((m) => ({ userId: m.userId, weight: 1, amount: null }));

  if (rows.length === 0) throw new Error("Chọn ít nhất một người để chia");
  if (new Set(rows.map((r) => r.userId)).size !== rows.length) {
    throw new Error("Một người chỉ được chia một lần");
  }
  for (const r of rows) {
    if (!memberIds.has(r.userId)) throw new Error("Chỉ chia được cho người trong sổ");
  }

  const fixed = rows.filter((r) => r.amount != null);
  const flexible = rows.filter((r) => r.amount == null);
  const fixedTotal = fixed.reduce((s, r) => s + r.amount!, 0);

  if (flexible.length === 0) {
    // Chia bằng số tiền cụ thể: phải khớp tổng, sai lệch dưới 1 đồng thì bỏ qua.
    if (Math.abs(fixedTotal - amount) >= 1) {
      throw new Error(
        `Tổng các phần (${formatMoney(fixedTotal)}) phải bằng số tiền giao dịch (${formatMoney(amount)})`
      );
    }
  } else {
    if (fixedTotal > amount + 1) {
      throw new Error(
        `Các phần cố định (${formatMoney(fixedTotal)}) đã vượt số tiền giao dịch (${formatMoney(amount)})`
      );
    }
    if (flexible.every((r) => r.weight <= 0)) {
      throw new Error("Cần ít nhất một người có số phần lớn hơn 0");
    }
  }

  return {
    payerId,
    create: rows.map((r) => ({
      userId: r.userId,
      weight: r.amount != null ? 0 : r.weight,
      amount: r.amount ?? null,
    })),
  };
}

export async function createTransaction(input: z.input<typeof transactionSchema>) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);
  await assertMember(userId, data.groupId);

  // Khoản gửi lại từ hàng chờ ngoại tuyến: nếu lần gửi trước đã ghi xong rồi mới
  // đứt kết nối trên đường về thì mã này đã có trong sổ — trả về khoản cũ, không
  // ghi thêm. Chỉ tốn một lượt DB cho ĐÚNG những khoản có clientId, tức là chỉ
  // khoản ghi lúc mất mạng; đường ghi bình thường không chạm vào đây.
  if (data.clientId) {
    const already = await prisma.transaction.findUnique({
      where: { clientId: data.clientId },
      select: { id: true, groupId: true },
    });
    if (already) {
      if (already.groupId !== data.groupId) throw new Error("Mã khoản này đã dùng ở sổ khác");
      return { id: already.id };
    }
  }

  const categories = await resolveCategories(data.groupId, data.type, data.categoryIds);

  const split = await resolveSplits(
    data.groupId,
    userId,
    data.amount,
    data.paidById,
    data.splits
  );

  const create = {
    groupId: data.groupId,
    type: data.type,
    amount: data.amount,
    date: dateFromKey(data.date),
    note: data.note || null,
    createdById: userId,
    paidById: split.payerId,
    clientId: data.clientId || null,
    splits: { create: split.create },
    categories: { create: categories },
  };

  let tx: { id: string };
  try {
    tx = await prisma.transaction.create({ data: create });
  } catch (e) {
    // Hai lần gửi chạy song song (app mở hai tab, hoặc `online` bắn trong lúc
    // lượt gửi trước chưa xong) thì lượt tới sau đâm vào unique index. Đó KHÔNG
    // phải lỗi — nó đúng là chuyện cột unique sinh ra để chặn.
    if (data.clientId && (e as { code?: string }).code === "P2002") {
      const won = await prisma.transaction.findUnique({
        where: { clientId: data.clientId },
        select: { id: true },
      });
      if (won) return { id: won.id };
    }
    throw e;
  }

  revalidateGroup(data.groupId);
  return { id: tx.id };
}

export async function updateTransaction(
  transactionId: string,
  input: Omit<z.input<typeof transactionSchema>, "groupId">
) {
  const userId = await requireUserId();
  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw new Error("Không tìm thấy khoản này");
  await assertMember(userId, existing.groupId);

  const data = transactionSchema.parse({ ...input, groupId: existing.groupId });
  const categories = await resolveCategories(existing.groupId, data.type, data.categoryIds);

  const split = await resolveSplits(
    existing.groupId,
    existing.paidById ?? existing.createdById,
    data.amount,
    data.paidById,
    data.splits
  );

  // Ghi lại toàn bộ cách chia và danh mục: đơn giản hơn so với so khớp từng dòng,
  // và số dòng luôn nhỏ (mỗi thành viên / danh mục một dòng).
  await prisma.$transaction([
    prisma.transactionSplit.deleteMany({ where: { transactionId } }),
    prisma.transactionCategory.deleteMany({ where: { transactionId } }),
    prisma.transaction.update({
      where: { id: transactionId },
      data: {
        type: data.type,
        amount: data.amount,
        date: dateFromKey(data.date),
        note: data.note || null,
        paidById: split.payerId,
        splits: { create: split.create },
        categories: { create: categories },
      },
    }),
  ]);
  revalidateGroup(existing.groupId);
}

export async function deleteTransaction(transactionId: string) {
  const userId = await requireUserId();
  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw new Error("Không tìm thấy khoản này");
  await assertMember(userId, existing.groupId);

  await prisma.transaction.delete({ where: { id: transactionId } });
  revalidateGroup(existing.groupId);
}

/** Trang giao dịch kế tiếp cho nút “Xem thêm”. */
/**
 * Bộ lọc đi từ client vào thẳng `where` của Prisma, nên nó phải được cắt gọt ở
 * đây. Không phải chuyện injection — Prisma tham số hoá `contains` — mà là
 * chuyện một chuỗi `q` dài vô hạn là cách làm nghẽn CSDL rẻ nhất mà ai cũng gõ
 * được. Quyền xem sổ thì đã có `getTransactions` kiểm.
 */
const transactionFilterSchema = z.object({
  month: z.string().regex(/^(\d{4}-\d{2}|all)$/).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().max(64).optional(),
  q: z.string().trim().max(100).optional(),
});

export async function loadTransactions(
  groupId: string,
  filter: TransactionFilter,
  cursor: string
) {
  const userId = await requireUserId();
  const safe = transactionFilterSchema.parse(filter);
  const page = await getTransactions(userId, groupId, safe, cursor);
  if (!page) throw new Error("Không tìm thấy sổ này");
  return { items: page.items, nextCursor: page.nextCursor };
}

/**
 * Mọi khoản của ĐÚNG MỘT NGÀY — ruột của sheet mở ra khi bấm một ô lịch.
 *
 * Không phân trang: một ngày trong sổ cá nhân hiếm khi quá vài khoản, và một
 * sheet "xem nhanh" mà lại có nút "xem thêm" thì không còn là xem nhanh nữa.
 * Trần vẫn là `TRANSACTIONS_PAGE_SIZE` của `getTransactions`, nên khi ngày đó
 * dài bất thường thì trả về `hasMore` để sheet nói thẳng là đang cắt bớt, thay
 * vì im lặng giấu mất mấy khoản cuối.
 *
 * Bộ lọc chiều/loại/tìm kiếm đi theo vào đây để sheet và ô lịch luôn đếm cùng
 * một tập khoản — ô lịch cũng được vẽ với đúng bộ lọc đó (`getMonthDayTotals`).
 */
const dayFilterSchema = transactionFilterSchema.omit({ month: true, day: true });

export async function loadDayTransactions(
  groupId: string,
  day: string,
  filter: z.input<typeof dayFilterSchema> = {}
) {
  const userId = await requireUserId();
  const safeDay = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
    .parse(day);
  const safe = dayFilterSchema.parse(filter);
  const page = await getTransactions(userId, groupId, { ...safe, day: safeDay });
  if (!page) throw new Error("Không tìm thấy sổ này");
  return {
    items: page.items,
    hasMore: page.nextCursor !== null,
    income: page.income,
    expense: page.expense,
  };
}

// ─── Cho vay / đi vay ────────────────────────────────────────────────────────
const loanSchema = z.object({
  groupId: z.string(),
  type: z.enum(["LEND", "BORROW"]),
  counterparty: z.string().min(1, "Nhập tên người kia").max(80),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hẹn trả không hợp lệ")
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
    title: data.type === "LEND" ? "Có khoản cho mượn mới" : "Có khoản đi mượn mới",
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
  if (!existing) throw new Error("Không tìm thấy khoản mượn này");
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
  if (!existing) throw new Error("Không tìm thấy khoản mượn này");
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
  if (!loan) throw new Error("Không tìm thấy khoản mượn này");
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
    title: loan.type === "LEND" ? "Họ đã trả tiền" : "Đã trả tiền cho họ",
    body: `${loan.counterparty} · ${formatMoney(data.amount)}`,
    url: `/loans/${loan.id}`,
  });

  revalidateGroup(loan.groupId);
  revalidatePath(`/loans/${data.loanId}`);
}

/** Sửa lại một lần thu/trả nợ đã ghi (ghi sai số tiền, sai ngày…). */
export async function updateLoanPayment(
  paymentId: string,
  input: Omit<z.input<typeof paymentSchema>, "loanId">
) {
  const userId = await requireUserId();
  const payment = await prisma.loanPayment.findUnique({
    where: { id: paymentId },
    include: { loan: { select: { id: true, groupId: true } } },
  });
  if (!payment) throw new Error("Không tìm thấy lần trả này");
  await assertMember(userId, payment.loan.groupId);

  const data = paymentSchema.parse({ ...input, loanId: payment.loan.id });
  await prisma.loanPayment.update({
    where: { id: paymentId },
    data: {
      amount: data.amount,
      date: dateFromKey(data.date),
      note: data.note || null,
    },
  });
  // Sửa số tiền có thể làm khoản vay từ "đã tất toán" quay lại "đang nợ".
  await syncLoanStatus(payment.loan.id);
  revalidateGroup(payment.loan.groupId);
  revalidatePath(`/loans/${payment.loan.id}`);
}

export async function deleteLoanPayment(paymentId: string) {
  const userId = await requireUserId();
  const payment = await prisma.loanPayment.findUnique({
    where: { id: paymentId },
    include: { loan: { select: { id: true, groupId: true } } },
  });
  if (!payment) throw new Error("Không tìm thấy lần trả này");
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
  if (!loan) throw new Error("Không tìm thấy khoản mượn này");
  await assertMember(userId, loan.groupId);

  await prisma.loan.update({ where: { id: loanId }, data: { status } });
  revalidateGroup(loan.groupId);
  revalidatePath(`/loans/${loanId}`);
}

// ─── Cân đối giữa các thành viên ─────────────────────────────────────────────
const settlementSchema = z.object({
  groupId: z.string(),
  fromUserId: z.string().min(1, "Chọn người trả"),
  toUserId: z.string().min(1, "Chọn người nhận"),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  note: z.string().max(500).optional().nullable(),
});

/**
 * Ghi nhận một lần chuyển tiền giữa hai thành viên để bù chênh lệch. Đây không
 * phải khoản thu/chi của sổ nên không tạo Transaction — chỉ làm số dư hai bên
 * dịch lại gần 0.
 */
export async function createSettlement(input: z.input<typeof settlementSchema>) {
  const userId = await requireUserId();
  const data = settlementSchema.parse(input);
  await assertMember(userId, data.groupId);

  if (data.fromUserId === data.toUserId) throw new Error("Người trả và người nhận phải khác nhau");
  for (const id of [data.fromUserId, data.toUserId]) {
    if (!(await getMembership(id, data.groupId))) {
      throw new Error("Cả hai người phải ở trong sổ");
    }
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId: data.groupId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      date: dateFromKey(data.date),
      note: data.note || null,
      createdById: userId,
    },
    include: {
      from: { select: { name: true, email: true } },
      to: { select: { name: true, email: true } },
    },
  });

  // Báo cho hai bên liên quan (trừ người vừa bấm ghi).
  const label = (u: { name: string | null; email: string | null }) => u.name || u.email || "Ai đó";
  const body = `${label(settlement.from)} → ${label(settlement.to)} · ${formatMoney(data.amount)}`;
  await Promise.all(
    [data.fromUserId, data.toUserId]
      .filter((id) => id !== userId)
      .map((id) =>
        notifyUser(id, "SETTLEMENT", { title: "Đã đưa tiền cho nhau", body, url: "/loans?xem=chung" })
      )
  );

  revalidateGroup(data.groupId);
  return { id: settlement.id };
}

export async function deleteSettlement(settlementId: string) {
  const userId = await requireUserId();
  const existing = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!existing) throw new Error("Không tìm thấy lần đưa tiền này");
  await assertMember(userId, existing.groupId);

  await prisma.settlement.delete({ where: { id: settlementId } });
  revalidateGroup(existing.groupId);
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
