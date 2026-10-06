import { cache } from "react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { APP_TIME_ZONE, shiftDateKey, todayKey } from "@/lib/utils";

/**
 * Truy vấn của khu quản trị — chỉ đọc.
 *
 * Mọi hàm export ở đây TỰ gọi `requireAdmin()` trước khi đọc. Chốt ở
 * `app/admin/layout.tsx` chỉ lo phần chuyển hướng cho đẹp, không phải ranh giới
 * quyền: layout không chạy lại khi điều hướng phía client (partial rendering),
 * nên một request RSC chỉ xin phần page vẫn tới được page mà không qua layout.
 * Không tốn thêm query nào — `getSession` và `getAdminUser` đều bọc `cache()`,
 * dùng chung với layout trong cùng request.
 */

export const ADMIN_PAGE_SIZE = 25;

/**
 * `COUNT` của Postgres trả về `bigint`, Prisma đưa sang JS thành `BigInt`, và
 * serializer của React Server Component NÉM LỖI khi gặp `BigInt` ("Do not know
 * how to serialize a BigInt"). Mọi `$queryRaw` có đếm đều phải đi qua đây ngay
 * tại biên, trước khi con số kịp chảy vào một prop.
 */
function num(v: bigint | number | null): number {
  return v == null ? 0 : Number(v);
}

/**
 * Ngày theo GIỜ VIỆT NAM của một mốc thời gian, dạng khoá "2026-09-17".
 *
 * Không dùng `dateKey` được: nó đọc phần ngày theo UTC (chính `utils.ts` cảnh
 * báo điều này), nên từ 0h tới 7h sáng giờ Việt Nam, mọi thứ vừa xảy ra sẽ bị
 * xếp nhầm vào HÔM QUA. Cả app quy ước một ngày là một ngày ở Việt Nam
 * (`todayKey`, `APP_TIME_ZONE`), biểu đồ quản trị phải quy ước giống hệt.
 */
const vnDayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function vnDayKey(d: Date): string {
  return vnDayKeyFormat.format(d);
}

/* ─── Tổng quan ──────────────────────────────────────────────────────────── */

export const getAdminOverview = cache(async () => {
  await requireAdmin();
  const [
    users,
    disabledUsers,
    admins,
    groups,
    sharedGroups,
    transactions,
    unknownAmount,
    offlineWritten,
    loans,
    activeLoans,
    settlements,
    pushSubscriptions,
    notifications,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.group.count(),
    // "Sổ chung" = sổ có từ hai người trở lên. Đây là con số nói app có được
    // dùng ĐÚNG mục đích hay không: một sổ một người thì mọi thứ về chia tiền,
    // cân đối, duyệt thành viên đều nằm không.
    prisma.group.count({ where: { members: { some: { role: { in: ["ADMIN", "MEMBER"] } } } } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { amountUnknown: true } }),
    prisma.transaction.count({ where: { clientId: { not: null } } }),
    prisma.loan.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.settlement.count(),
    prisma.pushSubscription.count(),
    prisma.notification.count(),
  ]);

  return {
    users,
    disabledUsers,
    admins,
    groups,
    sharedGroups,
    transactions,
    unknownAmount,
    offlineWritten,
    loans,
    activeLoans,
    settlements,
    pushSubscriptions,
    notifications,
  };
});

/* ─── Mức độ sử dụng ─────────────────────────────────────────────────────── */

