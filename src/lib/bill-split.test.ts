import { describe, expect, it } from "vitest";
import {
  allocateCapped,
  computeBill,
  formatBillShare,
  type BillInput,
  type Discount,
} from "@/lib/bill-split";

/**
 * Test cho tiện ích chia hoá đơn. Bất biến kiểm ở hầu hết các ca: tổng phần của
 * từng người khớp đúng từng đồng với hoá đơn, và tổng giảm khớp mã giảm.
 */

const people = (...amounts: number[][]) =>
  amounts.map((items, i) => ({ id: `p${i}`, name: `P${i}`, items }));

const bill = (o: Partial<BillInput> & Pick<BillInput, "people">): BillInput => ({
  shared: [],
  discounts: [],
  servicePct: 0,
  vatPct: 0,
  rounding: 0,
  payerId: null,
  ...o,
});

const off = (value: number, o: Partial<Discount> = {}): Discount => ({
  id: "d",
  kind: "AMOUNT",
  value,
  allocation: "PROPORTIONAL",
  ...o,
});

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

// 10 người, 10 món khác nhau — tổng 1.000.000 ₫.
const TEN = people(
  [45_000], [55_000], [60_000], [75_000], [80_000],
  [95_000], [110_000], [120_000], [160_000], [200_000],
);

describe("computeBill — 10 người gọi 10 món, giảm 50k", () => {
  it("theo tỉ lệ món: ai gọi đắt được giảm nhiều hơn", () => {
    const r = computeBill(bill({ people: TEN, discounts: [off(50_000)] }));
    expect(r.subtotal).toBe(1_000_000);
    expect(r.discount).toBe(50_000);
    expect(sum(r.people.map((p) => p.discount))).toBe(50_000);
    // 200k / 1tr × 50k = 10k; 45k / 1tr × 50k = 2.250
    expect(r.people[9].discount).toBe(10_000);
    expect(r.people[0].discount).toBe(2_250);
    expect(r.people[9].pay).toBe(190_000);
    expect(r.total).toBe(950_000);
    expect(sum(r.people.map((p) => p.pay))).toBe(950_000);
  });

  it("chia đều: mỗi người giảm 5k bất kể gọi gì", () => {
    const r = computeBill(bill({ people: TEN, discounts: [off(50_000, { allocation: "EQUAL" })] }));
    expect(r.people.map((p) => p.discount)).toEqual(Array(10).fill(5_000));
    expect(r.people[0].pay).toBe(40_000);
    expect(sum(r.people.map((p) => p.pay))).toBe(950_000);
  });
});

describe("computeBill — giảm giá", () => {
  it("giảm % bị chặn ở mức tối đa", () => {
    const r = computeBill(
      bill({ people: TEN, discounts: [off(20, { kind: "PERCENT", cap: 50_000 })] }),
    );
    expect(r.discounts[0]).toEqual({ id: "d", amount: 50_000, capped: true });
    expect(r.discount).toBe(50_000);
  });

  it("giảm % chưa chạm trần thì giữ đúng %", () => {
    const r = computeBill(
      bill({ people: people([100_000], [100_000]), discounts: [off(10, { kind: "PERCENT", cap: 50_000 })] }),
    );
    expect(r.discounts[0]).toEqual({ id: "d", amount: 20_000, capped: false });
    expect(r.people.map((p) => p.discount)).toEqual([10_000, 10_000]);
  });

  it("chia đều nhưng không ai được giảm quá tiền món của mình", () => {
    // Giảm 60k chia đều 3 người → 20k/người, nhưng P0 chỉ gọi ly trà đá 5k.
    const r = computeBill(
      bill({ people: people([5_000], [100_000], [100_000]), discounts: [off(60_000, { allocation: "EQUAL" })] }),
    );
    expect(r.people.map((p) => p.discount)).toEqual([5_000, 27_500, 27_500]);
    expect(r.people[0].pay).toBe(0);
    expect(r.discount).toBe(60_000);
  });

  it("giảm lớn hơn hoá đơn: không ai bị âm", () => {
    const r = computeBill(bill({ people: people([30_000], [20_000]), discounts: [off(100_000)] }));
    expect(r.discount).toBe(50_000);
    expect(r.people.map((p) => p.pay)).toEqual([0, 0]);
    expect(r.total).toBe(0);
  });

  it("hai mã giảm áp nối tiếp: % tính trên phần còn lại", () => {
    const r = computeBill(
      bill({
        people: people([100_000], [100_000]),
        discounts: [off(50_000, { id: "a" }), off(10, { id: "b", kind: "PERCENT" })],
      }),
    );
    expect(r.discounts.map((d) => d.amount)).toEqual([50_000, 15_000]);
    expect(r.total).toBe(135_000);
  });
});

