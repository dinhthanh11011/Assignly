"use client";
import * as React from "react";
import { Plus, RotateCcw, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { BillResultCard } from "@/components/bill-splitter/bill-result";
import {
  computeBill,
  type BillInput,
  type Discount,
  type DiscountAllocation,
  type DiscountKind,
} from "@/lib/bill-split";
import {
  BILL_ALLOCATION_OPTIONS,
  BILL_DISCOUNT_KIND_OPTIONS,
  BILL_PCT_PRESETS,
} from "@/lib/copy";
import { cn, formatMoney } from "@/lib/utils";

const DRAFT_KEY = "bill-splitter:v1";

const newId = () => Math.random().toString(36).slice(2, 10);
const newPerson = (name = "") => ({ id: newId(), name, items: [0] });
const newDiscount = (): Discount => ({
  id: newId(),
  kind: "AMOUNT",
  value: 0,
  cap: null,
  allocation: "PROPORTIONAL",
});

function emptyBill(): BillInput {
  return {
    people: [newPerson(), newPerson()],
    shared: [],
    discounts: [newDiscount()],
    servicePct: 0,
    vatPct: 0,
    rounding: 0,
    payerId: null,
  };
}

/** Đọc nháp cũ — bỏ qua mọi thứ không đúng hình (bản cũ, sửa tay, hỏng). */
function readDraft(): BillInput | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as BillInput;
    if (!Array.isArray(d?.people) || !Array.isArray(d.shared) || !Array.isArray(d.discounts)) return null;
    return d;
  } catch {
    return null;
  }
}

/**
 * Tiện ích chia hoá đơn đi ăn: mỗi người gọi món riêng, có món chung / ship,
 * mã giảm giá, phí dịch vụ, VAT. Chỉ tính và chia sẻ — không ghi gì vào sổ.
 *
 * Nháp được giữ trong localStorage của máy để lỡ tải lại trang giữa bữa ăn
 * cũng không phải gõ lại 10 người.
 */
