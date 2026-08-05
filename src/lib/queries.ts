import { prisma } from "@/lib/db";
import type { Loan, LoanPayment, Prisma, TxType } from "@prisma/client";
import { computeBalances, suggestTransfers, type MemberBalance } from "@/lib/balance";
import { readActiveGroupId } from "@/lib/scope";
import { currentMonth, dateKey, monthRange, shiftMonth, today } from "@/lib/utils";

// ─── Sổ (nhóm) ────────────────────────────────────────────────────────────────
/** Các sổ mà người dùng tham gia, kèm số liệu tóm tắt. */
export async function getMyGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, transactions: true, loans: true } },
      members: {
        take: 5,
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMembership(userId: string, groupId: string) {
  return prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
}

/**
 * Danh sách sổ (cho ô chọn sổ) + sổ đang xem, trong **một** truy vấn. Thứ tự ưu
 * tiên: `preferred` (tham số `?group=` trên URL) → sổ đang ghim trong cookie →
 * sổ đầu tiên. `groupId` là null khi người dùng chưa có sổ nào.
 *
 * Nhờ cookie mà sổ đã chọn đi xuyên suốt mọi trang, không cần trang nào phải
 * mang `?group=` theo (xem `@/lib/scope`).
 *
 * Mọi trang dữ liệu đều mở đầu bằng đúng một lượt đi/về DB này — trước đây là
 * hai đến ba lượt nối tiếp nhau (chọn sổ, kiểm tra thành viên, rồi lấy danh sách).
 */
export async function getScope(userId: string, preferred?: string) {
  const [rows, pinned] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId },
      select: { group: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    readActiveGroupId(),
  ]);
  const groups = rows.map((r) => r.group);
  const wanted = preferred ?? pinned;
  // Cookie có thể trỏ tới sổ đã bị xoá / đã rời: luôn kiểm tra lại thành viên
  // rồi mới dùng, nếu không hợp lệ thì lùi về sổ đầu tiên.
  const groupId =
    (wanted && groups.some((g) => g.id === wanted) ? wanted : groups[0]?.id) ?? null;
  return { groups, groupId };
}

