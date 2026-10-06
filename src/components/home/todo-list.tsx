import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodoItem = {
  key: string;
  href: string;
  icon: React.ElementType;
  tone: "warning" | "expense" | "income" | "primary";
  title: string;
  detail?: string;
};

const TONES = {
  warning: "bg-warning-surface text-warning",
  expense: "bg-expense-surface text-expense",
  income: "bg-income-surface text-income",
  primary: "bg-primary-surface text-primary",
};

/**
 * "Việc cần làm" — gom mọi thứ đang chờ CHÍNH người dùng làm, vốn trước đây
 * nằm rải ở ba trang: nợ tới hẹn, tiền chung cần đưa nhau, khoản chưa điền tiền,
 * người xin vào sổ. Mỗi dòng là một link tới đúng chỗ xử lý.
 */
export function TodoList({
  items,
  extra,
  className,
}: {
  items: TodoItem[];
  extra?: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby="todo-title" className={cn("space-y-3", className)}>
      <h2 id="todo-title" className="flex items-center gap-2 text-title">
        Việc cần làm
        {items.length > 0 && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-warning-surface px-2 text-label text-warning">
            {items.length}
          </span>
        )}
      </h2>
      {extra}
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-income-surface text-income" aria-hidden>
            <CircleCheck className="size-5" />
          </span>
          <div>
            <p className="text-body font-medium">Không có việc gì đang chờ</p>
            <p className="text-caption text-muted-foreground">Nợ tới hẹn, tiền chung, khoản chưa rõ số tiền sẽ hiện ở đây.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                href={it.href}
                className="focus-ring-inset flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors duration-150 hover:bg-sunken"
              >
                <span
                  className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", TONES[it.tone])}
                  aria-hidden
                >
                  <it.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium">{it.title}</span>
                  {it.detail && <span className="block text-caption text-muted-foreground">{it.detail}</span>}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
