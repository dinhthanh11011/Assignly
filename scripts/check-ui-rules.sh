#!/usr/bin/env bash
# Canh vài luật giao diện có giá trị lâu dài của design system hiện tại
# (design-system/so-thu-chi/MASTER.md). Không phải luật thẩm mỹ — mỗi luật ở
# đây chặn một lỗi đã thấy thật: màu không đo được, chữ không co theo cỡ chữ
# người dùng chọn, control vô hình trên điện thoại, hàng tràn ngang.
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

# Màu đi qua token (globals.css) để check:contrast đo được và dark mode tự đổi.
check "Không dùng màu Tailwind thô — dùng token (bg-primary, text-income…)" \
      '\b(bg|text|border|ring|fill|stroke|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b'
check "Không màu hex viết tay trong className" \
      '(bg|text|border)-\[#'

# Cỡ chữ px cứng không co theo --font-scale.
check "Không cỡ chữ px tuỳ tiện — dùng thang text-* (rem)" \
      'text-\[[0-9.]+px'
check "Không đặt cỡ chữ bằng số trong JS — dùng rem hoặc var(--text-*)" \
      'fontSize: [0-9]|fontSize=\{[0-9]'

# Điện thoại không có hover.
check "Không affordance chỉ hiện khi hover" \
      'opacity-0[^\"]*group-hover:opacity'

# Lưới không khai cột ở breakpoint gốc → track auto không co dưới min-content,
# và ở cỡ chữ lớn cả thẻ tràn ngang. grid-cols-1 = repeat(1, minmax(0,1fr)).
grid_hits=$(grep -rnE 'grid gap-' src --include='*.tsx' || true)
if [ -n "$grid_hits" ]; then
  echo "✗ Lưới thiếu số cột ở breakpoint gốc — thêm grid-cols-1"
  echo "$grid_hits" | sed 's/^/    /'
  fail=1
else
  echo "✓ Lưới nào cũng khai báo cột ở breakpoint gốc"
fi
check "Track fr phải là minmax(0,1fr), không phải 1fr trần" \
      '(grid-cols-\[|_)1fr'

exit $fail