/** Thành viên của một sổ, dạng rút gọn cho ô chọn người trả / chia tiền. */
export async function getMemberOptions(groupId: string) {
  const rows = await prisma.groupMember.findMany({
    where: { groupId },
    select: { user: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((r) => r.user);
}

export async function getGroupDetail(userId: string, groupId: string) {
  // Chạy song song với truy vấn sổ: chờ kiểm tra thành viên trước sẽ tốn thêm
  // một lượt đi/về DB (~100ms) trước khi bắt đầu việc chính.
  const [membership, group] = await Promise.all([
    getMembership(userId, groupId),
    prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { transactions: true, loans: true, categories: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        invites: { orderBy: { createdAt: "desc" }, take: 1 },
        joinRequests: {
          where: { status: "PENDING" },
          include: { user: { select: { id: true, name: true, image: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);
  if (!membership) return null;
  return group ? { group, membership } : null;
}

// ─── Danh mục ─────────────────────────────────────────────────────────────────
export async function getCategories(userId: string, groupId: string) {
  const [membership, categories] = await Promise.all([
    getMembership(userId, groupId),
    prisma.category.findMany({
      where: { groupId },
      include: { _count: { select: { transactions: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);
  return membership ? categories : null;
}

/**
 * Cộng tiền theo danh mục (khoá `null` = chưa phân loại).
 *
 * Một giao dịch thuộc nhiều danh mục thì số tiền được **chia đều** cho các danh
 * mục đó, nhờ vậy tổng các phần luôn khớp tổng thu/chi và biểu đồ tròn không bị
 * cộng vượt 100%.
 */
function sumByCategory(rows: { amount: number; categories: { categoryId: string }[] }[]) {
  const totals = new Map<string | null, number>();
  for (const t of rows) {
    const ids: (string | null)[] =
      t.categories.length > 0 ? t.categories.map((c) => c.categoryId) : [null];
    const share = t.amount / ids.length;
    for (const id of ids) totals.set(id, (totals.get(id) ?? 0) + share);
  }
  return totals;
}

// ─── Giao dịch ────────────────────────────────────────────────────────────────
export const TRANSACTIONS_PAGE_SIZE = 30;

export type TransactionFilter = {
  month?: string;
  type?: TxType;
  categoryId?: string;
  q?: string;
};

function transactionWhere(groupId: string, f: TransactionFilter): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { groupId };
  if (f.month) {
    const { from, until } = monthRange(f.month);
    where.date = { gte: from, lte: until };
  }
  if (f.type) where.type = f.type;
  if (f.categoryId) where.categories = { some: { categoryId: f.categoryId } };
  if (f.q) where.note = { contains: f.q, mode: "insensitive" };
  return where;
}

const transactionInclude = {
  categories: {
    select: { category: { select: { id: true, name: true, icon: true, type: true } } },
    orderBy: { position: "asc" },
  },
  createdBy: { select: { id: true, name: true, image: true, email: true } },
  paidBy: { select: { id: true, name: true, image: true, email: true } },
  splits: {
    select: {
      userId: true,
      weight: true,
      amount: true,
      user: { select: { id: true, name: true, image: true, email: true } },
    },
  },
} satisfies Prisma.TransactionInclude;

export type TransactionView = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

/** Một trang giao dịch (mới nhất trước) + tổng thu/chi của toàn bộ bộ lọc. */
export async function getTransactions(
  userId: string,
  groupId: string,
  filter: TransactionFilter,
  cursor?: string
) {
  const where = transactionWhere(groupId, filter);

  const [membership, rows, totals] = await Promise.all([
    getMembership(userId, groupId),
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: TRANSACTIONS_PAGE_SIZE + 1, // lấy dư 1 để biết còn trang sau không
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    }),
  ]);
  if (!membership) return null;

  const hasMore = rows.length > TRANSACTIONS_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, TRANSACTIONS_PAGE_SIZE) : rows;
  const income = totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const expense = totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    income,
    expense,
    balance: income - expense,
  };
}

// ─── Cho vay / đi vay ─────────────────────────────────────────────────────────
export type LoanProgress = { paid: number; remaining: number; overdue: boolean };
export type LoanView = Loan & { payments: LoanPayment[] } & LoanProgress;

/** Gắn thêm số đã thu/trả và số còn lại vào một khoản vay. */
export function withLoanProgress<T extends Loan & { payments: LoanPayment[] }>(
  loan: T
): T & LoanProgress {
  const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, loan.amount - paid);
  return {
    ...loan,
    paid,
    remaining,
    overdue:
      loan.status === "ACTIVE" && !!loan.dueDate && loan.dueDate < today() && remaining > 0,
  };
}

export async function getLoans(
  userId: string,
  groupId: string,
  filter: { type?: "LEND" | "BORROW"; status?: "ACTIVE" | "PAID" | "CANCELLED" } = {}
) {
  const [membership, loans] = await Promise.all([
    getMembership(userId, groupId),
    prisma.loan.findMany({
      where: { groupId, ...(filter.type ? { type: filter.type } : {}), ...(filter.status ? { status: filter.status } : {}) },
      include: { payments: { orderBy: { date: "desc" } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { date: "desc" }],
    }),
  ]);
  if (!membership) return null;
  return loans.map(withLoanProgress);
}

export async function getLoanDetail(userId: string, loanId: string) {
  // Kiểm tra quyền qua chính khoản vay (`group.loans.some`) nên chạy song song
  // được với truy vấn chi tiết, thay vì phải chờ biết `loan.groupId`.
  const [loan, membership] = await Promise.all([
    prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        payments: {
          include: { createdBy: { select: { id: true, name: true, image: true, email: true } } },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        },
        group: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, image: true, email: true } },
      },
    }),
    prisma.groupMember.findFirst({
      where: { userId, group: { loans: { some: { id: loanId } } } },
      select: { id: true },
    }),
  ]);
  if (!loan || !membership) return null;

  // Lãi tạm tính theo số tháng (30 ngày) đã trôi qua kể từ ngày phát sinh.
  const monthsElapsed = Math.max(0, (Date.now() - loan.date.getTime()) / (30 * 86_400_000));
  const interest = loan.interestRate
    ? Math.round((loan.amount * loan.interestRate * monthsElapsed) / 100)
    : 0;

  return { ...withLoanProgress(loan), interest };
}

// ─── Tổng quan ────────────────────────────────────────────────────────────────
/** Số liệu trang chủ cho một sổ trong một tháng. */
export async function getOverview(userId: string, groupId: string, month = currentMonth()) {
  const { from, until } = monthRange(month);

  const [membership, monthRows, recent, loans, categories] = await Promise.all([
    getMembership(userId, groupId),
    // Một lượt lấy cả tháng rồi cộng trong JS: trước đây là hai truy vấn (một
    // groupBy tổng thu/chi + một lấy khoản chi để chia theo danh mục).
    prisma.transaction.findMany({
      where: { groupId, date: { gte: from, lte: until } },
      select: { type: true, amount: true, categories: { select: { categoryId: true } } },
    }),
    prisma.transaction.findMany({
      where: { groupId },
      include: transactionInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.loan.findMany({
      where: { groupId, status: "ACTIVE" },
      include: { payments: true },
    }),
    // Kèm `type` để trang chủ dùng luôn cho hộp thoại ghi giao dịch, không phải
    // truy vấn danh mục lần thứ hai.
    prisma.category.findMany({
      where: { groupId },
      select: { id: true, name: true, icon: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!membership) return null;

  const catById = new Map(categories.map((c) => [c.id, c]));

  let income = 0;
  let expense = 0;
  for (const t of monthRows) {
    if (t.type === "INCOME") income += t.amount;
    else expense += t.amount;
  }

  const expenseByCategory = [...sumByCategory(monthRows.filter((t) => t.type === "EXPENSE")).entries()]
    .map(([categoryId, value]) => ({
      name: categoryId ? catById.get(categoryId)?.name ?? "Đã xoá" : "Chưa phân loại",
      icon: categoryId ? catById.get(categoryId)?.icon ?? null : null,
      value,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const active = loans.map(withLoanProgress).filter((l) => l.remaining > 0);
  const receivable = active.filter((l) => l.type === "LEND").reduce((s, l) => s + l.remaining, 0);
  const payable = active.filter((l) => l.type === "BORROW").reduce((s, l) => s + l.remaining, 0);

  // Sắp đến hạn (trong 14 ngày) hoặc đã quá hạn — nhắc ngay trên trang chủ.
  const soon = new Date(today().getTime() + 14 * 86_400_000);
  const dueSoon = active
    .filter((l) => l.dueDate && l.dueDate <= soon)
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5);

  return {
    month,
    income,
    expense,
    balance: income - expense,
    expenseByCategory,
    recent,
    receivable,
    payable,
    dueSoon,
    activeLoanCount: active.length,
    /** Danh mục của sổ — trang chủ dùng lại cho hộp thoại ghi giao dịch. */
    categories,
  };
}

// ─── Cân đối giữa các thành viên ──────────────────────────────────────────────
export type BalanceUser = { id: string; name: string | null; image: string | null; email: string | null };

export type BalanceRow = MemberBalance & {
  user: BalanceUser;
  /** false = đã rời sổ nhưng còn số dư từ các giao dịch cũ. */
  isMember: boolean;
};

/**
 * Chênh lệch chi tiêu của từng thành viên trong một sổ, kèm các lượt chuyển tiền
 * gợi ý để về 0 và lịch sử đã cân bằng.
 *
 * Cố ý tính trên **toàn bộ** lịch sử sổ chứ không theo tháng: nợ nhau không tự
 * hết khi sang tháng mới, chỉ hết khi có người trả (Settlement).
 */
export async function getGroupBalance(userId: string, groupId: string) {
  const [membership, members, transactions, settlements] = await Promise.all([
    getMembership(userId, groupId),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, image: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { groupId },
      select: {
        type: true,
        amount: true,
        paidById: true,
        createdById: true,
        splits: { select: { userId: true, weight: true, amount: true } },
      },
    }),
    prisma.settlement.findMany({
      where: { groupId },
      include: {
        from: { select: { id: true, name: true, image: true, email: true } },
        to: { select: { id: true, name: true, image: true, email: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  if (!membership) return null;

  const memberIds = members.map((m) => m.userId);
  const balances = computeBalances({
    memberIds,
    // paidById null ở dữ liệu cũ → coi như người ghi sổ đã bỏ tiền.
    transactions: transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      payerId: t.paidById ?? t.createdById,
      splits: t.splits,
    })),
    settlements,
  });

  // Người còn số dư nhưng đã rời sổ vẫn phải hiện, nếu không thì tổng không về 0.
  const known = new Map<string, BalanceUser>(members.map((m) => [m.userId, m.user]));
  for (const s of settlements) {
    known.set(s.from.id, s.from);
    known.set(s.to.id, s.to);
  }
  const missing = balances.map((b) => b.userId).filter((id) => !known.has(id));
  if (missing.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: missing } },
      select: { id: true, name: true, image: true, email: true },
    });
    for (const u of users) known.set(u.id, u);
  }

  const memberIdSet = new Set(memberIds);
  const rows: BalanceRow[] = balances
    .filter((b) => memberIdSet.has(b.userId) || b.net !== 0)
    .map((b) => ({
      ...b,
      user: known.get(b.userId) ?? { id: b.userId, name: null, image: null, email: null },
      isMember: memberIdSet.has(b.userId),
    }));

  // Lấy user từ `rows` (đã có sẵn bản dự phòng khi không tra được tên) chứ không
  // tra lại `known` — mọi lượt chuyển đều sinh ra từ chính các dòng này.
  const userById = new Map(rows.map((r) => [r.userId, r.user]));
  const transfers = suggestTransfers(rows).map((t) => ({
    ...t,
    from: userById.get(t.fromUserId)!,
    to: userById.get(t.toUserId)!,
  }));

  return {
    rows,
    transfers,
    settlements,
    me: rows.find((r) => r.userId === userId) ?? null,
    memberCount: members.length,
    totalExpense: rows.reduce((s, r) => s + r.paid, 0),
  };
}

// ─── Báo cáo ──────────────────────────────────────────────────────────────────
/** Dòng tiền `months` tháng gần nhất + cơ cấu thu/chi theo danh mục. */
export async function getReport(userId: string, groupId: string, months = 6) {
  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) monthKeys.push(shiftMonth(currentMonth(), -i));
  const from = monthRange(monthKeys[0]).from;
  const until = monthRange(monthKeys[monthKeys.length - 1]).until;

  const [membership, transactions, categories, loans] = await Promise.all([
    getMembership(userId, groupId),
    prisma.transaction.findMany({
      where: { groupId, date: { gte: from, lte: until } },
      select: {
        type: true,
        amount: true,
        date: true,
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.category.findMany({ where: { groupId }, select: { id: true, name: true, icon: true } }),
    prisma.loan.findMany({ where: { groupId }, include: { payments: true } }),
  ]);
  if (!membership) return null;

  const catById = new Map(categories.map((c) => [c.id, c]));
  const series = new Map(monthKeys.map((m) => [m, { month: m, income: 0, expense: 0 }]));

  for (const t of transactions) {
    const key = dateKey(t.date).slice(0, 7);
    const row = series.get(key);
    if (row) row[t.type === "INCOME" ? "income" : "expense"] += t.amount;
  }

  const label = (categoryId: string | null) => {
    if (!categoryId) return "Chưa phân loại";
    const c = catById.get(categoryId);
    return `${c?.icon ?? ""} ${c?.name ?? "Đã xoá"}`.trim();
  };
  const toList = (rows: typeof transactions) =>
    [...sumByCategory(rows).entries()]
      .map(([categoryId, value]) => ({ name: label(categoryId), value }))
      .sort((a, b) => b.value - a.value);

  const withProgress = loans.map(withLoanProgress);
  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  return {
    months,
    series: monthKeys.map((m) => series.get(m)!),
    expenseByCategory: toList(transactions.filter((t) => t.type === "EXPENSE")),
    incomeByCategory: toList(transactions.filter((t) => t.type === "INCOME")),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    receivable: withProgress
      .filter((l) => l.type === "LEND" && l.status === "ACTIVE")
      .reduce((s, l) => s + l.remaining, 0),
    payable: withProgress
      .filter((l) => l.type === "BORROW" && l.status === "ACTIVE")
      .reduce((s, l) => s + l.remaining, 0),
  };
}

// ─── Thông báo ────────────────────────────────────────────────────────────────
export const NOTIFICATIONS_PAGE_SIZE = 15;

/**
 * Một trang thông báo (cả đã đọc lẫn chưa đọc), mới nhất trước, phân trang theo
 * con trỏ id. Truyền `nextCursor` của trang trước để lấy tiếp.
 */
export async function getNotifications(userId: string, cursor?: string) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATIONS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > NOTIFICATIONS_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, NOTIFICATIONS_PAGE_SIZE) : rows;

  // Thông báo JOIN_REQUEST có nút duyệt/từ chối ngay trên chuông. Trạng thái
  // thật nằm ở GroupJoinRequest, nên gộp vào payload để client biết khi nào ẩn nút.
  const requestIds = items
    .filter((n) => n.type === "JOIN_REQUEST")
    .map((n) => (n.payload as { data?: { requestId?: string } })?.data?.requestId)
    .filter((id): id is string => Boolean(id));

  if (requestIds.length > 0) {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { id: { in: requestIds } },
      select: { id: true, status: true },
    });
    const statusById = new Map(requests.map((r) => [r.id, r.status]));
    for (const n of items) {
      if (n.type !== "JOIN_REQUEST") continue;
      const payload = (n.payload ?? {}) as { data?: { requestId?: string } };
      const requestId = payload.data?.requestId;
      if (!requestId) continue;
      n.payload = {
        ...payload,
        data: { ...payload.data, requestStatus: statusById.get(requestId) ?? null },
      };
    }
  }

  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
