import { describe, expect, it } from "vitest";
import {
  SETTLE_EPSILON,
  computeBalances,
  splitShares,
  suggestTransfers,
  type BalanceTransaction,
} from "@/lib/balance";

/**
 * Test cho phần tính tiền chung.
 *
 * Vì sao là file test đầu tiên của repo: `npm run verify` kiểm rất kỹ phần
 * HÌNH THỨC (luật giao diện, tương phản màu, kỷ luật migration) nhưng không
 * kiểm một phép tính nào. Mà chỗ duy nhất trong app có thể sai theo kiểu
 * **im lặng và tốn tiền của người dùng** lại chính là mấy hàm ở đây — chia tiền
 * lẻ, cộng chênh lệch, gợi ý ai trả ai.
 *
 * Chúng cũng là loại code dễ test nhất có thể có: hàm thuần, không DB, không
 * React, làm việc trên số nguyên đồng.
 *
 * BẤT BIẾN LỚN NHẤT, lặp lại ở nhiều test bên dưới: **tổng các phần luôn khớp
 * đúng số tiền giao dịch**, và **tổng chênh lệch của cả sổ luôn bằng 0**. Vỡ
 * một trong hai thì sổ đang bịa ra hoặc làm bốc hơi tiền.
 */

const tx = (o: Partial<BalanceTransaction> & Pick<BalanceTransaction, "amount" | "payerId">): BalanceTransaction => ({
  type: "EXPENSE",
  splits: [],
  ...o,
});

const equal = (...ids: string[]) => ids.map((userId) => ({ userId, weight: 1, amount: null }));
const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);

