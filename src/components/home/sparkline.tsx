/**
 * Đường chi tiêu lũy kế trong tháng — chỉ để thấy NHỊP (tiêu dồn hay tiêu đều),
 * con số thật nằm ngay cạnh nên đây là hình trang trí có nhãn, không mang tin
 * riêng. Vẽ tay bằng SVG cho nhẹ (không kéo recharts vào trang chủ).
 */
export function Sparkline({
  values,
  className,
  label,
}: {
  /** Giá trị theo ngày (KHÔNG lũy kế — hàm tự cộng dồn). */
  values: number[];
  className?: string;
  label: string;
}) {
  const W = 240;
  const H = 56;
  const acc: number[] = [];
  values.reduce((s, v, i) => ((acc[i] = s + v), s + v), 0);
  const max = Math.max(1, ...acc);
  const n = Math.max(1, acc.length - 1);
  const pts = acc.map((v, i) => [(i / n) * W, H - 4 - (v / max) * (H - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={className}
    >
      <path d={area} className="fill-expense-surface" />
      <path
        d={line}
        className="fill-none stroke-expense"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