function cutoff(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

/**
 * DAU / WAU / MAU thật — đếm người MỞ APP.
 *
 * Chỉ đúng từ lúc cột `lastSeenAt` ra đời trở đi; trước đó mọi người đều null.
 * Giao diện phải nói rõ điều đó chứ không được hiện "chưa bao giờ dùng".
 */
export const getEngagement = cache(async () => {
  await requireAdmin();
  const [d1, d7, d30, everSeen, total] = await prisma.$transaction([
    prisma.user.count({ where: { lastSeenAt: { gte: cutoff(1) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: cutoff(7) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: cutoff(30) } } }),
    prisma.user.count({ where: { lastSeenAt: { not: null } } }),
    prisma.user.count(),
  ]);
  return { d1, d7, d30, everSeen, total };
});

/**
 * Người CÓ GHI CHÉP — chỉ số thứ hai, và là chỉ số duy nhất có hiệu lực ngược
 * về quá khứ.
 *
 * Một người tính là có ghi chép trong khoảng W nếu họ là tác giả của một khoản
 * thu chi, một khoản mượn, một lần trả nợ hoặc một lần cân đối trong W. Với một
 * app sổ sách thì đây mới là "dùng thật", khác hẳn với "có mở lên xem".
 *
 * ĐỪNG gọi con số này là DAU: nó bỏ sót toàn bộ người chỉ mở lên xem báo cáo.
 * Nhãn trên giao diện phải là "người có ghi chép".
 *
 * Một truy vấn thô thay vì bốn truy vấn Prisma ghép bằng JS — ghép bằng JS thì
 * phải kéo mọi id về rồi tự lọc trùng, tức là chuyển cả chục nghìn dòng qua dây
 * để đếm ra ba con số. Trần 30 ngày trong CTE là thứ giữ nó có giới hạn; index
 * `Transaction(createdById, createdAt)` phục vụ nhánh nặng nhất.
 */
export const getWriterCounts = cache(async () => {
  await requireAdmin();
  const rows = await prisma.$queryRaw<{ d1: bigint; d7: bigint; d30: bigint }[]>`
    WITH acts AS (
      SELECT "createdById" AS uid, "createdAt" AS at FROM "Transaction" WHERE "createdAt" > now() - interval '30 days'
      UNION ALL
      SELECT "createdById", "createdAt" FROM "Loan"        WHERE "createdAt" > now() - interval '30 days'
      UNION ALL
      SELECT "createdById", "createdAt" FROM "LoanPayment" WHERE "createdAt" > now() - interval '30 days'
      UNION ALL
      SELECT "createdById", "createdAt" FROM "Settlement"  WHERE "createdAt" > now() - interval '30 days'
    )
    SELECT
      COUNT(DISTINCT uid) FILTER (WHERE at > now() - interval '1 day')   AS d1,
      COUNT(DISTINCT uid) FILTER (WHERE at > now() - interval '7 days')  AS d7,
      COUNT(DISTINCT uid) FILTER (WHERE at > now() - interval '30 days') AS d30
    FROM acts`;
  const r = rows[0];
  return { d1: num(r?.d1 ?? 0), d7: num(r?.d7 ?? 0), d30: num(r?.d30 ?? 0) };
});

export type TrendPoint = { key: string; label: string; writers: number; writes: number; signups: number };

/**
 * Hoạt động theo ngày, để vẽ biểu đồ.
 *
 * Gieo sẵn ĐỦ mọi mốc ngày kể cả ngày trống — giống hệt cách `getReport` dựng
 * chuỗi của trang Báo cáo. Bỏ ngày trống đi thì biểu đồ co lại và một tuần chết
 * trông y như một tuần bận.
 */
export const getActivityTrend = cache(async (days = 30): Promise<TrendPoint[]> => {
  await requireAdmin();
  const from = cutoff(days);

  const [acts, signups] = await Promise.all([
    prisma.$queryRaw<{ day: Date; writers: bigint; writes: bigint }[]>`
      WITH acts AS (
        SELECT "createdById" AS uid, "createdAt" AS at FROM "Transaction" WHERE "createdAt" >= ${from}
        UNION ALL
        SELECT "createdById", "createdAt" FROM "Loan"        WHERE "createdAt" >= ${from}
        UNION ALL
        SELECT "createdById", "createdAt" FROM "LoanPayment" WHERE "createdAt" >= ${from}
        UNION ALL
        SELECT "createdById", "createdAt" FROM "Settlement"  WHERE "createdAt" >= ${from}
      )
      -- createdAt là TIMESTAMP(3) KHÔNG kèm vùng giờ, chứa giờ UTC. Hai lần
      -- AT TIME ZONE: lần đầu khai nó là UTC, lần sau đổi sang giờ Việt Nam.
      -- Thiếu bước này thì mốc ngày của biểu đồ lệch 7 tiếng so với mọi chỗ
      -- khác trong app, và khoản ghi lúc 6h sáng rơi vào cột hôm qua.
      SELECT date_trunc('day', at AT TIME ZONE 'UTC' AT TIME ZONE ${APP_TIME_ZONE}) AS day,
             COUNT(DISTINCT uid) AS writers,
             COUNT(*)            AS writes
      FROM acts GROUP BY 1`,
    prisma.user.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    }),
  ]);

  const seeded = new Map<string, TrendPoint>();
  const todayVn = todayKey();
  for (let i = days - 1; i >= 0; i--) {
    const key = shiftDateKey(todayVn, -i);
    seeded.set(key, {
      key,
      label: `${key.slice(8)}/${key.slice(5, 7)}`,
      writers: 0,
      writes: 0,
      signups: 0,
    });
  }

  for (const r of acts) {
    // `day` đã là nửa đêm giờ Việt Nam ở dạng timestamp không vùng giờ, nên đọc
    // theo UTC ra đúng khoá ngày cần — KHÔNG được đưa qua vnDayKey lần nữa.
    const p = seeded.get(r.day.toISOString().slice(0, 10));
    if (p) {
      p.writers = num(r.writers);
      p.writes = num(r.writes);
    }
  }
  for (const u of signups) {
    const p = seeded.get(vnDayKey(u.createdAt));
    if (p) p.signups += 1;
  }

  return [...seeded.values()];
});

