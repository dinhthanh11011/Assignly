/**
 * Cân đối chi tiêu giữa các thành viên của một sổ.
 *
 * Ý tưởng: mỗi giao dịch có một người *bỏ tiền* (`payerId`) và một tập *người
 * chịu* (splits). Chênh lệch của một người = số họ đã bỏ ra − phần họ phải chịu.
 * Ai dương thì đang bị nhóm nợ, ai âm thì đang nợ nhóm; tổng chênh lệch của cả
 * sổ luôn bằng 0.
 *
 * Khoản thu (INCOME) được xử lý đối xứng với khoản chi: người "bỏ tiền" là người
 * *nhận* tiền về và đang giữ nó, nên tiền đó là một khoản nợ với nhóm — vì vậy
 * mọi con số của INCOME chỉ là EXPENSE đổi dấu.
 *
 * Toàn bộ hàm ở đây là hàm thuần (không chạm DB) và làm việc trên số nguyên đồng
 * để tổng các phần luôn khớp tuyệt đối với số tiền giao dịch.
 */

export type SplitRow = {
  userId: string;
  /** Trọng số chia phần còn lại. Chỉ dùng khi `amount` là null. */
  weight: number;
  /** Số tiền cố định của người này; null = chia theo `weight`. */
  amount: number | null;
};

export type BalanceTransaction = {
  type: "INCOME" | "EXPENSE";
  amount: number;
  payerId: string;
  splits: SplitRow[];
};

export type BalanceSettlement = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export type MemberBalance = {
  userId: string;
  /** Tiền đã bỏ ra cho các khoản chi. */
  paid: number;
  /** Phần phải chịu của các khoản chi. */
  share: number;
  /** Tiền thu về mà người này đang giữ. */
  received: number;
  /** Phần được hưởng của các khoản thu. */
  receivedShare: number;
  /** Đã chuyển cho người khác để cân bằng. */
  settledOut: number;
  /** Đã nhận từ người khác. */
  settledIn: number;
  /** > 0: nhóm còn nợ người này. < 0: người này còn nợ nhóm. */
  net: number;
};

export type Transfer = { fromUserId: string; toUserId: string; amount: number };

/** Dưới ngưỡng này thì coi như đã cân bằng — tránh đề xuất chuyển vài đồng lẻ. */
export const SETTLE_EPSILON = 1;

/**
 * Chia `total` theo `weights` thành các số nguyên có tổng đúng bằng
 * `Math.round(total)`. Phần lẻ được dồn cho các suất có phần thập phân lớn nhất
 * (largest remainder) nên không ai bị thiệt quá 1 đồng.
 */
function allocate(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const target = Math.max(0, Math.round(total));
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  // Không có trọng số dương nào → chia đều cho tất cả.
  const w = sum > 0 ? weights.map((x) => Math.max(0, x)) : weights.map(() => 1);
  const wSum = sum > 0 ? sum : weights.length;

  const raw = w.map((x) => (target * x) / wSum);
  const out = raw.map((x) => Math.floor(x));
  let left = target - out.reduce((s, x) => s + x, 0);

  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length].i] += 1;

  return out;
}

/**
 * Phần mỗi người phải chịu trong một giao dịch, tính bằng số nguyên đồng và có
 * tổng đúng bằng số tiền giao dịch.
 *
 * `memberIds` là thành viên hiện tại của sổ, dùng làm mức chia đều mặc định cho
 * các giao dịch chưa có dòng split nào (dữ liệu tạo trước khi có tính năng này).
 */
export function splitShares(tx: BalanceTransaction, memberIds: string[]): Map<string, number> {
  const rows: SplitRow[] =
    tx.splits.length > 0
      ? tx.splits
      : memberIds.map((userId) => ({ userId, weight: 1, amount: null }));

  const out = new Map<string, number>();
  if (rows.length === 0) return out;

  const fixed = rows.filter((r) => r.amount != null);
  const flexible = rows.filter((r) => r.amount == null);
  const fixedTotal = fixed.reduce((s, r) => s + Math.max(0, r.amount!), 0);

  // Không còn gì để chia theo trọng số (hoặc các suất cố định đã ngốn hết tiền):
  // rải toàn bộ số tiền theo tỷ lệ các suất cố định để tổng vẫn khớp.
  if (fixed.length > 0 && (flexible.length === 0 || fixedTotal >= Math.round(tx.amount))) {
    const parts = allocate(
      tx.amount,
      fixed.map((r) => Math.max(0, r.amount!))
    );
    fixed.forEach((r, i) => out.set(r.userId, parts[i]));
    for (const r of flexible) out.set(r.userId, 0);
    return out;
  }

  for (const r of fixed) out.set(r.userId, Math.round(Math.max(0, r.amount!)));
  const rest = Math.round(tx.amount) - [...out.values()].reduce((s, v) => s + v, 0);
  const parts = allocate(
    rest,
    flexible.map((r) => r.weight)
  );
  flexible.forEach((r, i) => out.set(r.userId, parts[i]));
  return out;
}

