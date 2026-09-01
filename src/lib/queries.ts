import { cache } from "react";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { Loan, LoanPayment, TxType } from "@prisma/client";
import {
  computeBalances,
  splitShares,
  suggestTransfers,
  type MemberBalance,
} from "@/lib/balance";
import { readActiveGroupId } from "@/lib/scope";
import {
  dateFromKey,
  dateKey,
  dayKeysBetween,
  daysInRange,
  formatDayShort,
  monthKeysBetween,
  monthRange,
  today,
} from "@/lib/utils";

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

/**
 * Yêu cầu vào sổ của chính người dùng còn đang chờ duyệt.
 *
 * Trước đây trạng thái này VÔ HÌNH: gửi xong yêu cầu, app bảo "đang chờ duyệt"
 * rồi đẩy sang `/groups` — nơi hiện đúng dòng "Chưa có sổ nào". Người dùng
 * không có cách nào biết yêu cầu còn sống hay đã bị quên, nên họ gửi lại (upsert
 * nên không lỗi gì cả) hoặc bỏ cuộc.
 */
export async function getMyPendingJoinRequests(userId: string) {
  return prisma.groupJoinRequest.findMany({
    where: { userId, status: "PENDING" },
    include: { group: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
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
 *
 * Bọc trong React `cache()`: `(app)/layout.tsx` gọi nó nhiều lần trong cùng một
 * lần render (thanh bên, bộ chọn sổ trên điện thoại, và cổng của thanh mời bật
 * thông báo). Không có nó thì mỗi chỗ là một lượt đi/về DB nữa — mà độ trễ DB
 * chính là thứ quyết định tốc độ trang ở app này.
 */
export const getScope = cache(async function getScope(userId: string, preferred?: string) {
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
});

/**
 * Mở đầu một trang có phạm vi sổ mà **không** phải chờ hai lượt đi/về DB nối
 * tiếp nhau (trước: xác định sổ → rồi mới truy vấn dữ liệu ≈ 2×100ms).
 *
 * Sổ đang xem gần như luôn là sổ ghim trong cookie (đọc cookie không tốn lượt
 * DB nào), nên ta *đoán trước* và bắn truy vấn dữ liệu đi ngay, song song với
 * truy vấn xác định danh sách sổ. Đoán đúng — trường hợp thường gặp — thì cả
 * trang chỉ còn **một** lượt chờ. Đoán sai (cookie trỏ tới sổ đã rời / đã xoá,
 * hoặc chưa ghim sổ nào) thì mới chạy lại `load` với sổ đúng.
 *
 * `data` trả về là **promise chưa await**: trang có thể vẽ ngay phần khung rồi
 * bọc phần nội dung trong `<Suspense>` để nó stream vào sau.
 */
export async function scopeWith<T>(
  userId: string,
  preferred: string | undefined,
  load: (groupId: string) => Promise<T>
): Promise<{ groups: { id: string; name: string }[]; groupId: string | null; data: Promise<T> | null }> {
  const guess = preferred ?? (await readActiveGroupId());

  let guessed: Promise<T> | null = null;
  if (guess) {
    guessed = load(guess);
    // Đoán sai thì promise này bị bỏ đi — gắn sẵn handler để lỗi (nếu có) không
    // nổ thành unhandled rejection và giết cả request.
    guessed.catch(() => {});
  }

  const { groups, groupId } = await getScope(userId, preferred);
  if (!groupId) return { groups, groupId: null, data: null };
  // `getScope` đã kiểm tra người dùng còn là thành viên của `groupId`, nên đoán
  // trúng id là dùng lại được kết quả, không cần hỏi lại DB.
  return { groups, groupId, data: groupId === guess && guessed ? guessed : load(groupId) };
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

/** Giá trị đặc biệt của `month`: bỏ hẳn giới hạn thời gian. */
export const ALL_MONTHS = "all";

/** Cách sắp xếp danh sách khoản. Giá trị đi thẳng trên URL (`?sap=`). */
export type TransactionSort = "moi" | "cu" | "nhieu";

export type TransactionFilter = {
  month?: string;
  /** Một ngày cụ thể ("2026-08-05") — hẹp hơn `month` nên ghi đè `month`. */
  day?: string;
  type?: TxType;
  categoryId?: string;
  q?: string;
  sort?: TransactionSort;
};

function transactionWhere(groupId: string, f: TransactionFilter): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { groupId };
  if (f.day) {
    // Ngày lưu ở mốc nửa đêm UTC nên so bằng là đủ, không cần khoảng.
    where.date = dateFromKey(f.day);
  } else if (f.month === ALL_MONTHS) {
    // Không thêm mệnh đề ngày nào: tìm xuyên mọi tháng. Tồn tại vì tìm kiếm bó
    // trong một tháng là cái bẫy kinh điển — "tôi nhớ rõ có ghi mà, đâu rồi?"
    // gần như luôn là khoản nằm ở tháng khác.
  } else if (f.month) {
    const { from, until } = monthRange(f.month);
    where.date = { gte: from, lte: until };
  }
  if (f.type) where.type = f.type;
  if (f.categoryId) where.categories = { some: { categoryId: f.categoryId } };
  if (f.q) where.note = { contains: f.q, mode: "insensitive" };
  return where;
}

/**
 * Thứ tự đọc phải là thứ tự TOÀN PHẦN, nếu không phân trang bằng con trỏ sẽ
 * nhảy cóc hoặc lặp dòng.
 *
 * Bản cũ là `[{date}, {createdAt}]` — và `createdAt` KHÔNG duy nhất: hai khoản
 * ghi trong cùng một mili-giây (nhập liền tay, hoặc nhập hàng loạt) xếp thứ tự
 * không xác định, nên khi Prisma cắt trang ở đúng chỗ đó thì một dòng có thể
 * biến mất khỏi trang 2 hoặc hiện lại lần nữa. Thêm `id` vào cuối là đủ: nó
 * duy nhất tuyệt đối. Đây là vá một bug đã có sẵn, không phải chi phí của
 * tính năng sắp xếp.
 */
function transactionOrderBy(sort: TransactionSort = "moi"): Prisma.TransactionOrderByWithRelationInput[] {
  if (sort === "nhieu") return [{ amount: "desc" }, { id: "desc" }];
  if (sort === "cu") return [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }];
  return [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }];
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
      orderBy: transactionOrderBy(filter.sort),
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

/** Nhiều hơn thế này thì cái nhắc việc thành một danh sách thứ hai. */
const UNKNOWN_AMOUNT_LIMIT = 20;

/**
 * Những khoản đã ghi mà CHƯA BIẾT số tiền — hôm nay người khác trả hộ, mình ghi
 * lại ngay để không quên, số tiền điền sau.
 *
 * Bó theo ĐÚNG THÁNG đang xem, giống danh sách bên dưới: khối nhắc việc nói về
 * tháng người dùng đang mở, không phải về cả cuốn sổ. Khoản chưa rõ tiền của
 * tháng 3 chỉ hiện khi mở tháng 3.
 *
 * Đánh đổi phải biết: lật sang tháng khác là cái nhắc của tháng cũ biến mất khỏi
 * màn hình. Chỗ duy nhất còn giữ dấu vết là ô lịch (`DayTotals.unknown`) và chính
 * khoản đó trong danh sách theo ngày của nó.
 *
 * `month === ALL_MONTHS` (chế độ tìm xuyên tháng) thì không giới hạn ngày nữa —
 * lúc đó không có tháng nào đang được xem.
 *
 * Cũ nhất lên trước: khoản để lâu nhất là khoản sắp bị quên thật.
 *
 * Không tự kiểm tra quyền: luôn chạy song song với `getTransactions` trong cùng
 * một `Promise.all`, và trang chỉ vẽ khi truy vấn kia xác nhận quyền.
 */
export async function getUnknownAmountTransactions(groupId: string, month?: string) {
  return prisma.transaction.findMany({
    where: { ...transactionWhere(groupId, { month }), amountUnknown: true },
    include: transactionInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: UNKNOWN_AMOUNT_LIMIT,
  });
}

export type DayTotals = {
  /** Khoá ngày "2026-08-05". */
  day: string;
  income: number;
  expense: number;
  count: number;
  /**
   * Trong đó, bao nhiêu khoản CHƯA ĐIỀN số tiền.
   *
   * Có mặt ở đây vì không có nó thì một ngày chỉ gồm khoản chưa rõ tiền cho ra
   * `income` = `expense` = 0, và ô lịch của ngày đó trống trơn — không phân biệt
   * được với ngày chưa ghi gì. Người dùng ghi xong, nhìn lịch, thấy trống: kết
   * luận duy nhất rút ra được là app đánh mất khoản của họ.
   */
  unknown: number;
};

/**
 * Tổng tiền vào / tiền ra của TỪNG NGÀY trong một tháng — dữ liệu vẽ lịch, và
 * cũng là tổng của cả tháng cho dải tháng ở đầu trang.
 *
 * Bộ lọc ngày (`filter.day`) bị bỏ đi ở đây: lịch phải luôn vẽ cả tháng, kể cả
 * khi danh sách bên dưới đang chỉ xem một ngày. Bộ lọc chiều/loại thì GIỮ, để ô
 * lịch và danh sách không bao giờ nói hai chuyện khác nhau.
 *
 * Không tự kiểm tra thành viên: hàm này luôn chạy song song với `getTransactions`
 * trong cùng một `Promise.all`, và trang chỉ vẽ khi truy vấn kia xác nhận quyền
 * (trả về khác null). Thêm một truy vấn kiểm tra nữa chỉ tốn thêm một lượt DB.
 */
export async function getMonthDayTotals(
  groupId: string,
  month: string,
  filter: Omit<TransactionFilter, "day" | "month"> = {}
): Promise<DayTotals[]> {
  const rows = await prisma.transaction.groupBy({
    // `amountUnknown` thêm vào khoá gom, KHÔNG thêm truy vấn: cùng một lượt DB,
    // chỉ nhiều nhất gấp đôi số dòng trả về (mỗi ngày × chiều × rõ/chưa rõ), và
    // tổng vẫn khớp vì bên dưới cộng dồn lại theo ngày.
    by: ["date", "type", "amountUnknown"],
    where: transactionWhere(groupId, { ...filter, month }),
    _sum: { amount: true },
    _count: { _all: true },
  });

  const byDay = new Map<string, DayTotals>();
  for (const r of rows) {
    const day = dateKey(r.date);
    const row = byDay.get(day) ?? { day, income: 0, expense: 0, count: 0, unknown: 0 };
    row[r.type === "INCOME" ? "income" : "expense"] += r._sum.amount ?? 0;
    row.count += r._count._all;
    if (r.amountUnknown) row.unknown += r._count._all;
    byDay.set(day, row);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

// ─── Cho vay / đi vay ─────────────────────────────────────────────────────────
/** Số ngày một khoản đang mở bị "để yên" thì coi là cần chú ý dù không có hạn trả. */
export const STALE_LOAN_DAYS = 60;

/** Trong bao nhiêu ngày tới thì tính là "sắp đến hạn". */
export const DUE_SOON_DAYS = 7;

export type LoanProgress = {
  paid: number;
  remaining: number;
  overdue: boolean;
  /** Đã thu/trả vượt tiền gốc bao nhiêu (0 nếu chưa vượt) — dấu hiệu ghi sai số. */
  overpaid: number;
  /** Còn mấy ngày tới hạn (âm = quá hạn); null khi khoản vay không có hạn trả. */
  daysToDue: number | null;
  /** Số ngày kể từ lần thu/trả gần nhất, hoặc từ ngày phát sinh nếu chưa có lần nào. */
  idleDays: number;
  /** Khoản đang mở, không hạn trả và đã lâu không động tới → dễ bị bỏ quên. */
  stale: boolean;
  /** Khoản đang mở cần chú ý: quá hạn, sắp đến hạn, hoặc bị để yên quá lâu. */
  attention: boolean;
};
export type LoanView = Loan & { paymentCount: number } & LoanProgress;

/**
 * Ba con số tóm tắt lịch sử thu/trả — TẤT CẢ những gì `withLoanProgress` cần.
 *
 * Tồn tại vì danh sách nợ từng `include` toàn bộ dòng thanh toán của TỪNG khoản
 * chỉ để tính ra ba số này, trong khi màn danh sách chỉ hiển thị đúng một cái
 * (số lần trả). Một cuốn sổ dùng lâu năm vì thế kéo về hàng nghìn dòng mỗi lần
 * mở trang Nợ. Trang chi tiết thì khác — nó vẽ lịch sử thật nên vẫn lấy đủ.
 */
export type PaymentSummary = {
  paid: number;
  /** null khi chưa có lần trả nào. */
  lastPaymentDate: Date | null;
  paymentCount: number;
};

export function summarizePayments(payments: LoanPayment[]): PaymentSummary {
  return {
    paid: payments.reduce((s, p) => s + p.amount, 0),
    lastPaymentDate: payments.reduce<Date | null>(
      (latest, p) => (latest === null || p.date > latest ? p.date : latest),
      null
    ),
    paymentCount: payments.length,
  };
}

/** Gắn thêm số đã thu/trả, số còn lại và các dấu hiệu cần chú ý vào một khoản vay. */
export function withLoanProgress<T extends Loan>(
  loan: T,
  summary: PaymentSummary
): T & PaymentSummary & LoanProgress {
  const { paid, lastPaymentDate, paymentCount } = summary;
  const remaining = Math.max(0, loan.amount - paid);
  const now = today();
  const open = loan.status === "ACTIVE" && remaining > 0;

  const lastActivity =
    lastPaymentDate && lastPaymentDate > loan.date ? lastPaymentDate : loan.date;
  const idleDays = Math.max(0, Math.round((now.getTime() - lastActivity.getTime()) / 86_400_000));
  const daysToDue = loan.dueDate
    ? Math.round((loan.dueDate.getTime() - now.getTime()) / 86_400_000)
    : null;
  const stale = open && !loan.dueDate && idleDays >= STALE_LOAN_DAYS;

  return {
    ...loan,
    paid,
    lastPaymentDate,
    paymentCount,
    remaining,
    overdue: open && !!loan.dueDate && loan.dueDate < now,
    overpaid: Math.max(0, paid - loan.amount),
    daysToDue,
    idleDays,
    stale,
    attention: open && (stale || (daysToDue !== null && daysToDue <= DUE_SOON_DAYS)),
  };
}

/**
 * Sắp xếp theo mức gấp: khoản có hạn lên trước (hạn gần nhất trước, quá hạn lâu
 * nhất là gấp nhất), rồi tới khoản bị để yên lâu nhất.
 */
export function byUrgency(a: LoanProgress, b: LoanProgress): number {
  if (a.daysToDue !== null && b.daysToDue !== null) return a.daysToDue - b.daysToDue;
  if (a.daysToDue !== null) return -1;
  if (b.daysToDue !== null) return 1;
  return b.idleDays - a.idleDays;
}

export async function getLoans(
  userId: string,
  groupId: string,
  filter: { type?: "LEND" | "BORROW"; status?: "ACTIVE" | "PAID" | "CANCELLED" } = {}
) {
  const [membership, loans, sums] = await Promise.all([
    getMembership(userId, groupId),
    prisma.loan.findMany({
      where: { groupId, ...(filter.type ? { type: filter.type } : {}), ...(filter.status ? { status: filter.status } : {}) },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { date: "desc" }],
    }),
    // Gộp về ba con số ngay trong CSDL thay vì kéo từng dòng thanh toán về rồi
    // cộng ở Node. Chạy song song nên tốn đúng bằng thời gian cũ, nhưng khối
    // lượng dữ liệu truyền về thành hằng số bất kể lịch sử dài bao nhiêu.
    prisma.loanPayment.groupBy({
      by: ["loanId"],
      where: { loan: { groupId } },
      _sum: { amount: true },
      _max: { date: true },
      _count: { _all: true },
    }),
  ]);
  if (!membership) return null;
  const byLoan = new Map(sums.map((r) => [r.loanId, r]));
  return loans.map((loan) => {
    const r = byLoan.get(loan.id);
    return withLoanProgress(loan, {
      paid: r?._sum.amount ?? 0,
      lastPaymentDate: r?._max.date ?? null,
      paymentCount: r?._count._all ?? 0,
    });
  });
}

export const CLOSED_LOANS_PAGE_SIZE = 20;

/** Số khoản đã đóng (trả xong / đã bỏ) của một sổ — để biết có nên mời vào kho lưu hay không. */
export function countClosedLoans(groupId: string) {
  return prisma.loan.count({ where: { groupId, status: { not: "ACTIVE" } } });
}

/** Một dòng thô từ truy vấn kho lưu: khoản vay + ba số tóm tắt + ngày xong. */
type ClosedLoanRow = Loan & {
  paidSum: number;
  lastPaymentDate: Date | null;
  paymentCount: number;
  closedAt: Date;
};

/**
 * MỘT TRANG khoản đã đóng, mới xong trước — ruột của `/loans/closed`.
 *
 * Sắp theo NGÀY XONG chứ không phải ngày phát sinh: một khoản mượn từ năm ngoái
 * mà tuần trước mới trả hết là thứ người dùng tìm đầu tiên khi mở kho lưu, còn
 * ngày phát sinh thì họ đã quên từ lâu. "Ngày xong" = lần thu/trả cuối; khoản bị
 * bỏ giữa đường (CANCELLED, chưa trả lần nào) thì lấy chính ngày phát sinh.
 *
 * Phải là SQL thô: "ngày xong" là `MAX(payment.date)`, và Prisma chỉ cho
 * `orderBy` theo `_count` của quan hệ, không theo `_max`. Gộp luôn cả ba số của
 * `PaymentSummary` vào cùng câu để một trang tốn đúng một lượt đi/về CSDL thay
 * vì ba (danh sách → tổng thanh toán → đếm).
 *
 * Phân trang bằng OFFSET, không phải cursor: kho lưu có TỔNG SỐ hiện ra và người
 * dùng nhảy thẳng tới trang giữa được — thứ cursor không làm được. An toàn vì
 * tập này chỉ lớn dần rất chậm và mỗi trang chỉ 20 dòng.
 */
export async function getClosedLoans(
  userId: string,
  groupId: string,
  { status, page = 1 }: { status?: "PAID" | "CANCELLED"; page?: number } = {}
) {
  const statusFilter = status
    ? Prisma.sql`l."status"::text = ${status}`
    : Prisma.sql`l."status"::text <> 'ACTIVE'`;
  const offset = Math.max(0, (page - 1) * CLOSED_LOANS_PAGE_SIZE);

  const [membership, rows, total] = await Promise.all([
    getMembership(userId, groupId),
    prisma.$queryRaw<ClosedLoanRow[]>`
      SELECT l.*,
             COALESCE(SUM(p."amount"), 0)::float8 AS "paidSum",
             MAX(p."date") AS "lastPaymentDate",
             COUNT(p."id")::int AS "paymentCount",
             COALESCE(MAX(p."date"), l."date") AS "closedAt"
      FROM "Loan" l
      LEFT JOIN "LoanPayment" p ON p."loanId" = l."id"
      WHERE l."groupId" = ${groupId} AND ${statusFilter}
      GROUP BY l."id"
      ORDER BY "closedAt" DESC, l."date" DESC, l."id" DESC
      LIMIT ${CLOSED_LOANS_PAGE_SIZE} OFFSET ${offset}
    `,
    prisma.loan.count({
      where: { groupId, ...(status ? { status } : { status: { not: "ACTIVE" } }) },
    }),
  ]);
  if (!membership) return null;

  const items = rows.map(({ paidSum, lastPaymentDate, paymentCount, closedAt, ...loan }) => ({
    ...withLoanProgress(loan, { paid: paidSum, lastPaymentDate, paymentCount }),
    closedAt,
  }));

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CLOSED_LOANS_PAGE_SIZE)),
  };
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
          orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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

  return { ...withLoanProgress(loan, summarizePayments(loan.payments)), payments: loan.payments, interest };
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
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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
/**
 * Một cột của biểu đồ dòng tiền. `label` do server tính sẵn: nó phụ thuộc vào độ
 * dài khoảng đang xem (ngày / tháng / tháng có năm), mà chỉ ở đây mới biết.
 */
export type CashflowPoint = { key: string; label: string; income: number; expense: number };

/** Khoảng ngắn thì cột là NGÀY, dài thì cột là THÁNG. Ngưỡng ~1,5 tháng. */
const DAILY_SERIES_MAX_DAYS = 45;

export type MemberSpend = {
  user: BalanceUser;
  /** false = đã rời sổ nhưng còn khoản trong khoảng đang xem. */
  isMember: boolean;
  /** Tiền người này BỎ RA cho các khoản chi trong khoảng. */
  paid: number;
  /** Phần người này PHẢI CHỊU trong các khoản chi đó (theo cách chia của từng khoản). */
  share: number;
};

/**
 * Ai bỏ ra bao nhiêu, ai phải chịu bao nhiêu, trong đúng khoảng đang xem.
 *
 * Hai con số này là hai câu hỏi khác nhau và người dùng thường trộn lẫn: "chị
 * trả tiền chợ" (bỏ ra) không có nghĩa "chị tiêu hết số đó" (phải chịu) — phần
 * còn lại là của cả nhà. Vì vậy hàng nào cũng nói CẢ HAI.
 *
 * Phần phải chịu tính bằng `splitShares`, đúng hàm mà trang Cân đối dùng, nên
 * hai trang không thể ra hai con số khác nhau cho cùng một khoản. Khác biệt duy
 * nhất: ở đây bó theo khoảng thời gian, còn cân đối thì toàn thời gian (nợ nhau
 * không hết khi sang tháng).
 */
function spendByMember(
  transactions: {
    type: TxType;
    amount: number;
    paidById: string | null;
    createdById: string;
    splits: { userId: string; weight: number; amount: number | null }[];
  }[],
  members: BalanceUser[]
): MemberSpend[] {
  const memberIds = members.map((m) => m.id);
  const rows = new Map<string, { paid: number; share: number }>(
    memberIds.map((id) => [id, { paid: 0, share: 0 }])
  );
  const bump = (userId: string, key: "paid" | "share", amount: number) => {
    const row = rows.get(userId) ?? { paid: 0, share: 0 };
    row[key] += amount;
    rows.set(userId, row);
  };

  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    // paidById null ở dữ liệu cũ → coi như người ghi sổ đã bỏ tiền, y như cân đối.
    const payerId = t.paidById ?? t.createdById;
    bump(payerId, "paid", t.amount);
    for (const [uid, amount] of splitShares(
      { type: t.type, amount: t.amount, payerId, splits: t.splits },
      memberIds
    )) {
      bump(uid, "share", amount);
    }
  }

  const byId = new Map(members.map((m) => [m.id, m]));
  return [...rows.entries()]
    .filter(([id, r]) => byId.has(id) || r.paid > 0 || r.share > 0)
    .map(([id, r]) => ({
      user: byId.get(id) ?? { id, name: null, image: null, email: null },
      isMember: byId.has(id),
      ...r,
    }))
    .sort((a, b) => b.paid - a.paid || b.share - a.share);
}

/**
 * Dòng tiền của một khoảng ngày bất kỳ + cơ cấu thu/chi theo danh mục.
 *
 * Nhận khoảng ngày chứ không phải số tháng (bản cũ chỉ nhận `months = 3|6|12`):
 * trang Báo cáo giờ xem được đúng một tháng hoặc một khoảng người dùng tự chọn —
 * xem `@/lib/range`.
 *
 * Độ chia của biểu đồ tự đổi theo độ dài khoảng: xem một tháng thì 30 cột NGÀY
 * (thấy được ngày nào tiêu đậm), xem 6 tháng thì 6 cột THÁNG (365 cột ngày trên
 * màn hình điện thoại là một vệt màu, không phải biểu đồ).
 */
export async function getReport(
  userId: string,
  groupId: string,
  range: { from: Date; until: Date }
) {
  const { from, until } = range;
  const days = daysInRange(from, until);
  const granularity: "day" | "month" = days <= DAILY_SERIES_MAX_DAYS ? "day" : "month";
  const monthKeys = monthKeysBetween(from, until);
  // Nhiều năm trong cùng một biểu đồ thì "T8" nhập nhằng — thêm năm hai chữ số.
  const multiYear = from.getUTCFullYear() !== until.getUTCFullYear();

  const [membership, transactions, categories, loans, loanSums, members] = await Promise.all([
    getMembership(userId, groupId),
    prisma.transaction.findMany({
      where: { groupId, date: { gte: from, lte: until } },
      select: {
        type: true,
        amount: true,
        date: true,
        paidById: true,
        createdById: true,
        categories: { select: { categoryId: true } },
        splits: { select: { userId: true, weight: true, amount: true } },
      },
    }),
    prisma.category.findMany({ where: { groupId }, select: { id: true, name: true, icon: true } }),
    // Báo cáo chỉ cần TỔNG còn lại của các khoản đang mở, nên ở đây cũng gộp
    // trong CSDL thay vì kéo về từng dòng thanh toán (cùng chuyện với getLoans).
    prisma.loan.findMany({ where: { groupId } }),
    prisma.loanPayment.groupBy({
      by: ["loanId"],
      where: { loan: { groupId } },
      _sum: { amount: true },
      _max: { date: true },
      _count: { _all: true },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      select: { user: { select: { id: true, name: true, image: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);
  if (!membership) return null;

  const catById = new Map(categories.map((c) => [c.id, c]));

  // Dựng sẵn TOÀN BỘ cột của khoảng, kể cả cột rỗng: một tháng không tiêu gì mà
  // biến mất khỏi biểu đồ sẽ làm các tháng còn lại nhìn như liền nhau.
  const bucketLabel = (key: string) =>
    granularity === "day" ? formatDayShort(key) : `T${Number(key.slice(5))}${multiYear ? `/${key.slice(2, 4)}` : ""}`;
  const series = new Map<string, CashflowPoint>(
    (granularity === "day" ? dayKeysBetween(from, until) : monthKeys).map((key) => [
      key,
      { key, label: bucketLabel(key), income: 0, expense: 0 },
    ])
  );

  for (const t of transactions) {
    const key = granularity === "day" ? dateKey(t.date) : dateKey(t.date).slice(0, 7);
    const row = series.get(key);
    if (row) row[t.type === "INCOME" ? "income" : "expense"] += t.amount;
  }

  const label = (categoryId: string | null) => {
    if (!categoryId) return "Chưa ghi là gì";
    const c = catById.get(categoryId);
    return `${c?.icon ?? ""} ${c?.name ?? "Đã xoá"}`.trim();
  };
  const toList = (rows: typeof transactions) =>
    [...sumByCategory(rows).entries()]
      .map(([categoryId, value]) => ({ name: label(categoryId), value }))
      .sort((a, b) => b.value - a.value);

  const paidByLoan = new Map(loanSums.map((r) => [r.loanId, r]));
  const withProgress = loans.map((l) => {
    const r = paidByLoan.get(l.id);
    return withLoanProgress(l, {
      paid: r?._sum.amount ?? 0,
      lastPaymentDate: r?._max.date ?? null,
      paymentCount: r?._count._all ?? 0,
    });
  });
  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  return {
    byMember: spendByMember(transactions, members.map((m) => m.user)),
    memberCount: members.length,
    granularity,
    /** Số ngày của khoảng — dùng để nói "mỗi ngày / mỗi tháng tiêu khoảng…". */
    days,
    /** Số tháng khoảng này chạm tới, ít nhất là 1. */
    monthCount: monthKeys.length,
    series: [...series.values()],
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
