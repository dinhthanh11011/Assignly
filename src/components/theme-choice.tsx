"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { ChoiceGroup } from "@/components/ui/choice-group";

/**
 * Chọn nền sáng / tối / theo máy — ba ô rõ ràng thay cho một nút bật tắt.
 *
 * Mặc định của app là NỀN SÁNG. Chữ đen trên nền sáng đọc tốt hơn có đo được,
 * và khoảng cách đó tăng theo tuổi. Ngoài ra chữ sáng trên nền tối bị loé trong
 * mắt có độ đục thuỷ tinh thể, mà loé nặng nhất ở nét mảnh tương phản cao —
 * dấu thanh tiếng Việt đúng là nét mảnh tương phản cao.
 *
 * "Theo máy" vẫn giữ cho ai muốn, nhưng không phải mặc định: rất nhiều điện
 * thoại xuất xưởng đã bật sẵn nền tối mà chủ máy chưa hề chọn.
 */

const OPTIONS = [
  { value: "light", label: "Nền sáng", icon: Sun },
  { value: "dark", label: "Nền tối", icon: Moon },
  { value: "system", label: "Theo máy", icon: Monitor },
] as const;

const subscribeNever = () => () => {};

export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  // Lần render trên server và lần render đầu ở client phải giống nhau, nếu
  // không React sẽ báo lệch hydration. useSyncExternalStore cho ta "đã mount
  // chưa" mà không cần setState trong effect.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  return (
    <ChoiceGroup
      label="Nền sáng hay tối"
      variant="card"
      // "" khi chưa hydrate: cả nhóm vẫn là MỘT điểm dừng Tab, chỉ là chưa có ô
      // nào được đánh dấu — đúng trạng thái thật ở lần render đầu.
      value={mounted ? (theme ?? "") : ""}
      onChange={setTheme}
      options={OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
    />
  );
}
