"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { cn } from "@/lib/utils";

/**
 * Nền sáng / tối / theo máy — ba ô có hình thu nhỏ của app ở đúng nền đó.
 *
 * Mặc định là nền sáng: chữ tối trên nền sáng đọc tốt hơn, nhất là với mắt
 * lớn tuổi; "Theo máy" vẫn có nhưng không mặc định vì nhiều máy bật sẵn nền
 * tối mà chủ máy chưa hề chọn.
 */

const OPTIONS = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo máy", icon: Monitor },
] as const;

/* Màu của hình thu nhỏ CỐ ĐỊNH theo ô, không theo theme đang bật — ô "Sáng"
   phải trông sáng cả khi app đang ở nền tối. Lấy đúng giá trị token của
   globals.css. Hình thuần trang trí (aria-hidden), không mang chữ. */
const PALETTE = {
  light: {
    bg: "oklch(0.982 0.006 265)",
    card: "oklch(1 0 0)",
    line: "oklch(0.905 0.011 265)",
    ink: "oklch(0.505 0.032 268)",
    brand: "oklch(0.53 0.2 278)",
  },
  dark: {
    bg: "oklch(0.175 0.01 265)",
    card: "oklch(0.218 0.012 265)",
    line: "oklch(0.31 0.016 265)",
    ink: "oklch(0.74 0.02 265)",
    brand: "oklch(0.72 0.147 278)",
  },
};

function Mini({ mode }: { mode: "light" | "dark" }) {
  const p = PALETTE[mode];
  return (
    <span className="flex h-full w-full flex-col gap-1 p-1.5" style={{ background: p.bg }}>
      <span className="h-1.5 w-1/2 rounded-full" style={{ background: p.ink, opacity: 0.6 }} />
      <span
        className="flex flex-1 flex-col justify-center gap-1 rounded-md border px-1.5"
        style={{ background: p.card, borderColor: p.line }}
      >
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: p.brand }} />
        <span className="h-1 w-1/2 rounded-full" style={{ background: p.ink, opacity: 0.5 }} />
      </span>
    </span>
  );
}

function Preview({ value }: { value: (typeof OPTIONS)[number]["value"] }) {
  return (
    <span
      aria-hidden
      className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-border"
    >
      {value === "system" ? (
        <>
          <span className="absolute inset-0">
            <Mini mode="light" />
          </span>
          <span className="absolute inset-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}>
            <Mini mode="dark" />
          </span>
        </>
      ) : (
        <Mini mode={value} />
      )}
    </span>
  );
}

const subscribeNever = () => () => {};

export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  // Render đầu ở client phải giống server, nên "" tới khi đã mount.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  return (
    <ChoiceGroup
      label="Giao diện sáng hay tối"
      variant="card"
      className="grid-cols-3 sm:grid-cols-3"
      value={mounted ? (theme ?? "") : ""}
      onChange={setTheme}
      options={OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
      renderOption={(o, { active }) => {
        const Icon = o.icon!;
        return (
          <span className="flex w-full flex-col gap-2">
            <Preview value={o.value as (typeof OPTIONS)[number]["value"]} />
            <span
              className={cn(
                "flex flex-wrap items-center justify-center gap-x-1.5 text-center text-caption",
                active ? "text-primary" : "text-foreground"
              )}
            >
              {active ? (
                <Check className="size-4 shrink-0" aria-hidden />
              ) : (
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0">{o.label}</span>
            </span>
          </span>
        );
      }}
    />
  );
}
