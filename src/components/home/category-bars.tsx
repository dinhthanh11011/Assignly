import { formatMoney } from "@/lib/utils";

const COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-6"];

/**
 * Chi nhiều nhất vào đâu — thanh ngang xếp giảm dần (skill: bar chart cho
 * xếp hạng; không pie). Tên loại và số tiền luôn in ra, màu chỉ để phân hàng.
 */
export function CategoryBars({ items, total }: { items: { name: string; value: number }[]; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-body">{it.name}</span>
            <span className="num shrink-0 text-body font-semibold">
              {formatMoney(it.value)}
              {total > 0 && (
                <span className="ml-1.5 text-caption font-normal text-muted-foreground">
                  {Math.round((it.value / total) * 100)}%
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <div className={`h-full rounded-full ${COLORS[i % COLORS.length]}`} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