describe("splitShares — chia tiền một giao dịch", () => {
  it("chia đều khớp tuyệt đối khi chia hết", () => {
    const shares = splitShares(tx({ amount: 90_000, payerId: "a", splits: equal("a", "b", "c") }), []);
    expect([...shares.values()]).toEqual([30_000, 30_000, 30_000]);
    expect(sum(shares)).toBe(90_000);
  });

  it("CHIA LẺ KHÔNG ĐƯỢC LÀM BỐC HƠI ĐỒNG NÀO — 10.000 ₫ cho 3 người", () => {
    // 10000/3 = 3333.33… Làm tròn ngây thơ cho ra 3×3333 = 9999, thiếu 1 đồng.
    // Largest remainder dồn đồng lẻ cho suất có phần thập phân lớn nhất.
    const shares = splitShares(tx({ amount: 10_000, payerId: "a", splits: equal("a", "b", "c") }), []);
    expect(sum(shares)).toBe(10_000);
    expect([...shares.values()].sort()).toEqual([3333, 3333, 3334]);
  });

  it("không ai chịu lệch quá 1 đồng so với người khác", () => {
    for (const amount of [1, 7, 99, 100_001, 1_234_567]) {
      for (const n of [2, 3, 4, 7]) {
        const ids = Array.from({ length: n }, (_, i) => `u${i}`);
        const shares = splitShares(tx({ amount, payerId: "u0", splits: equal(...ids) }), []);
        const vals = [...shares.values()];
        expect(sum(shares)).toBe(amount);
        expect(Math.max(...vals) - Math.min(...vals)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("chia theo phần (weight) đúng tỉ lệ và vẫn khớp tổng", () => {
    const shares = splitShares(
      tx({
        amount: 100_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 3, amount: null },
          { userId: "b", weight: 1, amount: null },
        ],
      }),
      []
    );
    expect(shares.get("a")).toBe(75_000);
    expect(shares.get("b")).toBe(25_000);
    expect(sum(shares)).toBe(100_000);
  });

  it("trộn suất cố định với chia phần: phần còn lại mới đem chia", () => {
    const shares = splitShares(
      tx({
        amount: 100_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 1, amount: 40_000 },
          { userId: "b", weight: 1, amount: null },
          { userId: "c", weight: 1, amount: null },
        ],
      }),
      []
    );
    expect(shares.get("a")).toBe(40_000);
    expect(shares.get("b")).toBe(30_000);
    expect(shares.get("c")).toBe(30_000);
    expect(sum(shares)).toBe(100_000);
  });

  it("suất cố định ngốn hết tiền → người chia phần chịu 0, tổng vẫn khớp", () => {
    const shares = splitShares(
      tx({
        amount: 50_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 1, amount: 50_000 },
          { userId: "b", weight: 1, amount: null },
        ],
      }),
      []
    );
    expect(shares.get("a")).toBe(50_000);
    expect(shares.get("b")).toBe(0);
    expect(sum(shares)).toBe(50_000);
  });

  it("suất cố định VƯỢT số tiền → rải lại theo tỉ lệ, không cho tổng vượt", () => {
    // Người dùng gõ tay 60k + 60k cho một khoản 100k. Sổ không được nói là
    // 120k đã được chia — nó phải chia đúng 100k đang có.
    const shares = splitShares(
      tx({
        amount: 100_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 1, amount: 60_000 },
          { userId: "b", weight: 1, amount: 60_000 },
        ],
      }),
      []
    );
    expect(sum(shares)).toBe(100_000);
    expect(shares.get("a")).toBe(50_000);
    expect(shares.get("b")).toBe(50_000);
  });

  it("SỐ TIỀN CÓ PHẦN LẺ: phần chia phải khớp đúng con số mà computeBalances dùng", () => {
    // `amount` trong schema là `z.number()` KHÔNG có `.int()`, nên một số lẻ vào
    // được DB thật. Lúc đó `splitShares` và `computeBalances` phải làm tròn
    // GIỐNG HỆT NHAU (cả hai đều `Math.round`) — lệch một nhịp làm tròn là tổng
    // chênh lệch của sổ không còn bằng 0, tức là sổ tự sinh ra hoặc nuốt mất
    // một đồng ở mỗi giao dịch lẻ.
    for (const amount of [100.5, 99.4, 0.5, 33_333.7, 1.5]) {
      // nhánh chia theo phần
      const flexible = splitShares(tx({ amount, payerId: "a", splits: equal("a", "b", "c") }), []);
      expect(sum(flexible)).toBe(Math.round(amount));

      // nhánh suất cố định — đây là chỗ DUY NHẤT `allocate` nhận số lẻ thô,
      // nên cũng là chỗ duy nhất kiểu làm tròn bên trong nó lộ ra ngoài.
      const fixed = splitShares(
        tx({
          amount,
          payerId: "a",
          splits: [
            { userId: "a", weight: 1, amount },
            { userId: "b", weight: 1, amount },
          ],
        }),
        []
      );
      expect(sum(fixed)).toBe(Math.round(amount));
    }

    const balances = computeBalances({
      memberIds: ["a", "b", "c"],
      transactions: [
        tx({ amount: 100.5, payerId: "a", splits: equal("a", "b", "c") }),
        tx({ amount: 0.5, payerId: "b", splits: equal("a", "b") }),
      ],
      settlements: [],
    });
    expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0);
  });

  it("suất cố định vượt tiền TRONG KHI vẫn còn người chia phần → tổng không được vượt", () => {
    // Khác ca trên ở đúng một điểm: ở đây CÒN người chia theo phần. Bản cũ dễ
    // rơi xuống nhánh chia-phần, nơi `rest` thành số ÂM — lúc đó hai suất cố
    // định vẫn được ghi nguyên 60k + 60k và sổ nói 120k đã được chia cho một
    // khoản 100k.
    const shares = splitShares(
      tx({
        amount: 100_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 1, amount: 60_000 },
          { userId: "b", weight: 1, amount: 60_000 },
          { userId: "c", weight: 1, amount: null },
        ],
      }),
      []
    );
    expect(sum(shares)).toBe(100_000);
    expect(shares.get("c")).toBe(0);
  });

  it("suất cố định lẻ được LÀM TRÒN, không bị cắt xuống", () => {
    const shares = splitShares(
      tx({
        amount: 100_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 1, amount: 50.6 },
          { userId: "b", weight: 1, amount: null },
        ],
      }),
      []
    );
    expect(shares.get("a")).toBe(51);
    expect(sum(shares)).toBe(100_000);
  });

  it("giao dịch không có dòng split (dữ liệu cũ) → chia đều cho thành viên hiện tại", () => {
    const shares = splitShares(tx({ amount: 60_000, payerId: "a" }), ["a", "b", "c"]);
    expect([...shares.values()]).toEqual([20_000, 20_000, 20_000]);
  });

  it("mọi weight bằng 0 → chia đều, không chia cho 0", () => {
    const shares = splitShares(
      tx({
        amount: 30_000,
        payerId: "a",
        splits: [
          { userId: "a", weight: 0, amount: null },
          { userId: "b", weight: 0, amount: null },
        ],
      }),
      []
    );
    expect(sum(shares)).toBe(30_000);
    expect(shares.get("a")).toBe(15_000);
  });
});

