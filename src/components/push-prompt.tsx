"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ensurePushSubscription, isPushSupported } from "@/lib/push-client";

const DISMISS_KEY = "push-prompt-dismissed";
const VISITS_KEY = "push-prompt-visits";
/**
 * Cao hơn MIN_VISITS = 2 của InstallPrompt, và đó là cả mục đích: hai thanh mời
 * dùng chung một khung xếp chồng ở đáy màn (xem (app)/layout.tsx), nên nếu cùng
 * ngưỡng thì người dùng mới gặp cả hai chồng lên nhau trong cùng một lượt ghé.
 * Lệch ngưỡng là cách rẻ và tất định để giãn chúng ra; một hàng đợi "mỗi lúc
 * một thanh" là câu trả lời đúng hơn nhưng là cả một lớp trừu tượng mới cho
 * đúng hai phần tử.
 */
const MIN_VISITS = 3;
/** Sau DELAY_MS = 2500 của InstallPrompt: cùng lý do giãn như MIN_VISITS. */
const DELAY_MS = 5000;

/**
 * Thanh MỜI bật thông báo. Không tự xin quyền.
 *
 * Bản cũ gọi thẳng `Notification.requestPermission()` ngay lần đầu app khởi
 * động — không cần cử chỉ nào của người dùng, và trước cả khi họ có một cuốn sổ
 * hay ghi được một khoản. Trên Chrome, tương tác ĐẦU TIÊN của người dùng với
 * app là một hộp thoại quyền của trình duyệt hỏi về một tính năng họ chưa hề
 * thấy. Bị bấm "Chặn" ở đó là chặn vĩnh viễn: không có đường xin lại.
 *
 * Giờ quyền chỉ được xin từ trong `enable()`, tức là sau một cú chạm thật, và
 * thanh mời chỉ hiện khi người dùng đã có sổ và đã quay lại vài lần.
 */
export function PushPrompt({
  vapidPublicKey,
  hasGroup,
}: {
  vapidPublicKey: string;
  /** Chưa có sổ thì chưa có gì để thông báo — đừng hỏi. */
  hasGroup: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!vapidPublicKey || !isPushSupported()) return;
    // Đã từ chối thì tôn trọng, không hỏi lại (trình duyệt cũng sẽ chặn).
    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      // Đã cho quyền nhưng subscription có thể mất (cài lại app, xoá dữ liệu
      // site). Nhánh này không xin quyền gì nên không cần cử chỉ.
      ensurePushSubscription(vapidPublicKey).catch(() => {});
      return;
    }

    if (!hasGroup) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    try {
      const visits = Number(localStorage.getItem(VISITS_KEY)) + 1 || 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      if (visits < MIN_VISITS) return;
    } catch {
      // Chế độ riêng tư chặn localStorage — cứ hiện thanh mời, nó vô hại.
    }

    // Hoãn một nhịp thay vì hiện ngay: thanh mời đè lên đáy màn, mà lúc trang
    // vừa tải xong người dùng còn đang đọc chứ chưa muốn quyết định gì.
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [vapidPublicKey, hasGroup]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, "1");
        return;
      }
      await ensurePushSubscription(vapidPublicKey);
      setVisible(false);
      toast.success("Đã bật thông báo 🔔");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    // Vị trí do khung xếp chồng ở app layout quyết định.
    <div className="surface-float pointer-events-auto rounded-2xl p-4">
      <div className="flex gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold">Bật thông báo</p>
            <p className="text-body text-muted-foreground">
              Để được nhắc khi có người trong sổ ghi khoản mượn mới hoặc ghi nhận thu/trả nợ. Bạn
              đổi ý lúc nào cũng được trong Cài đặt.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="gradient" onClick={enable} disabled={busy}>
              Bật thông báo
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
              Để sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
