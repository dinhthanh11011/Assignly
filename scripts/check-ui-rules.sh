#!/usr/bin/env bash
# Bảo vệ các quy tắc giao diện của đợt thiết kế lại (xem đầu page-shell.tsx).
#
# Những thứ dưới đây không phải chuyện thẩm mỹ — chúng chính là lý do người dùng
# báo app "rối quá, không rõ ràng và khó hiểu". Để chúng lặng lẽ quay lại thì
# vài tháng nữa lại phải làm lại từ đầu.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
check() { # <mô tả> <regex>
  local desc="$1" re="$2" hits
  hits=$(grep -rnE "$re" src --include='*.tsx' || true)
  if [ -n "$hits" ]; then
    echo "✗ $desc"
    echo "$hits" | sed 's/^/    /'
    fail=1
  else
    echo "✓ $desc"
  fi
}

check "Không cỡ chữ tuỳ tiện — dùng text-body / text-caption / text-label…" \
      'text-\[[0-9]'
check "Không viết hoa toàn chữ, không giãn/bóp chữ (dấu tiếng Việt vỡ ở cỡ nhỏ)" \
      '\b(uppercase|tracking-(tight|wide|widest|\[))'
check "Không đặt opacity lên màu chữ — thêm token nếu cần sắc độ khác" \
      'text-(foreground|muted-foreground|primary|income|expense|warning|destructive)/[0-9]'
check "Không tint alpha trên nền có chữ — dùng bg-*-surface đục, đo được" \
      'bg-(income|expense|warning|primary|accent|destructive|success)/[0-9]'
check "Không affordance chỉ hiện khi hover — điện thoại không có hover" \
      'opacity-0[^\"]*group-hover:opacity'
check "Không dùng lại lớp trang trí đã xoá (kính mờ, gradient hero…)" \
      '\b(glass|glass-edge|hero-panel|accent-gradient|brand-gradient|no-scrollbar|rise-in|num-lg|border-hairline|shadow-glow)\b'

# Thang chữ mặc định của Tailwind KHÔNG đi qua --font-scale, nên chữ đặt bằng nó
# đứng yên khi người dùng gạt sang "Chữ lớn" — mọi thứ quanh nó to lên, riêng nó
# thì không. Đây chính là cách `text-4xl` lọt vào hai ô trống: luật cỡ chữ cũ chỉ
# chặn `text-[Npx]`, không chặn các bậc có sẵn.
check "Không dùng thang chữ mặc định của Tailwind — app có thang 9 bậc riêng" \
      '(^|[^-a-z])text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)([^-a-z]|$)'

# Một thao tác bàn phím phải cho một vẻ ngoài. Trước đợt này 21 file tự viết
# vòng tiêu điểm và ra ba kiểu khác nhau (có offset / không / inset), cộng một
# bản dùng alpha trên token. Nay chỉ còn .focus-ring và .focus-ring-inset —
# chọn cái nào là chuyện hàng đó có bị cha cắt hay không, xem globals.css.
check "Vòng tiêu điểm chỉ đi qua .focus-ring / .focus-ring-inset" \
      'focus-visible:ring-\[|focus-visible:ring-[0-9]|ring-ring/[0-9]'

# Hạ opacity trên nét vẽ SVG không đo được và gần như luôn tuột dưới ngưỡng: vòng
# tiến độ của khoản nợ từng vẽ vành nền ở opacity-15 (~1.1:1), tức là vô hình,
# nên tỉ lệ "đã trả bao nhiêu" mất luôn. Dùng token viền — chúng có check:contrast
# đứng sau.
check "Không hạ opacity lên nét vẽ SVG — dùng token viền" \
      '(stroke|fill)-current[^"]*opacity-[0-9]'

# Cỡ chữ đặt bằng số trong JS cũng không co giãn theo --font-scale. Ngoại lệ duy
# nhất được ghi lý do là câu mẫu trong font-size-control (nó dùng template literal
# nên không khớp regex này).
check "Không đặt cỡ chữ bằng số trong JS — dùng rem hoặc var(--text-*)" \
      'fontSize: [0-9]|fontSize=\{[0-9]'

# Lưới không khai báo cột ở breakpoint gốc → cột ngầm là `auto`, mà track `auto`
# KHÔNG BAO GIỜ co xuống dưới min-content của nội dung. Ở cỡ chữ lớn (fs-md,
# fs-lg) min-content của một hàng vượt bề rộng điện thoại, thế là cả thẻ tràn ra
# ngoài màn hình — min-w-0 và truncate bên trong không cứu được, vì chúng không
# làm giảm phần đóng góp min-content. `grid-cols-1` của Tailwind là
# repeat(1, minmax(0,1fr)) — chính cái min 0 đó mới cho phép co lại.
grid_hits=$(grep -rnE 'grid gap-' src --include='*.tsx' || true)
if [ -n "$grid_hits" ]; then
  echo "✗ Lưới thiếu số cột ở breakpoint gốc — thêm grid-cols-1 (tràn ngang ở cỡ chữ lớn)"
  echo "$grid_hits" | sed 's/^/    /'
  fail=1
else
  echo "✓ Lưới nào cũng khai báo cột ở breakpoint gốc (grid-cols-1)"
fi

# Track fr trần = minmax(auto, 1fr): sàn min-content y như trên. Phải minmax(0,1fr).
check "Track fr phải là minmax(0,1fr), không phải 1fr trần" \
      '(grid-cols-\[|_)1fr'

check_except() { # <mô tả> <regex> <regex các file được miễn>
  local desc="$1" re="$2" allow="$3" hits
  hits=$(grep -rnE "$re" src --include='*.tsx' | grep -vE "$allow" || true)
  if [ -n "$hits" ]; then
    echo "✗ $desc"
    echo "$hits" | sed 's/^/    /'
    fail=1
  else
    echo "✓ $desc"
  fi
}

# Khai role mà không cài hành vi bàn phím đi kèm còn tệ hơn không khai: nó nói với
# máy đọc màn hình một cách dùng rồi cư xử theo cách khác. Năm control từng khai
# radiogroup/tablist mà cả `src` không có lấy một `tabIndex`. ui/choice-group.tsx
# là chỗ DUY NHẤT cài đúng (qua Radix RadioGroup), nên nó là chỗ duy nhất được
# sinh ra mấy role này.
check_except "role radio/tab chỉ được sinh từ ui/choice-group.tsx (nơi có roving tabIndex)" \
      'role="(radio|radiogroup|tab|tablist|tabpanel|switch)"' \
      'ui/choice-group\.tsx'

# Bậc bo góc 20px dành riêng cho TẤM NỔI — xem hợp đồng bo góc ở globals.css.
# Ô trống, thẻ, hàng đều nằm trong luồng: chúng không nổi lên cái gì cả.
check_except "Bậc bo góc lớn nhất chỉ dành cho tấm nổi (hộp thoại, menu, thanh nav, nút nổi)" \
      'rounded-2xl' \
      'ui/dialog\.tsx|ui/dropdown-menu\.tsx|ui/select\.tsx|app-nav\.tsx|install-prompt\.tsx|push-prompt\.tsx|quick-add\.tsx'

if [ "$fail" -ne 0 ]; then
  echo
  echo "Xem quy tắc đầy đủ ở đầu src/components/page-shell.tsx."
fi
exit $fail
