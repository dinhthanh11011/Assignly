import { allocate } from "@/lib/balance";
import { formatMoney } from "@/lib/utils";

/**
 * Chia một hoá đơn đi ăn: mỗi người gọi món riêng, cộng món chung / ship, trừ
 * mã giảm giá, cộng phí dịch vụ và VAT — rồi ra số mỗi người phải trả.
 *
 * Hàm thuần, không đụng DB: tiện ích này chỉ tính và chia sẻ kết quả.
 *
 * Thứ tự tính theo cách nhà hàng ở VN hay làm trên hoá đơn:
 *   tiền món → trừ giảm giá → + phí dịch vụ (trên phần sau giảm)
 *   → + VAT (trên phần sau giảm + phí dịch vụ).
 * Phí dịch vụ và VAT được tính MỘT LẦN trên cả hoá đơn rồi mới chia cho từng
 * người — tính riêng từng người rồi cộng lại có thể lệch vài đồng so với số in
 * trên hoá đơn.
 *
 * BẤT BIẾN: mọi phép chia đi qua `allocate` (largest remainder) nên tổng các
 * phần luôn khớp đúng từng đồng với con số tổng; Σpay luôn bằng tổng hoá đơn.
 */

export type BillPerson = { id: string; name: string; items: number[] };

export type SharedItem = {
  id: string;
  label: string;
  amount: number;
  /** Những người cùng chịu khoản này; "all" (hoặc danh sách rỗng) là tất cả. */
  among: string[] | "all";
};

export type DiscountKind = "AMOUNT" | "PERCENT";
/** PROPORTIONAL: ai gọi nhiều được giảm nhiều. EQUAL: mỗi người giảm như nhau. */
export type DiscountAllocation = "PROPORTIONAL" | "EQUAL";

export type Discount = {
  id: string;
  kind: DiscountKind;
  /** Số tiền (AMOUNT) hoặc phần trăm (PERCENT). */
  value: number;
  /** Mức giảm tối đa, chỉ có nghĩa với PERCENT ("giảm 20%, tối đa 50k"). */
  cap?: number | null;
  allocation: DiscountAllocation;
};

export type BillInput = {
  people: BillPerson[];
  shared: SharedItem[];
  discounts: Discount[];
  servicePct: number;
  vatPct: number;
  /** 0 = không làm tròn; 1000 = làm tròn số phải trả tới nghìn đồng. */
  rounding: 0 | 1000;
  /** Người cầm hoá đơn đi trả — gánh phần chênh do làm tròn. */
  payerId: string | null;
};

export type PersonResult = {
  id: string;
  /** Tiền món riêng. */
  own: number;
  /** Phần món chung / ship. */
  shared: number;
  /** Tổng được giảm (số dương). */
  discount: number;
  service: number;
  vat: number;
  /** Phần đúng của người này, chưa làm tròn. */
  total: number;
  /** Số thật sự phải trả (đã làm tròn nếu bật). */
  pay: number;
  /** pay − total. */
  roundingDelta: number;
};

export type DiscountResult = { id: string; amount: number; capped: boolean };

export type BillResult = {
  people: PersonResult[];
  discounts: DiscountResult[];
  subtotal: number;
  discount: number;
  service: number;
  vat: number;
  total: number;
  payerId: string | null;
};

const sumOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const money = (x: number) => Math.max(0, Math.round(Number.isFinite(x) ? x : 0));
const pct = (x: number) => Math.max(0, Number.isFinite(x) ? x : 0);

/**
 * Chia `total` theo `weights` nhưng không ai nhận quá `caps[i]`. Phần bị chặn
 * dồn sang những người còn chỗ, lặp tới khi chia hết hoặc mọi người đã đầy.
 */
export function allocateCapped(total: number, weights: number[], caps: number[]): number[] {
  const out = caps.map(() => 0);
  let left = Math.min(money(total), sumOf(caps));
  while (left > 0) {
    const open = caps.map((c, i) => i).filter((i) => out[i] < caps[i]);
    if (open.length === 0) break;
    const parts = allocate(left, open.map((i) => weights[i]));
    open.forEach((i, k) => {
      const give = Math.min(parts[k], caps[i] - out[i]);
      out[i] += give;
      left -= give;
    });
  }
  return out;
}

