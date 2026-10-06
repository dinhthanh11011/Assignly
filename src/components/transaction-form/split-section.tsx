"use client";
import { useId, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { FieldError } from "@/components/field";
import {
  PayerPicker,
  SplitEditor,
  splitSummaryText,
  type SplitState,
} from "@/components/split-editor";
import type { MemberOption } from "@/lib/member";
import { cn } from "@/lib/utils";
import type { TxType } from "./types";

/**
 * "Chia với…": người trả + cách chia, GẤP LẠI mặc định.
 *
 * 9/10 khoản là "mình trả, chia đều cả sổ" — nên mặc định chỉ là một dòng tóm
 * tắt đọc được ("Bạn trả · chia đều 2 người"), bấm mới mở. Mở sẵn khi khoản
 * đang có cách chia khác mặc định (sửa/chép khoản), hoặc khi có lỗi.
 *
 * `id` nằm trên NÚT mở để `useValidation.check()` focus được ngay cả khi phần
 * thân còn gấp — lỗi hiện ra và phần thân tự mở.
 */
export function SplitSection({
  id,
  members,
  currentUserId,
  type,
  amount,
  amountUnknown,
  value,
  onChange,
  error,
}: {
  id: string;
  members: MemberOption[];
  currentUserId: string;
  type: TxType;
  amount: number;
  amountUnknown: boolean;
  value: SplitState;
  onChange: (next: SplitState) => void;
  error?: string;
}) {
  const custom =
    value.paidById !== currentUserId ||
    value.mode !== "EQUAL" ||
    value.included.length !== members.length;
  const [openState, setOpenState] = useState<boolean>(custom);
  const open = openState || Boolean(error);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => setOpenState(!open)}
        className="focus-ring-inset flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-sunken"
      >
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-surface text-primary">
          <Users className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-label text-foreground">Chia với…</span>
          <span className="block text-caption text-muted-foreground">
            {splitSummaryText(value, members, currentUserId, type)}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div id={panelId} className="space-y-4 border-t border-border bg-card p-3.5">
          <PayerPicker
            members={members}
            type={type}
            value={value.paidById}
            currentUserId={currentUserId}
            onChange={(paidById) => onChange({ ...value, paidById })}
          />
          <SplitEditor
            members={members}
            type={type}
            amount={amount}
            amountUnknown={amountUnknown}
            value={value}
            onChange={onChange}
            alwaysOpen
          />
        </div>
      )}
      {error && (
        <div className="border-t border-border px-3.5 py-2.5">
          <FieldError id={`${id}-error`}>{error}</FieldError>
        </div>
      )}
    </div>
  );
}