const EMPTY: Omit<MemberBalance, "userId"> = {
  paid: 0,
  share: 0,
  received: 0,
  receivedShare: 0,
  settledOut: 0,
  settledIn: 0,
  net: 0,
};

/**
 * Chênh lệch của từng người trong sổ.
 *
 * Kết quả gồm cả người đã rời sổ nhưng còn dính số dư (họ vẫn xuất hiện trong
 * giao dịch cũ), xếp trước là thành viên hiện tại theo thứ tự `memberIds`.
 */
export function computeBalances({
  memberIds,
  transactions,
  settlements,
}: {
  memberIds: string[];
  transactions: BalanceTransaction[];
  settlements: BalanceSettlement[];
}): MemberBalance[] {
  const rows = new Map<string, MemberBalance>();
  const row = (userId: string) => {
    let r = rows.get(userId);
    if (!r) {
      r = { userId, ...EMPTY };
      rows.set(userId, r);
    }
    return r;
  };
  // Thành viên hiện tại luôn có mặt (kể cả khi chưa phát sinh gì) và đứng trước.
  for (const id of memberIds) row(id);

  for (const tx of transactions) {
    const total = Math.round(tx.amount);
    if (total <= 0) continue;
    const shares = splitShares(tx, memberIds);
    const payer = row(tx.payerId);

    if (tx.type === "EXPENSE") {
      payer.paid += total;
      payer.net += total;
      for (const [userId, amount] of shares) {
        const r = row(userId);
        r.share += amount;
        r.net -= amount;
      }
    } else {
      // Người nhận tiền đang giữ hộ nhóm → ghi nợ họ, ghi có cho người được hưởng.
      payer.received += total;
      payer.net -= total;
      for (const [userId, amount] of shares) {
        const r = row(userId);
        r.receivedShare += amount;
        r.net += amount;
      }
    }
  }

  for (const s of settlements) {
    const amount = Math.round(s.amount);
    if (amount <= 0 || s.fromUserId === s.toUserId) continue;
    const from = row(s.fromUserId);
    const to = row(s.toUserId);
    from.settledOut += amount;
    from.net += amount;
    to.settledIn += amount;
    to.net -= amount;
  }

  const order = new Map(memberIds.map((id, i) => [id, i]));
  return [...rows.values()].sort((a, b) => {
    const ai = order.get(a.userId) ?? Number.MAX_SAFE_INTEGER;
    const bi = order.get(b.userId) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi || a.userId.localeCompare(b.userId);
  });
}

/**
 * Danh sách chuyển tiền để mọi người về 0: ghép người nợ nhiều nhất với người
 * được nợ nhiều nhất. Cho ra tối đa `n − 1` lượt chuyển — đủ ít để làm tay.
 */
export function suggestTransfers(
  balances: { userId: string; net: number }[],
  epsilon = SETTLE_EPSILON
): Transfer[] {
  const byNetDesc = (a: { userId: string; net: number }, b: { userId: string; net: number }) =>
    b.net - a.net || a.userId.localeCompare(b.userId);

  const creditors = balances
    .filter((b) => b.net >= epsilon)
    .map((b) => ({ userId: b.userId, net: b.net }))
    .sort(byNetDesc);
  const debtors = balances
    .filter((b) => b.net <= -epsilon)
    .map((b) => ({ userId: b.userId, net: -b.net }))
    .sort(byNetDesc);

  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].net, creditors[j].net);
    out.push({
      fromUserId: debtors[i].userId,
      toUserId: creditors[j].userId,
      amount: Math.round(amount),
    });
    debtors[i].net -= amount;
    creditors[j].net -= amount;
    if (debtors[i].net < epsilon) i++;
    if (creditors[j].net < epsilon) j++;
  }
  return out;
}
