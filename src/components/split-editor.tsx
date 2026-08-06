"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MemberAvatar } from "@/components/member-avatar";
import { MoneyInput } from "@/components/money-input";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { splitShares, type SplitRow } from "@/lib/balance";
import { payerQuestion, splitModeLabel, splitRemainderLabel } from "@/lib/copy";
import { memberLabel, type MemberOption } from "@/lib/member";
import { cn, formatMoney } from "@/lib/utils";

export type SplitMode = "EQUAL" | "WEIGHT" | "EXACT";

export type SplitState = {
  /** Người bỏ tiền ra (khoản chi) hoặc nhận tiền về (khoản thu). */
  paidById: string;
  mode: SplitMode;
  /** Ai tham gia chia — dùng cho EQUAL và WEIGHT. */
  included: string[];
  /** Số phần của từng người, chỉ dùng ở WEIGHT. */
  weights: Record<string, number>;
  /** Số tiền cụ thể của từng người, chỉ dùng ở EXACT. */
  exact: Record<string, number>;
};

const MODES: { value: SplitMode; label: string }[] = [
  { value: "EQUAL", label: splitModeLabel("EQUAL") },
  { value: "WEIGHT", label: splitModeLabel("WEIGHT") },
  { value: "EXACT", label: splitModeLabel("EXACT") },
];

/** Trạng thái ban đầu: chia đều cho tất cả, người trả là `paidById`. */
export function defaultSplitState(members: MemberOption[], paidById: string): SplitState {
  return {
    paidById,
    mode: "EQUAL",
    included: members.map((m) => m.id),
    weights: Object.fromEntries(members.map((m) => [m.id, 1])),
    exact: {},
  };
}

/**
 * Dựng lại trạng thái sửa từ các dòng split đã lưu. Suy ra chế độ: toàn bộ là số
 * tiền cố định → EXACT; trọng số bằng nhau → EQUAL; còn lại → WEIGHT.
 */
export function splitStateFrom(
  members: MemberOption[],
  paidById: string,
  splits: { userId: string; weight: number; amount: number | null }[]
): SplitState {
  const base = defaultSplitState(members, paidById);
  const rows = splits.filter((s) => members.some((m) => m.id === s.userId));
  if (rows.length === 0) return base;

  if (rows.every((s) => s.amount != null)) {
    return {
      ...base,
      mode: "EXACT",
      included: rows.map((s) => s.userId),
      exact: Object.fromEntries(rows.map((s) => [s.userId, Math.round(s.amount!)])),
    };
  }

  const flexible = rows.filter((s) => s.amount == null);
  const equal = rows.length === flexible.length && flexible.every((s) => s.weight === flexible[0].weight);
  return {
    ...base,
    mode: equal ? "EQUAL" : "WEIGHT",
    included: flexible.map((s) => s.userId),
    weights: {
      ...base.weights,
      ...Object.fromEntries(flexible.map((s) => [s.userId, s.weight])),
    },
  };
}

/** Trạng thái editor → payload gửi lên server action. */
export function splitStateToPayload(state: SplitState): SplitRow[] {
  if (state.mode === "EXACT") {
    return Object.entries(state.exact)
      .filter(([, amount]) => amount > 0)
      .map(([userId, amount]) => ({ userId, weight: 0, amount }));
  }
  return state.included.map((userId) => ({
    userId,
    weight: state.mode === "WEIGHT" ? (state.weights[userId] ?? 1) : 1,
    amount: null,
  }));
}

/** Xem trước phần mỗi người phần của mình — dùng đúng phép chia của server. */
export function previewShares(
  state: SplitState,
  amount: number,
  type: "INCOME" | "EXPENSE",
  memberIds: string[]
): Map<string, number> {
  const splits = splitStateToPayload(state);
  if (splits.length === 0) return new Map();
  return splitShares({ type, amount, payerId: state.paidById, splits }, memberIds);
}

