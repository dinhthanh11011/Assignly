import { describe, expect, it } from "vitest";
import { MAX_AMOUNT, amountSchema, dateKeySchema, positiveAmountSchema } from "./validation";

describe("dateKeySchema", () => {
  const schema = dateKeySchema();

  it("nhận ngày có thật", () => {
    for (const s of ["2026-09-24", "2024-02-29", "2000-01-01", "1999-12-31"]) {
      expect(schema.safeParse(s).success, s).toBe(true);
    }
  });

  it("chặn ngày mà Date.UTC sẽ lặng lẽ dời đi", () => {
    for (const s of ["2026-13-45", "2026-02-29", "2026-04-31", "2026-00-10", "2026-01-00"]) {
      expect(schema.safeParse(s).success, s).toBe(false);
    }
  });

  it("chặn năm 0–99 (Date.UTC hiểu thành 19xx) và năm ngoài khoảng", () => {
    for (const s of ["0026-01-01", "1899-12-31", "2101-01-01"]) {
      expect(schema.safeParse(s).success, s).toBe(false);
    }
  });

  it("chặn chuỗi sai dạng", () => {
    for (const s of ["2026-9-24", "24/09/2026", "", "2026-09-24T00:00"]) {
      expect(schema.safeParse(s).success, s).toBe(false);
    }
  });

  it("dùng câu báo lỗi được truyền vào", () => {
    const r = dateKeySchema("Ngày hẹn trả không hợp lệ").safeParse("2026-13-01");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Ngày hẹn trả không hợp lệ");
  });
});

describe("amountSchema", () => {
  it("nhận đồng nguyên từ 0 tới trần", () => {
    for (const n of [0, 1, 150_000, MAX_AMOUNT]) {
      expect(amountSchema.safeParse(n).success, String(n)).toBe(true);
    }
  });

  it("chặn số lẻ, số âm, số quá lớn và số không hữu hạn", () => {
    for (const n of [1.5, 1000.25, -1, MAX_AMOUNT + 1, 1e308, Infinity, NaN]) {
      expect(amountSchema.safeParse(n).success, String(n)).toBe(false);
    }
  });

  it("positiveAmountSchema chặn thêm số 0", () => {
    expect(positiveAmountSchema.safeParse(0).success).toBe(false);
    expect(positiveAmountSchema.safeParse(1).success).toBe(true);
  });
});