export function BillSplitter({ suggestions }: { suggestions: string[] }) {
  const [bill, setBill] = React.useState<BillInput>(emptyBill);
  const [loaded, setLoaded] = React.useState(false);

  // Nháp chỉ đọc được ở client: render đầu luôn là hoá đơn trống cho khớp server.
  React.useEffect(() => {
    const draft = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp nháp một lần sau hydrate
    if (draft) setBill(draft);
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(bill));
    } catch {
      // Chế độ riêng tư chặn localStorage — mất nháp thôi, vẫn tính được.
    }
  }, [bill, loaded]);

  const result = React.useMemo(() => computeBill(bill), [bill]);
  const update = (patch: Partial<BillInput>) => setBill((b) => ({ ...b, ...patch }));

  const people = bill.people;
  const setPerson = (id: string, patch: Partial<BillInput["people"][number]>) =>
    update({ people: people.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const removePerson = (id: string) =>
    update({
      people: people.filter((p) => p.id !== id),
      shared: bill.shared.map((s) =>
        s.among === "all" ? s : { ...s, among: s.among.filter((x) => x !== id) }
      ),
      payerId: bill.payerId === id ? null : bill.payerId,
    });

  const usedNames = new Set(people.map((p) => p.name.trim().toLowerCase()));
  const freeSuggestions = suggestions.filter((n) => !usedNames.has(n.trim().toLowerCase()));

  function addFromLedger(name: string) {
    // Điền vào ô trống đầu tiên trước khi thêm người mới.
    const blank = people.find((p) => !p.name.trim());
    if (blank) setPerson(blank.id, { name });
    else update({ people: [...people, newPerson(name)] });
  }

  const setDiscount = (id: string, patch: Partial<Discount>) =>
    update({ discounts: bill.discounts.map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  const personLabel = (i: number) => people[i].name.trim() || `Người ${i + 1}`;

  return (
    <div className="space-y-6">
      {/* ── Người & món ─────────────────────────────────────────────── */}
      <Section title="Ai gọi gì" hint="Mỗi người nhập giá các món mình gọi">
        <div className="space-y-3">
          {people.map((p, i) => {
            const own = result.people[i]?.own ?? 0;
            return (
              <Card key={p.id} className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Tên người thứ ${i + 1}`}
                    placeholder={`Người ${i + 1}`}
                    value={p.name}
                    onChange={(e) => setPerson(p.id, { name: e.target.value })}
                    className="font-semibold"
                  />
                  {people.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Bỏ ${personLabel(i)}`}
                      onClick={() => removePerson(p.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {p.items.map((amount, k) => (
                    <li key={k} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <MoneyInput
                          aria-label={`Món ${k + 1} của ${personLabel(i)}`}
                          placeholder="0"
                          value={amount}
                          onValueChange={(v) =>
                            setPerson(p.id, { items: p.items.map((x, j) => (j === k ? v : x)) })
                          }
                        />
                      </div>
                      {p.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Bỏ món ${k + 1}`}
                          onClick={() => setPerson(p.id, { items: p.items.filter((_, j) => j !== k) })}
                        >
                          <X />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPerson(p.id, { items: [...p.items, 0] })}
                  >
                    <Plus /> Thêm món
                  </Button>
                  {p.items.length > 1 && (
                    <span className="num text-body text-muted-foreground">Cộng {formatMoney(own)}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        <Button variant="secondary" className="w-full" onClick={() => update({ people: [...people, newPerson()] })}>
          <UserPlus /> Thêm người
        </Button>
        {freeSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-caption text-muted-foreground">Thêm nhanh người trong sổ</p>
            <div className="scroll-fade flex gap-1.5 overflow-x-auto">
              {freeSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addFromLedger(name)}
                  className="focus-ring flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-sunken px-3.5 text-caption font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-4" aria-hidden /> {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── Món chung / ship ────────────────────────────────────────── */}
      <Section title="Món chung, ship" hint="Chia đều cho những người được chọn">
        {bill.shared.map((s) => {
          const among = s.among === "all" ? people.map((p) => p.id) : s.among;
          const toggle = (id: string) => {
            const next = among.includes(id) ? among.filter((x) => x !== id) : [...among, id];
            const all = people.every((p) => next.includes(p.id));
            update({
              shared: bill.shared.map((x) => (x.id === s.id ? { ...x, among: all ? "all" : next } : x)),
            });
          };
          const setShared = (patch: Partial<typeof s>) =>
            update({ shared: bill.shared.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) });
          return (
            <Card key={s.id} className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Tên khoản chung"
                  placeholder="Ship, lẩu, nước…"
                  value={s.label}
                  onChange={(e) => setShared({ label: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Bỏ khoản ${s.label || "chung"}`}
                  onClick={() => update({ shared: bill.shared.filter((x) => x.id !== s.id) })}
                >
                  <Trash2 />
                </Button>
              </div>
              <MoneyInput
                aria-label={`Số tiền ${s.label || "khoản chung"}`}
                placeholder="0"
                value={s.amount}
                onValueChange={(v) => setShared({ amount: v })}
              />
              <div
                role="group"
                aria-label="Ai cùng chịu khoản này"
                className="flex flex-wrap gap-1.5"
              >
                {people.map((p, i) => {
                  const on = among.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "focus-ring flex min-h-11 items-center rounded-lg px-3.5 text-caption font-semibold",
                        on ? "bg-primary text-primary-foreground" : "bg-sunken text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {personLabel(i)}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            update({ shared: [...bill.shared, { id: newId(), label: "", amount: 0, among: "all" }] })
          }
        >
          <Plus /> Thêm món chung / ship
        </Button>
      </Section>

      {/* ── Giảm giá ────────────────────────────────────────────────── */}
      <Section title="Giảm giá" hint="Khuyến mãi, voucher, mã giảm">
        {bill.discounts.map((d, i) => {
          const r = result.discounts[i];
          return (
            <Card key={d.id} className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <ChoiceGroup<DiscountKind>
                  label="Kiểu giảm"
                  value={d.kind}
                  onChange={(kind) => setDiscount(d.id, { kind, value: 0, cap: null })}
                  options={BILL_DISCOUNT_KIND_OPTIONS}
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Bỏ mã giảm ${i + 1}`}
                  onClick={() => update({ discounts: bill.discounts.filter((x) => x.id !== d.id) })}
                >
                  <Trash2 />
                </Button>
              </div>
              {d.kind === "AMOUNT" ? (
                <MoneyInput
                  aria-label="Số tiền được giảm"
                  placeholder="0"
                  value={d.value}
                  onValueChange={(value) => setDiscount(d.id, { value })}
                />
              ) : (
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-0 flex-[1_1_8rem] space-y-1.5">
                    <Label htmlFor={`pct-${d.id}`}>Giảm</Label>
                    <PercentInput id={`pct-${d.id}`} value={d.value} onValueChange={(value) => setDiscount(d.id, { value })} />
                  </div>
                  <div className="min-w-0 flex-[1_1_10rem] space-y-1.5">
                    <Label htmlFor={`cap-${d.id}`}>Tối đa</Label>
                    <MoneyInput
                      id={`cap-${d.id}`}
                      placeholder="Không giới hạn"
                      value={d.cap ?? 0}
                      onValueChange={(cap) => setDiscount(d.id, { cap: cap || null })}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-label">Chia phần giảm</p>
                <ChoiceGroup<DiscountAllocation>
                  label="Cách chia phần giảm"
                  value={d.allocation}
                  onChange={(allocation) => setDiscount(d.id, { allocation })}
                  options={BILL_ALLOCATION_OPTIONS}
                />
              </div>
              {r && r.amount > 0 && (
                <p className="text-body text-income">
                  Giảm <span className="num font-semibold">{formatMoney(r.amount)}</span>
                  {r.capped && " — đã chạm mức tối đa"}
                </p>
              )}
            </Card>
          );
        })}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => update({ discounts: [...bill.discounts, newDiscount()] })}
        >
          <Plus /> {bill.discounts.length ? "Thêm mã giảm khác" : "Thêm mã giảm"}
        </Button>
      </Section>

      {/* ── Phí ─────────────────────────────────────────────────────── */}
      <Section title="Phí dịch vụ, VAT" hint="Tính trên phần sau giảm, chia theo phần của từng người">
        <Card className="space-y-4 p-4">
          <PctField
            id="service"
            label="Phí dịch vụ"
            value={bill.servicePct}
            onValueChange={(servicePct) => update({ servicePct })}
          />
          <PctField id="vat" label="VAT" value={bill.vatPct} onValueChange={(vatPct) => update({ vatPct })} />
        </Card>
      </Section>

      {/* ── Làm tròn ────────────────────────────────────────────────── */}
      <Section title="Ai trả hoá đơn" hint="Mọi người chuyển tiền cho người này">
        <Card className="space-y-4 p-4">
          <ChoiceGroup
            label="Người trả hoá đơn"
            variant="chip"
            value={result.payerId ?? ""}
            onChange={(payerId) => update({ payerId })}
            options={people.map((p, i) => ({ value: p.id, label: personLabel(i) }))}
          />
          <div className="space-y-1.5">
            <p className="text-label">Làm tròn số phải trả</p>
            <ChoiceGroup<"0" | "1000">
              label="Làm tròn số phải trả"
              value={String(bill.rounding) as "0" | "1000"}
              onChange={(v) => update({ rounding: v === "1000" ? 1000 : 0 })}
              options={[
                { value: "0", label: "Giữ số lẻ" },
                { value: "1000", label: "Tròn 1.000đ" },
              ]}
            />
            {bill.rounding > 0 && (
              <p className="text-caption text-muted-foreground">
                Người trả hoá đơn gánh phần lẻ để tổng vẫn khớp hoá đơn.
              </p>
            )}
          </div>
        </Card>
      </Section>

      <BillResultCard input={bill} result={result} />

      <Button variant="ghost" className="w-full" onClick={() => setBill(emptyBill())}>
        <RotateCcw /> Làm lại từ đầu
      </Button>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-title">{title}</h2>
        {hint && <p className="text-body text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Ô nhập phần trăm — nhận cả "8,5" lẫn "8.5". */
function PercentInput({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [text, setText] = React.useState(value ? String(value).replace(".", ",") : "");
  // Đồng bộ lại khi giá trị đổi từ bên ngoài (chip nhanh, làm lại).
  const [prev, setPrev] = React.useState(value);
  if (prev !== value) {
    setPrev(value);
    const shown = Number(text.replace(",", ".")) || 0;
    if (shown !== value) setText(value ? String(value).replace(".", ",") : "");
  }
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d,.]/g, "");
          setText(t);
          const n = Number(t.replace(",", "."));
          onValueChange(Number.isFinite(n) ? Math.min(100, n) : 0);
        }}
        className="num pr-10 text-right text-title font-bold"
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-body font-medium text-muted-foreground">
        %
      </span>
    </div>
  );
}

function PctField({
  id,
  label,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_7rem]">
          <PercentInput id={id} value={value} onValueChange={onValueChange} />
        </div>
        <div className="flex gap-1.5">
          {BILL_PCT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={value === p}
              onClick={() => onValueChange(value === p ? 0 : p)}
              className={cn(
                "focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-caption font-semibold",
                value === p ? "bg-primary text-primary-foreground" : "bg-sunken text-muted-foreground hover:text-foreground"
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