describe("computeBalances — chênh lệch của cả sổ", () => {
  it("TỔNG CHÊNH LỆCH CỦA SỔ LUÔN BẰNG 0", () => {
    const balances = computeBalances({
      memberIds: ["a", "b", "c"],
      transactions: [
        tx({ amount: 300_000, payerId: "a", splits: equal("a", "b", "c") }),
        tx({ amount: 10_000, payerId: "b", splits: equal("a", "b", "c") }),
        tx({ type: "INCOME", amount: 500_000, payerId: "c", splits: equal("a", "b", "c") }),
      ],
      settlements: [{ fromUserId: "b", toUserId: "a", amount: 50_000 }],
    });
    expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0);
  });

  it("một người trả cho cả nhóm → nhóm nợ đúng phần của người khác", () => {
    const [a, b] = computeBalances({
      memberIds: ["a", "b"],
      transactions: [tx({ amount: 100_000, payerId: "a", splits: equal("a", "b") })],
      settlements: [],
    });
    expect(a.paid).toBe(100_000);
    expect(a.net).toBe(50_000); // bỏ ra 100k, chịu 50k
    expect(b.net).toBe(-50_000);
  });

  it("khoản THU đối xứng với khoản CHI: người giữ tiền là người đang nợ nhóm", () => {
    const [a, b] = computeBalances({
      memberIds: ["a", "b"],
      transactions: [tx({ type: "INCOME", amount: 100_000, payerId: "a", splits: equal("a", "b") })],
      settlements: [],
    });
    expect(a.received).toBe(100_000);
    expect(a.net).toBe(-50_000); // cầm 100k, chỉ được hưởng 50k
    expect(b.net).toBe(50_000);
  });

  it("trả tiền cho nhau xong thì cả hai về 0", () => {
    const balances = computeBalances({
      memberIds: ["a", "b"],
      transactions: [tx({ amount: 100_000, payerId: "a", splits: equal("a", "b") })],
      settlements: [{ fromUserId: "b", toUserId: "a", amount: 50_000 }],
    });
    expect(balances.every((x) => x.net === 0)).toBe(true);
  });

  it("thành viên chưa phát sinh gì vẫn có mặt, và đứng theo thứ tự memberIds", () => {
    const balances = computeBalances({ memberIds: ["z", "a"], transactions: [], settlements: [] });
    expect(balances.map((b) => b.userId)).toEqual(["z", "a"]);
    expect(balances.every((b) => b.net === 0)).toBe(true);
  });

  it("người ĐÃ RỜI SỔ còn dính số dư vẫn hiện, nhưng xếp sau thành viên hiện tại", () => {
    const balances = computeBalances({
      memberIds: ["a"],
      transactions: [tx({ amount: 100_000, payerId: "cu", splits: equal("a", "cu") })],
      settlements: [],
    });
    expect(balances.map((b) => b.userId)).toEqual(["a", "cu"]);
    expect(balances.find((b) => b.userId === "cu")!.net).toBe(50_000);
  });

  it("hai người ĐÃ RỜI SỔ xếp theo userId, không theo thứ tự DB trả về", () => {
    // Người đã rời sổ không có mặt trong `memberIds` nên đều nhận cùng một khoá
    // sắp xếp (MAX_SAFE_INTEGER). Không có tie-break theo userId thì thứ tự của
    // họ trong bảng "ai nợ ai" phụ thuộc vào thứ tự Prisma trả giao dịch về —
    // tức là đổi chỗ nhau giữa hai lần tải cùng một trang.
    const order = (transactions: BalanceTransaction[]) =>
      computeBalances({ memberIds: ["a"], transactions, settlements: [] }).map((b) => b.userId);

    const t1 = tx({ amount: 100_000, payerId: "zz", splits: equal("a", "zz") });
    const t2 = tx({ amount: 100_000, payerId: "bb", splits: equal("a", "bb") });
    expect(order([t1, t2])).toEqual(["a", "bb", "zz"]);
    expect(order([t2, t1])).toEqual(["a", "bb", "zz"]);
  });

  it("khoản 0 đồng (chưa biết số tiền) không làm lệch gì cả", () => {
    // `amountUnknown` lưu amount = 0 — xem schema. Nó PHẢI không đóng góp gì.
    const balances = computeBalances({
      memberIds: ["a", "b"],
      transactions: [tx({ amount: 0, payerId: "a", splits: equal("a", "b") })],
      settlements: [],
    });
    expect(balances.every((x) => x.net === 0)).toBe(true);
  });

  it("bỏ qua settlement tự chuyển cho chính mình", () => {
    const balances = computeBalances({
      memberIds: ["a"],
      transactions: [],
      settlements: [{ fromUserId: "a", toUserId: "a", amount: 99_000 }],
    });
    expect(balances[0].net).toBe(0);
    expect(balances[0].settledOut).toBe(0);
  });
});