/**
 * Chia tiền: TÓM TẮT TRƯỚC, MUỐN ĐỔI THÌ BẤM.
 *
 * Trường hợp chiếm 99% là "người ghi bỏ tiền, chia đều cả nhà" — trường hợp đó
 * giờ cần ĐÚNG KHÔNG thao tác nào, chỉ đọc một câu là xong. Ba chế độ chia, nút
 * tăng giảm số phần, ô nhập từng người, người trả… vẫn còn nguyên vẹn phía sau
 * đúng một cú bấm.
 *
 * Đây là lý do không làm chế độ "đơn giản / nâng cao" toàn cục: cái công tắc đó
 * tự nó đã là khái niệm nâng cao, và nó giấu tính năng vĩnh viễn khỏi người một
 * ngày nào đó cần tới. Giấu theo từng control thì không mất gì.
 *
 * Chỉ hiện khi sổ có từ 2 người trở lên — sổ một người thì server mặc định chia
 * đều là đủ.
 */
export function SplitEditor({
  members,
  type,
  amount,
  value,
  onChange,
}: {
  members: MemberOption[];
  type: "INCOME" | "EXPENSE";
  amount: number;
  value: SplitState;
  onChange: (next: SplitState) => void;
}) {
  // Đang sửa một khoản chia kiểu khác "chia đều" thì bung sẵn: không bao giờ
  // giấu một cách chia tuỳ chỉnh khỏi chính màn hình sửa nó.
  const [openState, setOpenState] = useState<boolean | null>(null);
  const custom = value.mode !== "EQUAL" || value.included.length !== members.length;
  const open = openState ?? custom;

  if (!open) {
    return (
      <SplitSummary
        members={members}
        type={type}
        amount={amount}
        value={value}
        onOpen={() => setOpenState(true)}
      />
    );
  }

  return <SplitEditorFull members={members} type={type} amount={amount} value={value} onChange={onChange} />;
}

/** Một câu nói kết quả đang chia thế nào, kèm nút mở phần chỉnh chi tiết. */
function SplitSummary({
  members,
  type,
  amount,
  value,
  onOpen,
}: {
  members: MemberOption[];
  type: "INCOME" | "EXPENSE";
  amount: number;
  value: SplitState;
  onOpen: () => void;
}) {
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const shares = useMemo(
    () => previewShares(value, amount, type, memberIds),
    [value, amount, type, memberIds]
  );
  const payer = members.find((m) => m.id === value.paidById);
  const count = value.included.length;
  const each = count > 0 ? (shares.get(value.included[0]) ?? 0) : 0;

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-sunken p-3.5">
      <Label>Chia tiền</Label>
      <p className="text-body">
        <span className="font-semibold">{payer ? memberLabel(payer) : "Bạn"}</span>{" "}
        {type === "INCOME" ? "cầm tiền" : "bỏ tiền ra"} · chia đều cho {count} người
        {amount > 0 && each > 0 ? ` · mỗi người ${formatMoney(each)}` : ""}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onOpen}>
        <ChevronDown /> Đổi cách chia
      </Button>
    </div>
  );
}