/**
 * Bao nhiêu người đã từng chạm tới từng tính năng.
 *
 * Đếm theo NGƯỜI chứ không theo số bản ghi: "có 4.000 giao dịch" không nói được
 * tính năng chia tiền có ai dùng không, còn "12 trên 30 người đã từng chia tiền
 * một lần" thì có.
 */
export const getFeatureAdoption = cache(async () => {
  await requireAdmin();
  const [totalUsers, lenders, splitters, settlers, pushUsers, multiBookUsers] = await Promise.all([
    prisma.user.count(),
    prisma.loan.findMany({ distinct: ["createdById"], select: { createdById: true } }),
    prisma.transactionSplit.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.settlement.findMany({ distinct: ["createdById"], select: { createdById: true } }),
    prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.groupMember.groupBy({ by: ["userId"], _count: { groupId: true } }),
  ]);

  return {
    totalUsers,
    loans: lenders.length,
    splits: splitters.length,
    settlements: settlers.length,
    push: pushUsers.length,
    multiBook: multiBookUsers.filter((m) => m._count.groupId > 1).length,
  };
});

/** Người vừa mở app gần đây nhất. */
export const getRecentlyActiveUsers = cache(async (limit = 10) => {
  await requireAdmin();
  return prisma.user.findMany({
    where: { lastSeenAt: { not: null } },
    select: { id: true, name: true, email: true, image: true, lastSeenAt: true, disabledAt: true },
    orderBy: { lastSeenAt: "desc" },
    take: limit,
  });
});

/** Người lâu rồi không mở app. `lastSeenAt` null nghĩa là chưa mở lần nào kể từ khi có cột này. */
export const getInactiveUsers = cache(async (days = 30, limit = 10) => {
  await requireAdmin();
  return prisma.user.findMany({
    where: {
      disabledAt: null,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff(days) } }],
    },
    select: { id: true, name: true, email: true, image: true, lastSeenAt: true, createdAt: true },
    orderBy: [{ lastSeenAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
});

/** Sổ bận rộn nhất — "app đang được dùng ở đâu". */
export const getTopGroups = cache(async (limit = 10) => {
  await requireAdmin();
  return prisma.group.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { transactions: true, members: true, loans: true } },
    },
    orderBy: { transactions: { _count: "desc" } },
    take: limit,
  });
});

/* ─── Tăng trưởng & việc cần xử lý (cho trang Tổng quan) ─────────────────── */

/** Tỉ lệ thay đổi so với kỳ trước; null khi kỳ trước bằng 0 (không chia được). */
function change(now: number, before: number): number | null {
  return before > 0 ? (now - before) / before : null;
}

