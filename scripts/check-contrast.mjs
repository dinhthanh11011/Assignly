// Bảo vệ các ngưỡng tương phản của bảng màu (xem đầu src/app/globals.css).
//
// Vì sao cần script này: mọi token màu trong app viết bằng oklch, mà oklch KHÔNG
// cho đọc ra tỉ lệ tương phản bằng mắt — hai màu cùng L trông "ngang nhau" vẫn
// có thể lệch nhau cả bậc AA tuỳ hue. Hai đợt chỉnh màu gần đây đều có token
// tuột xuống dưới 4.5:1 mà không ai thấy, cho tới khi tính ra số.
//
// Script đọc THẲNG globals.css chứ không giữ bản chép của bảng màu: một bản chép
// sẽ lệch khỏi thực tế ngay lần sửa màu đầu tiên, và lúc đó nó bảo đảm cho một
// bảng màu không còn tồn tại.
//
// Kiểm hai thứ:
//   1. Tỉ lệ tương phản WCAG — chữ ≥4.5:1, đối tượng đồ hoạ ≥3:1, đo trên CẢ BA
//      bề mặt (thẻ / nền trang / bề mặt chìm), không chỉ trên nền trắng.
//   2. Nằm trong gamut sRGB — oklch cho phép viết ra màu ngoài gamut, trình duyệt
//      sẽ cắt, và màu hiện ra không còn là màu đã khai báo (hue lệch, tỉ lệ vừa
//      đo thành vô nghĩa).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/app/globals.css"), "utf8");

/** oklch -> linear sRGB (Björn Ottosson). Chưa clamp: cần giá trị thô để soi gamut. */
function toLinearSrgb([L, C, hDeg]) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const clamp = (x) => Math.min(1, Math.max(0, x));
const luminance = (v) => 0.2126 * clamp(v[0]) + 0.7152 * clamp(v[1]) + 0.0722 * clamp(v[2]);
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const toHex = (v) =>
  "#" +
  v
    .map((x) => {
      const c = clamp(x);
      const s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      return Math.round(s * 255).toString(16).padStart(2, "0");
    })
    .join("");
// Biên 0.002 bỏ qua sai số làm tròn của chính phép đổi màu.
const inGamut = (v) => v.every((x) => x >= -0.002 && x <= 1.002);

/** Bóc các khai báo `--x: oklch(L C H)` trong một khối selector. */
function readTokens(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Không tìm thấy khối "${selector}" trong globals.css`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const tokens = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])].map(Number);
  }
  return tokens;
}

/* Chữ thường 17px không phải "large text" theo WCAG, nên mọi token dùng làm màu
   chữ đều phải đạt 4.5:1 — kể cả khi trong app nó hay xuất hiện ở cỡ lớn. */
const TEXT = [
  "foreground",
  "muted-foreground",
  "primary",
  "income",
  "expense",
  "warning",
  "weekend-sun",
  "weekend-sat",
];
/* accent CHỈ dùng trong biểu đồ → đối tượng đồ hoạ, ngưỡng 3:1. Đem nó đi làm
   màu chữ thì phải chuyển nó xuống danh sách TEXT ở trên và hạ độ sáng. */
const GRAPHICAL = ["accent"];
/* Cặp chữ-trên-chip-cùng-màu: chip là mảng nền lớn nhất mang màu trong app. */
const ON_SURFACE = ["income", "expense", "warning", "primary"];

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`✗ ${msg}`);
};

for (const [mode, selector] of [
  ["Nền sáng", ":root {"],
  ["Nền tối", ".dark {"],
]) {
  const t = readTokens(selector);
  const rgb = (name) => toLinearSrgb(t[name]);
  // :root khai --card: oklch(1 0 0); .dark khai giá trị riêng. Cả hai đều có mặt.
  const surfaces = { thẻ: rgb("card"), "nền trang": rgb("background"), "bề mặt chìm": rgb("sunken") };

  for (const [name, value] of Object.entries(t)) {
    if (!inGamut(toLinearSrgb(value))) {
      fail(`${mode}: --${name} nằm ngoài gamut sRGB — trình duyệt sẽ cắt và hue lệch đi`);
    }
  }

  for (const name of TEXT) {
    if (!t[name]) continue;
    for (const [surfaceName, surface] of Object.entries(surfaces)) {
      const r = contrast(rgb(name), surface);
      if (r < 4.5) fail(`${mode}: --${name} trên ${surfaceName} chỉ ${r.toFixed(2)}:1, cần ≥4.5`);
    }
  }

  for (const name of GRAPHICAL) {
    if (!t[name]) continue;
    const r = contrast(rgb(name), surfaces["thẻ"]);
    if (r < 3) fail(`${mode}: --${name} (đồ hoạ) trên thẻ chỉ ${r.toFixed(2)}:1, cần ≥3`);
  }

  for (const name of ON_SURFACE) {
    if (!t[name] || !t[`${name}-surface`]) continue;
    const r = contrast(rgb(name), rgb(`${name}-surface`));
    if (r < 4.5) fail(`${mode}: --${name} trên --${name}-surface chỉ ${r.toFixed(2)}:1, cần ≥4.5`);
  }

  // Viền của thứ BẤM ĐƯỢC: WCAG 1.4.11, đo màu chứ không đo bề dày.
  for (const [surfaceName, surface] of Object.entries(surfaces)) {
    const r = contrast(rgb("border-strong"), surface);
    if (r < 3) fail(`${mode}: --border-strong trên ${surfaceName} chỉ ${r.toFixed(2)}:1, cần ≥3`);
  }

  const onPrimary = contrast(rgb("primary-foreground"), rgb("primary"));
  if (onPrimary < 4.5)
    fail(`${mode}: --primary-foreground trên --primary chỉ ${onPrimary.toFixed(2)}:1, cần ≥4.5`);

  // Thẻ tách khỏi nền bằng chính độ sáng, vì thẻ không còn đổ bóng nữa.
  const step = contrast(surfaces["nền trang"], surfaces["thẻ"]);
  if (step < 1.03)
    fail(
      `${mode}: nền trang và thẻ chỉ chênh ${step.toFixed(3)}:1 — thẻ sẽ tan vào nền, ` +
        `chỉ còn viền 1px giữ ranh giới`
    );

  if (!failures) {
    console.log(
      `✓ ${mode}: nền ${toHex(surfaces["nền trang"])} · thẻ ${toHex(surfaces["thẻ"])} · ` +
        `primary ${toHex(rgb("primary"))} — mọi ngưỡng đạt, mọi token trong gamut`
    );
  }
}

if (failures) {
  console.log(`\n${failures} lỗi. Xem phần "Design tokens" ở đầu src/app/globals.css.`);
  process.exit(1);
}
