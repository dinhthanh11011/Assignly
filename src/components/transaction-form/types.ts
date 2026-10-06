import type { SplitMode } from "@/components/split-editor";

export type TxType = "INCOME" | "EXPENSE";

export type CategoryOption = {
  id: string;
  name: string;
  icon: string | null;
  type: TxType;
};

/** Những gì form nặn ra khi bấm lưu — phần chung của cả ghi mới lẫn sửa. */
export type TransactionFormPayload = {
  type: TxType;
  amount: number;
  /** Chưa biết bao nhiêu, điền sau. `amount` khi đó là 0 — xem schema Prisma. */
  amountUnknown: boolean;
  date: string;
  categoryIds: string[];
  note: string | null;
  paidById?: string;
  splits?: { userId: string; weight: number; amount: number | null }[];
  /** Kiểu chia đã chọn — chỉ để mở lại đúng ô lúc sửa, xem `Transaction.splitMode`. */
  splitMode?: SplitMode;
};

export type EditableTransaction = {
  id: string;
  type: TxType;
  amount: number;
  amountUnknown: boolean;
  date: Date;
  /** Theo đúng thứ tự đã chọn — phần tử đầu là loại chính. */
  categoryIds: string[];
  note: string | null;
  paidById: string | null;
  splits: { userId: string; weight: number; amount: number | null }[];
  /** null ở khoản ghi trước khi có cột này — form đoán lại từ `splits`. */
  splitMode: SplitMode | null;
  /**
   * Bản đang được sửa. Gửi lại nguyên vẹn lúc lưu: server chỉ ghi nếu dưới DB vẫn
   * là bản này, nếu không thì báo "người khác vừa sửa" — xem `Transaction.version`.
   */
  version: number;
};