export function computeBill(input: BillInput): BillResult {
  const { people } = input;
  const n = people.length;
  const zeros = () => people.map(() => 0);

  const own = people.map((p) => sumOf(p.items.map(money)));

  const shared = zeros();
  for (const item of input.shared) {
    const ids = item.among === "all" ? [] : item.among;
    let idx = people.map((p, i) => (ids.includes(p.id) ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) idx = people.map((_, i) => i);
    if (idx.length === 0) continue;
    allocate(money(item.amount), idx.map(() => 1)).forEach((v, k) => (shared[idx[k]] += v));
  }

  const subtotalEach = own.map((v, i) => v + shared[i]);
  const remaining = [...subtotalEach];
  const discount = zeros();
  const discounts: DiscountResult[] = [];

  for (const d of input.discounts) {
    const base = sumOf(remaining);
    let amount: number;
    let capped = false;
    if (d.kind === "PERCENT") {
      amount = Math.round((base * Math.min(100, pct(d.value))) / 100);
      const cap = d.cap ? money(d.cap) : 0;
      if (cap > 0 && amount > cap) {
        amount = cap;
        capped = true;
      }
    } else {
      amount = money(d.value);
    }
    amount = Math.min(amount, base);
    const weights = d.allocation === "EQUAL" ? remaining.map(() => 1) : remaining;
    const parts = n > 0 ? allocateCapped(amount, weights, remaining) : [];
    parts.forEach((v, i) => {
      discount[i] += v;
      remaining[i] -= v;
    });
    discounts.push({ id: d.id, amount: sumOf(parts), capped });
  }

  const afterDiscount = sumOf(remaining);
  const serviceTotal = Math.round((afterDiscount * pct(input.servicePct)) / 100);
  const service = n > 0 ? allocate(serviceTotal, remaining) : [];
  const beforeVat = remaining.map((v, i) => v + service[i]);
  const vatTotal = Math.round((sumOf(beforeVat) * pct(input.vatPct)) / 100);
  const vat = n > 0 ? allocate(vatTotal, beforeVat) : [];
  const total = beforeVat.map((v, i) => v + vat[i]);

  const payerIdx = Math.max(0, people.findIndex((p) => p.id === input.payerId));
  const pay = [...total];
  if (input.rounding > 0 && n > 1) {
    const unit = input.rounding;
    for (let i = 0; i < n; i++) if (i !== payerIdx) pay[i] = Math.round(total[i] / unit) * unit;
    pay[payerIdx] = sumOf(total) - sumOf(pay.filter((_, i) => i !== payerIdx));
  }

  return {
    people: people.map((p, i) => ({
      id: p.id,
      own: own[i],
      shared: shared[i],
      discount: discount[i],
      service: service[i] ?? 0,
      vat: vat[i] ?? 0,
      total: total[i],
      pay: pay[i],
      roundingDelta: pay[i] - total[i],
    })),
    discounts,
    subtotal: sumOf(subtotalEach),
    discount: sumOf(discount),
    service: serviceTotal,
    vat: vatTotal,
    total: sumOf(total),
    payerId: n > 0 ? people[payerIdx].id : null,
  };
}

/** Tên hiển thị — người chưa gõ tên thì gọi theo thứ tự. */
export function billPersonName(people: BillPerson[], id: string) {
  const i = people.findIndex((p) => p.id === id);
  return people[i]?.name.trim() || `Người ${i + 1}`;
}

/** Đoạn văn bản thuần để dán vào nhóm chat. */
export function formatBillShare(input: BillInput, result: BillResult): string {
  const head = [`Hoá đơn ${formatMoney(result.total)}`];
  const extras: string[] = [];
  if (result.discount > 0) extras.push(`giảm ${formatMoney(result.discount)}`);
  if (result.service > 0) extras.push(`phí DV ${formatMoney(result.service)}`);
  if (result.vat > 0) extras.push(`VAT ${formatMoney(result.vat)}`);
  if (extras.length) head.push(`(${extras.join(", ")})`);

  const lines = result.people.map((r) => {
    const name = billPersonName(input.people, r.id);
    const note = r.discount > 0 ? ` (giảm ${formatMoney(r.discount)})` : "";
    const payer = r.id === result.payerId && input.people.length > 1 ? " — người trả" : "";
    return `• ${name}: ${formatMoney(r.pay)}${note}${payer}`;
  });

  const out = [head.join(" "), ...lines];
  if (result.payerId && input.people.length > 1) {
    out.push(`Chuyển cho ${billPersonName(input.people, result.payerId)}`);
  }
  return out.join("\n");
}