function SplitEditorFull({
  members,
  type,
  amount,
  value,
  onChange,
}: {
  members: MemberOption[];
  type: "INCOME" | "EXPENSE";
  amount: number;
  value: SplitState;
  onChange: (next: SplitState) => void;
}) {
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const shares = useMemo(
    () => previewShares(value, amount, type, memberIds),
    [value, amount, type, memberIds]
  );

  const exactTotal = Object.values(value.exact).reduce((s, v) => s + (v || 0), 0);
  const remaining = Math.round(amount) - exactTotal;
  const included = new Set(value.included);

  function toggle(userId: string) {
    const next = included.has(userId)
      ? value.included.filter((id) => id !== userId)
      : [...memberIds.filter((id) => included.has(id) || id === userId)];
    if (next.length === 0) return; // luôn còn ít nhất một người chịu
    onChange({ ...value, included: next });
  }

  function setWeight(userId: string, weight: number) {
    const w = Math.max(0, Math.min(99, weight));
    const nextIncluded =
      w === 0
        ? value.included.filter((id) => id !== userId)
        : included.has(userId)
          ? value.included
          : [...memberIds.filter((id) => included.has(id) || id === userId)];
    if (nextIncluded.length === 0) return;
    onChange({ ...value, included: nextIncluded, weights: { ...value.weights, [userId]: w } });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-sunken p-3.5">
      <div className="space-y-2">
        <Label>{payerQuestion(type)}</Label>
        <div className="scroll-fade -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
          {members.map((m) => {
            const on = value.paidById === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ ...value, paidById: m.id })}
                aria-pressed={on}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-label transition-colors",
                  on
                    ? "border-primary bg-primary-surface text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <MemberAvatar user={m} className="size-8" />
                <span className="max-w-24 truncate">{memberLabel(m)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label>Khoản này của những ai?</Label>
          {value.mode === "EXACT" &&
            (() => {
              const r = splitRemainderLabel(remaining);
              return (
                <span
                  className={cn(
                    "num text-label",
                    r.tone === "ok"
                      ? "text-income"
                      : r.tone === "under"
                        ? "text-muted-foreground"
                        : "text-expense"
                  )}
                >
                  {r.text}
                </span>
              );
            })()}
        </div>

        <Segmented
          value={value.mode}
          onChange={(mode) =>
            onChange({
              ...value,
              mode,
              // Sang "theo phần": lấy mốc 1 phần/người cho những ai đang được chia.
              weights:
                mode === "WEIGHT"
                  ? Object.fromEntries(memberIds.map((id) => [id, included.has(id) ? 1 : 0]))
                  : value.weights,
              // Sang "số tiền": mồi sẵn bằng phần đang chia đều, chỉ cần sửa lại.
              exact:
                mode === "EXACT" && Object.keys(value.exact).length === 0
                  ? Object.fromEntries([...shares.entries()].filter(([, v]) => v > 0))
                  : value.exact,
            })
          }
          options={MODES}
          />

        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {members.map((m) => {
            const on = value.mode === "EXACT" ? (value.exact[m.id] ?? 0) > 0 : included.has(m.id);
            const share = shares.get(m.id) ?? 0;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex min-h-14 items-center gap-2.5 px-2.5 py-2 transition-opacity",
                  !on && "opacity-45"
                )}
              >
                {value.mode === "EQUAL" ? (
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    aria-pressed={on}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <MemberAvatar user={m} className="size-9" />
                    <span className="min-w-0 flex-1 truncate text-body">{memberLabel(m)}</span>
                    <span className="num shrink-0 text-label">
                      {on ? formatMoney(share) : "Không chia"}
                    </span>
                  </button>
                ) : (
                  <>
                    <MemberAvatar user={m} className="size-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-body">{memberLabel(m)}</span>
                    {value.mode === "WEIGHT" ? (
                      <>
                        <Stepper
                          value={value.weights[m.id] ?? 0}
                          onChange={(w) => setWeight(m.id, w)}
                          label={memberLabel(m)}
                        />
                        <span className="num w-24 shrink-0 text-right text-label">
                          {formatMoney(share)}
                        </span>
                      </>
                    ) : (
                      <MoneyInput
                        aria-label={`Số tiền của ${memberLabel(m)}`}
                        value={value.exact[m.id] ?? 0}
                        onValueChange={(v) =>
                          onChange({ ...value, exact: { ...value.exact, [m.id]: v } })
                        }
                        className="h-12 w-36 text-body"
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const btn =
    "flex size-11 items-center justify-center rounded-lg bg-sunken text-muted-foreground transition-colors hover:text-primary disabled:opacity-40";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={btn}
        aria-label={`Giảm số phần của ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-5" />
      </button>
      <span className="num w-6 text-center text-body-lg">{value}</span>
      <button
        type="button"
        className={btn}
        aria-label={`Tăng số phần của ${label}`}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