/**
 * Số liệu "so với kỳ trước" cho hàng KPI.
 *
 * Tổng người dùng / sổ / khoản ghi: so với chính tổng đó 30 ngày trước (đếm
 * theo `createdAt`). Người có ghi chép: 7 ngày qua so với 7 ngày trước nữa.
 * DAU/WAU/MAU thì KHÔNG có kỳ trước — `lastSeenAt` chỉ giữ lần mở cuối, nên
 * không dựng lại được ai đã mở app vào tuần trước.
 */
export const getGrowth = cache(async () => {
  await requireAdmin();
  const c30 = cutoff(30);
  const c60 = cutoff(60);
  const [users, usersBefore, newUsersPrev, groups, groupsBefore, txs, txsBefore, writerRows] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { lt: c30 } } }),
      prisma.user.count({ where: { createdAt: { gte: c60, lt: c30 } } }),
      prisma.group.count(),
      prisma.group.count({ where: { createdAt: { lt: c30 } } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { createdAt: { lt: c30 } } }),
      prisma.$queryRaw<{ cur: bigint; prev: bigint }[]>`
        WITH acts AS (
          SELECT "createdById" AS uid, "createdAt" AS at FROM "Transaction" WHERE "createdAt" > now() - interval '14 days'
          UNION ALL
          SELECT "createdById", "createdAt" FROM "Loan"        WHERE "createdAt" > now() - interval '14 days'
          UNION ALL
          SELECT "createdById", "createdAt" FROM "LoanPayment" WHERE "createdAt" > now() - interval '14 days'
          UNION ALL
          SELECT "createdById", "createdAt" FROM "Settlement"  WHERE "createdAt" > now() - interval '14 days'
        )
        SELECT
          COUNT(DISTINCT uid) FILTER (WHERE at >  now() - interval '7 days') AS cur,
          COUNT(DISTINCT uid) FILTER (WHERE at <= now() - interval '7 days') AS prev
        FROM acts`,
    ]);
  const w = writerRows[0];
  const writers7 = num(w?.cur ?? 0);
  const writersPrev7 = num(w?.prev ?? 0);
  const newUsers = users - usersBefore;

  return {
    users: { value: users, added: newUsers, delta: change(users, usersBefore) },
    newUsers: { value: newUsers, delta: change(newUsers, newUsersPrev) },
    groups: { value: groups, added: groups - groupsBefore, delta: change(groups, groupsBefore) },
    transactions: { value: txs, added: txs - txsBefore, delta: change(txs, txsBefore) },
    writers7: { value: writers7, prev: writersPrev7, delta: change(writers7, writersPrev7) },
  };
});

/**
 * Những thứ người vận hành nên nhìn tới — CHỈ những gì dữ liệu nói được thật.
 * Mỗi mục kèm đường dẫn tới đúng danh sách đã lọc sẵn.
 */
export const getAttention = cache(async () => {
  await requireAdmin();
  const [locked, ownerLockedGroups, staleJoinRequests, inactive, migrations] = await Promise.all([
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    // Sổ đứng tên một người đã bị khoá: sổ không có chủ dùng được, cần giao lại.
    prisma.group.count({ where: { owner: { disabledAt: { not: null } } } }),
    prisma.groupJoinRequest.count({ where: { status: "PENDING", createdAt: { lt: cutoff(7) } } }),
    // Chỉ đếm người ĐÃ được ghi nhận và hơn 30 ngày không vào — null là "chưa
    // ghi nhận", không phải "bỏ app".
    prisma.user.count({ where: { disabledAt: null, lastSeenAt: { lt: cutoff(30) } } }),
    getMigrationStatus(),
  ]);
  const brokenMigrations = migrations.ok
    ? migrations.rows.filter((m) => !m.finishedAt && !m.rolledBackAt).length
    : 1;
  return { locked, ownerLockedGroups, staleJoinRequests, inactive, brokenMigrations };
});

