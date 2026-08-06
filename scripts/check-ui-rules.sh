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

# Lưới không khai báo cột ở breakpoint gốc → cột ngầm là `auto`, mà track `auto`
# KHÔNG BAO GIỜ co xuống dưới min-content của nội dung. Ở cỡ chữ lớn (fs-lg,
# fs-xl) min-content của một hàng vượt bề rộng điện thoại, thế là cả thẻ tràn ra
# ngoài màn hình — min-w-0 và truncate bên trong không cứu được, vì chúng không
# làm giảm phần đóng góp min-content. `grid-cols-1` của Tailwind là
# repeat(1, minmax(0,1fr)) — chính cái min 0 đó mới cho phép co lại.
# segmented.tsx được miễn: nó đặt grid-template-columns bằng inline style.
grid_hits=$(grep -rnE 'grid gap-' src --include='*.tsx' | grep -v 'segmented\.tsx' || true)
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

if [ "$fail" -ne 0 ]; then
  echo
  echo "Xem quy tắc đầy đủ ở đầu src/components/page-shell.tsx."
fi
exit $fail