describe("suggestTransfers — gợi ý ai trả ai", () => {
  it("cho ra tối đa n−1 lượt chuyển", () => {
    const transfers = suggestTransfers([
      { userId: "a", net: 300_000 },
      { userId: "b", net: -100_000 },
      { userId: "c", net: -100_000 },
      { userId: "d", net: -100_000 },
    ]);
    expect(transfers.length).toBeLessThanOrEqual(3);
    expect(transfers.every((t) => t.toUserId === "a")).toBe(true);
  });

  it("chuyển xong thì mọi người về 0", () => {
    const balances = [
      { userId: "a", net: 120_000 },
      { userId: "b", net: -70_000 },
      { userId: "c", net: -50_000 },
    ];
    const after = new Map(balances.map((b) => [b.userId, b.net]));
    for (const t of suggestTransfers(balances)) {
      after.set(t.fromUserId, after.get(t.fromUserId)! + t.amount);
      after.set(t.toUserId, after.get(t.toUserId)! - t.amount);
    }
    expect([...after.values()].every((v) => Math.abs(v) < SETTLE_EPSILON)).toBe(true);
  });

  it("không đề xuất chuyển vài đồng lẻ dưới ngưỡng", () => {
    expect(
      suggestTransfers([
        { userId: "a", net: 0.4 },
        { userId: "b", net: -0.4 },
      ])
    ).toEqual([]);
  });

  it("sổ đã cân thì không gợi ý gì", () => {
    expect(suggestTransfers([{ userId: "a", net: 0 }, { userId: "b", net: 0 }])).toEqual([]);
  });

  it("HAI NGƯỜI NỢ BẰNG NHAU → gợi ý không được đổi theo thứ tự DB trả về", () => {
    // `computeBalances` xếp theo `memberIds`, mà thứ tự đó đến từ một truy vấn
    // DB — thêm/bớt thành viên là nó đổi. Không có tie-break theo userId thì
    // cùng một cuốn sổ, cùng một số tiền, hai lần tải trang lại bảo "Bình trả
    // cho Chi" rồi "An trả cho Chi". Người dùng đọc ra đó là app đoán bừa.
    const balances = [
      { userId: "an", net: -50_000 },
      { userId: "binh", net: -50_000 },
      { userId: "chi", net: 100_000 },
    ];
    const expected = suggestTransfers(balances.slice());

    // mọi hoán vị của cùng một tập số dư phải cho ra cùng một gợi ý
    const permutations = [
      [balances[1], balances[0], balances[2]],
      [balances[2], balances[1], balances[0]],
      [balances[1], balances[2], balances[0]],
    ];
    for (const p of permutations) {
      expect(suggestTransfers(p.slice())).toEqual(expected);
    }
  });
});

describe("bất biến đầu-cuối: chia tiền → cân đối → gợi ý chuyển", () => {
  it("với dữ liệu lộn xộn, tiền không tự sinh ra cũng không bốc hơi", () => {
    const memberIds = ["a", "b", "c", "d"];
    const transactions: BalanceTransaction[] = [
      tx({ amount: 10_001, payerId: "a", splits: equal("a", "b", "c") }),
      tx({ amount: 777, payerId: "b", splits: equal(...memberIds) }),
      tx({
        amount: 1_000_000,
        payerId: "c",
        splits: [
          { userId: "a", weight: 1, amount: 333_333 },
          { userId: "b", weight: 2, amount: null },
          { userId: "c", weight: 1, amount: null },
        ],
      }),
      tx({ type: "INCOME", amount: 45_679, payerId: "d", splits: equal("a", "d") }),
    ];

    // 1. mỗi giao dịch: tổng các phần = đúng số tiền
    for (const t of transactions) {
      expect(sum(splitShares(t, memberIds))).toBe(Math.round(t.amount));
    }

    // 2. cả sổ: tổng chênh lệch = 0
    const balances = computeBalances({
      memberIds,
      transactions,
      settlements: [{ fromUserId: "b", toUserId: "a", amount: 12_345 }],
    });
    expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0);

    // 3. làm theo gợi ý thì ai cũng về 0
    const after = new Map(balances.map((b) => [b.userId, b.net]));
    for (const t of suggestTransfers(balances)) {
      after.set(t.fromUserId, after.get(t.fromUserId)! + t.amount);
      after.set(t.toUserId, after.get(t.toUserId)! - t.amount);
    }
    expect([...after.values()].every((v) => Math.abs(v) < SETTLE_EPSILON)).toBe(true);
  });
});