/** Người vừa tạo tài khoản. */
export const getRecentSignups = cache(async (limit = 8) => {
  await requireAdmin();
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      disabledAt: true,
      isAdmin: true,
      _count: { select: { transactions: true, memberships: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
  });
});

/* ─── Tham số danh sách (sắp xếp · lọc · trang) ──────────────────────────── */

export type SortDir = "asc" | "desc";

/**
 * Đọc `?sort=&dir=&page=` từ URL. Giá trị lạ bị bỏ về mặc định chứ không tin:
 * URL là đầu vào của người dùng, và sort key đi thẳng vào `orderBy`.
 */
function parseList<K extends string, F extends string>(
  sp: Record<string, string | string[] | undefined>,
  sorts: readonly K[],
  defSort: K,
  filters: readonly F[],
  defFilter: F,
) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sortRaw = one(sp.sort);
  const sort = (sorts as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as K) : defSort;
  const dirRaw = one(sp.dir);
  const dir: SortDir | undefined = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : undefined;
  const filterRaw = one(sp.status);
  const status = (filters as readonly string[]).includes(filterRaw ?? "") ? (filterRaw as F) : defFilter;
  // Số trang gõ tay: kẹp về 1 thay vì tin, để `?page=-3` hay `?page=abc` không
  // thành `skip` âm (Prisma ném lỗi).
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);
  const q = one(sp.q)?.trim() || undefined;
  return { sort, dir, status, page, q };
}

/* ─── Danh sách người dùng ───────────────────────────────────────────────── */

export const USER_SORTS = ["name", "lastSeen", "transactions", "books", "joined"] as const;
export type UserSort = (typeof USER_SORTS)[number];
export const USER_FILTERS = ["all", "active", "locked", "admin", "inactive"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

/** Chiều mặc định khi bấm một cột lần đầu: chữ A→Z, số và ngày lớn/mới trước. */
export const USER_SORT_DEFAULT_DIR: Record<UserSort, SortDir> = {
  name: "asc",
  lastSeen: "desc",
  transactions: "desc",
  books: "desc",
  joined: "desc",
};

export function parseUserListParams(sp: Record<string, string | string[] | undefined>) {
  const p = parseList(sp, USER_SORTS, "joined", USER_FILTERS, "all");
  return { ...p, dir: p.dir ?? USER_SORT_DEFAULT_DIR[p.sort] };
}

/**
 * Phân trang bằng offset chứ không phải con trỏ: danh sách này chỉ quản trị
 * viên xem, và offset cho được TỔNG SỐ — thứ con trỏ không cho. Luôn có `id`
 * làm khoá phụ để hai hàng bằng nhau không đổi chỗ giữa các trang.
 */
export async function listAdminUsers({
  q,
  page,
  sort = "joined",
  dir = "desc",
  status = "all",
}: {
  q?: string;
  page: number;
  sort?: UserSort;
  dir?: SortDir;
  status?: UserFilter;
}) {
  await requireAdmin();
  // `mode: "insensitive"` dịch ra `ILIKE %q%` → quét bảng. Chấp nhận được ở quy
  // mô hiện tại; nếu sau này chậm thì thêm index trigram (một migration riêng).
  const search = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const filter =
    status === "active"
      ? { disabledAt: null }
      : status === "locked"
        ? { disabledAt: { not: null } }
        : status === "admin"
          ? { isAdmin: true }
          : status === "inactive"
            ? { disabledAt: null, lastSeenAt: { lt: cutoff(30) } }
            : {};
  const where = { AND: [search, filter] };

  const orderBy =
    sort === "name"
      ? { name: { sort: dir, nulls: "last" as const } }
      : sort === "lastSeen"
        ? { lastSeenAt: { sort: dir, nulls: "last" as const } }
        : sort === "transactions"
          ? { transactions: { _count: dir } }
          : sort === "books"
            ? { memberships: { _count: dir } }
            : { createdAt: dir };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        disabledAt: true,
        lastSeenAt: true,
        createdAt: true,
        // `transactions` là quan hệ "TransactionCreator" → đếm khoản họ GHI,
        // đúng thứ cần. `paidTransactions` mới là khoản họ bỏ tiền ra.
        _count: { select: { transactions: true, memberships: true, ownedGroups: true, loans: true } },
      },
      orderBy: [orderBy, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

/** Số người ở mỗi chip lọc (không tính chữ đang tìm). */
export const getUserFilterCounts = cache(async (): Promise<Record<UserFilter, number>> => {
  await requireAdmin();
  const [all, active, locked, admin, inactive] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { disabledAt: null } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { disabledAt: null, lastSeenAt: { lt: cutoff(30) } } }),
  ]);
  return { all, active, locked, admin, inactive };
});