describe("computeBill — món chung, phí, VAT", () => {
  it("ship chia đều cho tất cả, món chung chỉ chia cho vài người", () => {
    const r = computeBill(
      bill({
        people: people([50_000], [50_000], [50_000]),
        shared: [
          { id: "ship", label: "Ship", amount: 30_000, among: "all" },
          { id: "lau", label: "Lẩu", amount: 100_000, among: ["p0", "p1"] },
        ],
      }),
    );
    expect(r.people.map((p) => p.shared)).toEqual([60_000, 60_000, 10_000]);
    expect(r.subtotal).toBe(280_000);
    expect(r.total).toBe(280_000);
  });

  it("phí dịch vụ tính trên phần sau giảm, VAT tính trên cả phí dịch vụ", () => {
    const r = computeBill(
      bill({ people: people([600_000], [400_000]), discounts: [off(100_000)], servicePct: 5, vatPct: 8 }),
    );
    // 1tr − 100k = 900k; DV 5% = 45k; VAT 8% × 945k = 75.600
    expect(r.service).toBe(45_000);
    expect(r.vat).toBe(75_600);
    expect(r.total).toBe(1_020_600);
    expect(sum(r.people.map((p) => p.total))).toBe(r.total);
    expect(sum(r.people.map((p) => p.service))).toBe(r.service);
    expect(sum(r.people.map((p) => p.vat))).toBe(r.vat);
  });
});

describe("computeBill — làm tròn 1.000đ", () => {
  it("người không trả hoá đơn trả số chẵn nghìn, người trả gánh phần lẻ", () => {
    const r = computeBill(
      bill({ people: TEN, discounts: [off(50_000)], vatPct: 8, rounding: 1000, payerId: "p3" }),
    );
    for (const p of r.people) if (p.id !== "p3") expect(p.pay % 1000).toBe(0);
    expect(sum(r.people.map((p) => p.pay))).toBe(r.total);
    expect(sum(r.people.map((p) => p.roundingDelta))).toBe(0);
    expect(r.payerId).toBe("p3");
  });

  it("chưa chọn người trả thì người đầu tiên gánh", () => {
    const r = computeBill(bill({ people: people([12_345], [12_345]), rounding: 1000 }));
    expect(r.payerId).toBe("p0");
    expect(r.people.map((p) => p.pay)).toEqual([12_690, 12_000]);
  });
});

describe("allocateCapped", () => {
  it("dồn phần bị chặn sang người còn chỗ", () => {
    expect(allocateCapped(90, [1, 1, 1], [10, 100, 100])).toEqual([10, 40, 40]);
  });

  it("không chia quá tổng sức chứa", () => {
    expect(allocateCapped(500, [1, 1], [10, 20])).toEqual([10, 20]);
  });
});

describe("formatBillShare", () => {
  it("ra đoạn văn bản dán vào nhóm chat", () => {
    const input = bill({
      people: [
        { id: "a", name: "An", items: [120_000] },
        { id: "b", name: "Bình", items: [80_000] },
      ],
      discounts: [off(50_000, { allocation: "EQUAL" })],
      payerId: "b",
    });
    const text = formatBillShare(input, computeBill(input));
    expect(text.split("\n")).toEqual([
      "Hoá đơn 150.000 ₫ (giảm 50.000 ₫)",
      "• An: 95.000 ₫ (giảm 25.000 ₫)",
      "• Bình: 55.000 ₫ (giảm 25.000 ₫) — người trả",
      "Chuyển cho Bình",
    ]);
  });
});
