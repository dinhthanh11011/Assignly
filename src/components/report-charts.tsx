"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowPoint } from "@/lib/queries";
import { formatDayHeading, formatMoney, formatMoneyShort, formatMonth } from "@/lib/utils";

const INCOME_COLOR = "var(--income)";
const EXPENSE_COLOR = "var(--expense)";

/**
 * Bảng màu định tính, thứ tự cố định (không xoay vòng sinh màu mới).
 * Đã kiểm bằng validator: nằm trong dải sáng dành cho nền tối, ΔE giữa các cặp
 * kề nhau đạt ngưỡng cho cả ba dạng mù màu, tương phản ≥ 3:1 với nền.
 */
/* GIỮ NGUYÊN qua đợt làm mới giao diện, cố ý. Bảng này đã qua validator (ΔE
   giữa các cặp kề nhau cho cả ba dạng mù màu, ≥3:1 với nền) — hạ chroma cho
   "trầm" hơn sẽ kéo ΔE xuống đúng chiều làm hỏng chính thứ nó bảo đảm. Muốn đổi
   thì phải chạy lại validator, không sửa bằng mắt. */
const PALETTE = [
  "#8c69ed", // violet
  "#7ba300", // lime
  "#009db7", // cyan
  "#d24d42", // coral
  "#bb4cb5", // magenta
  "#1da871", // mint
  "#c48400", // amber
  "#417acc", // blue
];

const tooltipStyle = {
  background: "var(--color-card)",
  // --color-hairline đã bị xoá từ đợt thiết kế lại trước; tham chiếu chết ở đây
  // làm cả thuộc tính border không hợp lệ, nên tooltip xưa nay không hề có viền.
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  boxShadow: "var(--shadow-lift)",
  color: "var(--color-foreground)",
  fontSize: 13,
} as const;

const legendStyle = { fontSize: 12 } as const;

// Recharts khai báo formatter rất lỏng (ValueType | undefined), nên ép về số ở đây.
const moneyFormatter = (v: unknown) => formatMoney(Number(v) || 0);

const EMPTY = (
  <p className="py-14 text-center text-body text-muted-foreground">Chưa có số liệu để vẽ.</p>
);

/**
 * Thu / chi theo từng cột thời gian. Cột là NGÀY hay THÁNG do server quyết theo
 * độ dài khoảng đang xem (xem `getReport`), và nhãn cột (`label`) cũng tính sẵn
 * ở đó — biểu đồ chỉ vẽ.
 */
export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  if (data.every((d) => d.income === 0 && d.expense === 0)) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={280}>
      {/* 31 ngày × 2 cột trong một thẻ hẹp: khe mặc định (barGap 4 + 10% mỗi
          nhóm) ăn hết bề ngang, cột còn lại mảnh như sợi chỉ. Bỏ khe giữa hai
          cột cùng ngày, và chặn trên để khoảng chỉ có 2–3 cột không phình ra. */}
      <BarChart
        data={data}
        margin={{ left: 4, right: 8, top: 8 }}
        barGap={0}
        barCategoryGap="12%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
        {/* Nhiều cột thì bỏ bớt nhãn thay vì để chúng chồng lên nhau. Để recharts
            tự đếm: nó đo bề rộng chữ thật, còn công thức data.length/8 thì không
            biết thẻ đang rộng bao nhiêu nên vẫn chồng trên máy nhỏ. */}
        <XAxis
          dataKey="label"
          interval="equidistantPreserveStart"
          minTickGap={12}
          tickMargin={8}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <YAxis
          tickFormatter={(v: number) => formatMoneyShort(v)}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
          // "1,25 tỷ" không vừa 56px; để recharts tự đo theo nhãn thật.
          width="auto"
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={tooltipStyle}
          // Nhãn trục bị bỏ bớt, nên tooltip phải nói ĐỦ: cột đang chạm là ngày
          // nào / tháng nào, viết ra bằng chữ.
          labelFormatter={(label) => pointHeading(data, String(label))}
          formatter={(v, name) => [formatMoney(Number(v) || 0), String(name)]}
        />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Bar dataKey="income" name="Tiền vào" fill={INCOME_COLOR} radius={[2, 2, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Tiền ra" fill={EXPENSE_COLOR} radius={[2, 2, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** "Thứ Ba, 05/08" cho cột ngày; "Tháng 8/2026" cho cột tháng. */
function pointHeading(data: CashflowPoint[], label: string) {
  const point = data.find((d) => d.label === label);
  if (!point) return label;
  return point.key.length > 7 ? formatDayHeading(point.key) : formatMonth(point.key);
}

/** Cơ cấu theo loại. */
export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  const chart = data.filter((d) => d.value > 0).slice(0, 8);
  if (chart.length === 0) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chart}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={96}
          paddingAngle={2}
        >
          {chart.map((d, i) => (
            <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={moneyFormatter} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Xếp hạng chi tiêu theo loại, dạng thanh ngang. */
export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  const chart = data.filter((d) => d.value > 0).slice(0, 10);
  if (chart.length === 0) return EMPTY;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chart.length * 40)}>
      <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatMoneyShort(v)}
          minTickGap={16}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          stroke="var(--color-muted-foreground)"
          fontSize={12}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={tooltipStyle}
          formatter={moneyFormatter}
        />
        {/* Đây là biểu đồ độ lớn, không phải định danh → một màu duy nhất.
            Tô theo thứ hạng sẽ khiến màu nhảy mỗi khi dữ liệu đổi. */}
        <Bar dataKey="value" name="Số tiền" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