export async function getAdminUserDetail(id: string) {
  await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isAdmin: true,
      disabledAt: true,
      lastSeenAt: true,
      createdAt: true,
      emailVerified: true,
      _count: {
        select: {
          transactions: true,
          paidTransactions: true,
          loans: true,
          loanPayments: true,
          settlementsCreated: true,
          memberships: true,
          ownedGroups: true,
          pushSubscriptions: true,
          notifications: true,
        },
      },
      memberships: {
        select: {
          role: true,
          joinedAt: true,
          group: {
            select: { id: true, name: true, ownerId: true, _count: { select: { members: true } } },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!user) return null;

  const recentTransactions = await prisma.transaction.findMany({
    where: { createdById: id },
    select: {
      id: true,
      type: true,
      amount: true,
      amountUnknown: true,
      date: true,
      note: true,
      createdAt: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Vì sao không có nút "Xoá tài khoản": bốn khoá ngoại createdById là RESTRICT,
  // còn Group.ownerId là CASCADE. Con số này được hiện thẳng trên trang chi tiết
  // để chuyện đó minh bạch, chứ không phải một tính năng bị quên.
  const blockers = {
    authored:
      user._count.transactions +
      user._count.loans +
      user._count.loanPayments +
      user._count.settlementsCreated,
    ownedSharedGroups: user.memberships.filter(
      (m) => m.group.ownerId === id && m.group._count.members > 1,
    ).length,
  };

  return { user, recentTransactions, blockers };
}

/* ─── Danh sách sổ ───────────────────────────────────────────────────────── */

export const GROUP_SORTS = ["name", "members", "transactions", "loans", "created"] as const;
export type GroupSort = (typeof GROUP_SORTS)[number];
export const GROUP_FILTERS = ["all", "shared", "solo", "ownerLocked"] as const;
export type GroupFilter = (typeof GROUP_FILTERS)[number];

export const GROUP_SORT_DEFAULT_DIR: Record<GroupSort, SortDir> = {
  name: "asc",
  members: "desc",
  transactions: "desc",
  loans: "desc",
  created: "desc",
};

export function parseGroupListParams(sp: Record<string, string | string[] | undefined>) {
  const p = parseList(sp, GROUP_SORTS, "created", GROUP_FILTERS, "all");
  return { ...p, dir: p.dir ?? GROUP_SORT_DEFAULT_DIR[p.sort] };
}

/** "Sổ chung" = có ít nhất một người ngoài người lập (cùng định nghĩa với Tổng quan). */
const SHARED = { members: { some: { role: { in: ["ADMIN", "MEMBER"] } } } };

export async function listAdminGroups({
  q,
  page,
  sort = "created",
  dir = "desc",
  status = "all",
}: {
  q?: string;
  page: number;
  sort?: GroupSort;
  dir?: SortDir;
  status?: GroupFilter;
}) {
  await requireAdmin();
  const search = q ? { name: { contains: q, mode: "insensitive" as const } } : {};
  const filter =
    status === "shared"
      ? SHARED
      : status === "solo"
        ? { members: { none: { role: { in: ["ADMIN", "MEMBER"] } } } }
        : status === "ownerLocked"
          ? { owner: { disabledAt: { not: null } } }
          : {};
  const where = { AND: [search, filter] };

  const orderBy =
    sort === "name"
      ? { name: dir }
      : sort === "members"
        ? { members: { _count: dir } }
        : sort === "transactions"
          ? { transactions: { _count: dir } }
          : sort === "loans"
            ? { loans: { _count: dir } }
            : { createdAt: dir };

  const [items, total] = await prisma.$transaction([
    prisma.group.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true, disabledAt: true } },
        _count: { select: { members: true, transactions: true, loans: true, settlements: true } },
      },
      orderBy: [orderBy, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.group.count({ where }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

/** Số sổ ở mỗi chip lọc (không tính chữ đang tìm). */
export const getGroupFilterCounts = cache(async (): Promise<Record<GroupFilter, number>> => {
  await requireAdmin();
  const [all, shared, solo, ownerLocked] = await prisma.$transaction([
    prisma.group.count(),
    prisma.group.count({ where: SHARED }),
    prisma.group.count({ where: { members: { none: { role: { in: ["ADMIN", "MEMBER"] } } } } }),
    prisma.group.count({ where: { owner: { disabledAt: { not: null } } } }),
  ]);
  return { all, shared, solo, ownerLocked };
});

export async function getAdminGroupDetail(id: string) {
  await requireAdmin();
  const group = await prisma.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      ownerId: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
      _count: {
        select: {
          members: true,
          transactions: true,
          loans: true,
          settlements: true,
          categories: true,
          invites: true,
          joinRequests: true,
        },
      },
      members: {
        select: {
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              disabledAt: true,
              lastSeenAt: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  });
  if (!group) return null;

  const [income, expense, lastTransaction, recentTransactions] = await Promise.all([
    prisma.transaction.aggregate({
      where: { groupId: id, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { groupId: id, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.transaction.findFirst({
      where: { groupId: id },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { groupId: id },
      select: {
        id: true,
        type: true,
        amount: true,
        amountUnknown: true,
        date: true,
        note: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    group,
    recentTransactions,
    totalIncome: income._sum.amount ?? 0,
    totalExpense: expense._sum.amount ?? 0,
    lastActivityAt: lastTransaction?.createdAt ?? null,
  };
}

/* ─── Sức khoẻ hệ thống ──────────────────────────────────────────────────── */

export type MigrationRow = {
  name: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
  appliedSteps: number;
};

/**
 * Trạng thái migration, đọc thẳng `_prisma_migrations`.
 *
 * Đây đúng là bảng mà AGENTS.md bảo mở ra xem `applied_steps_count` khi một lần
 * `migrate deploy` fail trên prod — bằng 0 nghĩa là chưa apply gì và có thể
 * `migrate resolve --rolled-back`, lớn hơn 0 nghĩa là DB đã bị sửa một phần và
 * phải hoàn tác tay. Hiện nó ở đây để không phải SSH vào mới biết.
 */
export async function getMigrationStatus(): Promise<
  { ok: true; rows: MigrationRow[] } | { ok: false; error: string }
> {
  await requireAdmin();
  try {
    const rows = await prisma.$queryRaw<
      {
        migration_name: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
        applied_steps_count: number;
      }[]
    >`SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
      FROM "_prisma_migrations" ORDER BY started_at ASC`;
    return {
      ok: true,
      rows: rows.map((r) => ({
        name: r.migration_name,
        finishedAt: r.finished_at,
        rolledBackAt: r.rolled_back_at,
        appliedSteps: num(r.applied_steps_count),
      })),
    };
  } catch (e) {
    // Bảng không tồn tại trên một DB chưa bao giờ chạy migration qua Prisma.
    // Hiện một câu, đừng để cả trang thành 500.
    return { ok: false, error: (e as Error).message };
  }
}

export async function getSystemHealth() {
  await requireAdmin();
  const [migrations, pushDevices, pushPeople, notifications, unread, dbVersion] = await Promise.all([
    getMigrationStatus(),
    prisma.pushSubscription.count(),
    prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.notification.count(),
    prisma.notification.count({ where: { readAt: null } }),
    prisma
      .$queryRaw<{ version: string }[]>`SELECT version()`
      .then((r) => r[0]?.version ?? null)
      .catch(() => null),
  ]);

  return {
    migrations,
    pushDevices,
    pushPeople: pushPeople.length,
    notifications,
    unreadNotifications: unread,
    dbVersion,
  };
}
