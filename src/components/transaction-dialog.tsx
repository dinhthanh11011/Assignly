/**
 * Lối vào cũ của form ghi/sửa khoản — phần ruột đã tách sang
 * `src/components/transaction-form/`. Giữ file này để các chỗ import cũ chạy.
 */
export { TransactionForm } from "@/components/transaction-form/transaction-form";
export { EditTransactionDialog } from "@/components/transaction-form/edit-transaction-dialog";
export type {
  CategoryOption,
  EditableTransaction,
  TransactionFormPayload,
} from "@/components/transaction-form/types";
