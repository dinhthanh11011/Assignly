"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { useNavTransition } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

/* Ba con số của cử chỉ, tính bằng px SAU giảm chấn (xem `giamChan`).
   NGUONG 72 tương ứng ngón tay đi thật khoảng 90px — đủ dài để không ai vô tình
   kích hoạt khi vuốt lướt danh sách, đủ ngắn để không phải kéo hết màn hình. */
const NGUONG = 72;
/** Chỗ chỉ báo đứng yên trong lúc chờ server. */
const NGHI = 56;
/** Kéo bao xa cũng không đi quá đây — cử chỉ có đáy, tay biết mình đã hết đường. */
const TOI_DA = 130;

/**
 * Đường cong giảm chấn: đi hết `TOI_DA` cần lực vô hạn.
 *
 * Ánh xạ 1:1 (kéo 200px thì chỉ báo tụt 200px) đọc ra như một tấm rèm bị tuột
 * chứ không phải một cái lò xo, và nó không cho tay biết đã qua ngưỡng hay chưa.
 * Hàm mũ cho đúng cảm giác của iOS: mềm lúc đầu, cứng dần về cuối.
 */
function giamChan(dy: number) {
  return TOI_DA * (1 - Math.exp(-dy / 95));
}

/** Có phần tử nào giữa `el` và gốc đang là hộp cuộn dọc và ĐANG cuộn dở không? */
function dangCuonBenTrong(el: EventTarget | null) {
  let node = el instanceof Element ? el : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.scrollTop > 0) {
      const oy = getComputedStyle(node).overflowY;
      if (oy === "auto" || oy === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Vuốt từ trên xuống để tải lại trang — cử chỉ mà mọi app điện thoại đều có.
 *
 * Vì sao phải TỰ VIẾT thay vì dùng cái sẵn của trình duyệt: app chạy standalone
 * (đã cài về màn hình chính) thì không còn thanh địa chỉ, mà pull-to-refresh của
 * Chrome/Safari sống trong thanh đó — người dùng mất hẳn cách làm mới. Thêm nữa
 * `html { overscroll-behavior-y: none }` (globals.css) cố tình tắt phần kéo quá
 * đà để không lộ dải trắng dưới thanh nav nổi, nên kể cả trong tab trình duyệt
 * cử chỉ gốc cũng đã tắt rồi.
 *
 * Và tải lại ở đây KHÔNG phải `location.reload()`: đó là dựng lại toàn bộ app
 * (mất theme đang tính, mất vị trí cuộn, tải lại hết JS). `router.refresh()` chỉ
 * hỏi lại server phần Server Component của đúng route hiện tại rồi trộn vào —
 * state của client (hộp thoại đang mở, ô đang gõ) và vị trí cuộn giữ nguyên.
 */
export function PullToRefresh() {
  const router = useRouter();
  // Dùng chung store của thanh tiến trình trên cùng: một lần kéo cho ra HAI phản
  // hồi ở hai chỗ mắt đang nhìn — vòng xoay dưới tay và vạch chạy trên đỉnh.
  const [dangCho, startTransition] = useNavTransition();
  const [keo, setKeo] = useState(0);
  const [dangTai, setDangTai] = useState(false);
  // Chỉ dùng cho việc BẬT/TẮT transition khi vẽ, nên phải là state chứ không
  // phải ref: giá trị này có tham gia vào kết quả render.
  const [dangKeo, setDangKeo] = useState(false);

  // Trạng thái của cử chỉ nằm trong ref chứ không phải state: chúng đổi ở mỗi
  // touchmove nhưng không có gì phải vẽ lại theo.
  const batDau = useRef<{ x: number; y: number } | null>(null);
  const batCuChi = useRef(false);
  // Bản gương của `keo` cho các handler đọc: nếu để handler phụ thuộc vào state
  // thì effect phải gắn lại listener ở MỖI touchmove (60 lần/giây).
  const keoRef = useRef(0);

  const dat = useCallback((v: number) => {
    keoRef.current = v;
    setKeo(v);
  }, []);

  // `dangTai` cũng cần bản ref vì handler đọc nó mà không được gắn lại theo nó.
  const dangTaiRef = useRef(false);
  useEffect(() => {
    dangTaiRef.current = dangTai;
  }, [dangTai]);

  const ketThuc = useCallback(() => {
    batDau.current = null;
    batCuChi.current = false;
    setDangKeo(false);
  }, []);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      ketThuc();
      // Hai ngón = đang phóng to, không phải kéo.
      if (e.touches.length !== 1 || dangTaiRef.current) return;
      // Hộp thoại Radix đang mở thì trang bị khoá cuộn — kéo cái nền phía sau
      // để tải lại đúng cái nền đó là vô nghĩa.
      if (document.body.hasAttribute("data-scroll-locked")) return;
      // Chỉ khi trang đã ở sát đỉnh. `<= 0` chứ không `=== 0`: iOS cho scrollTop
      // âm trong lúc nảy.
      if ((document.scrollingElement?.scrollTop ?? 0) > 0) return;
      if (dangCuonBenTrong(e.target)) return;
      const t = e.touches[0];
      batDau.current = { x: t.clientX, y: t.clientY };
    }

    function onMove(e: TouchEvent) {
      const goc = batDau.current;
      if (!goc || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dy = t.clientY - goc.y;
      const dx = t.clientX - goc.x;

      if (!batCuChi.current) {
        // Chưa quyết định hướng: chờ tới khi tay đi được 10px rồi mới nhận.
        // Nghiêng về ngang (dải tháng, các hàng vuốt) thì nhường hẳn, không
        // tranh cử chỉ.
        if (Math.abs(dx) > Math.abs(dy)) {
          ketThuc();
          return;
        }
        if (dy < 10) return;
        // Trang có thể đã bị cuộn xuống giữa chừng kể từ touchstart.
        if ((document.scrollingElement?.scrollTop ?? 0) > 0) {
          ketThuc();
          return;
        }
        batCuChi.current = true;
        setDangKeo(true);
      }

      if (dy <= 0) {
        // Kéo ngược trở lên quá điểm xuất phát: coi như huỷ, trả trang lại cho
        // cuộn bình thường.
        dat(0);
        ketThuc();
        return;
      }

      // Đã nhận cử chỉ thì chặn cuộn/nảy của trình duyệt, nếu không chỉ báo sẽ
      // đi xuống trong khi trang cũng nhích theo. Listener phải là passive:false
      // mới gọi được preventDefault.
      if (e.cancelable) e.preventDefault();
      dat(giamChan(dy));
    }

    function onEnd() {
      const daKeo = batCuChi.current;
      const du = keoRef.current >= NGUONG;
      ketThuc();
      if (!daKeo) return;
      if (!du) {
        dat(0);
        return;
      }
      dat(NGHI);
      setDangTai(true);
      startTransition(() => {
        router.refresh();
      });
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [dat, ketThuc, router, startTransition]);

  useEffect(() => {
    if (!dangTai) return;
    // `dangCho` còn bật nghĩa là server chưa trả — giữ vòng xoay ở nguyên chỗ.
    if (dangCho) return;
    // Nán lại một nhịp rồi mới thu về: refresh xong trong 80ms mà chỉ báo biến
    // mất ngay thì cú kéo đọc ra như không có gì xảy ra cả. Nhịp này cũng là lối
    // thoát cho trường hợp transition xong trước khi effect kịp thấy `dangCho`.
    const t = setTimeout(() => {
      setDangTai(false);
      dat(0);
    }, 320);
    return () => clearTimeout(t);
  }, [dangTai, dangCho, dat]);

  const san = Math.min(1, keo / NGUONG);

  return (
    <>
      <div
        aria-hidden
        // Trên header (z-40) nhưng dưới hộp thoại và thanh mời (z-50): chỉ báo
        // thuộc về trang, không phải một lớp nổi.
        className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[45] flex justify-center"
        style={{
          transform: `translate3d(0, ${keo}px, 0)`,
          // Trong lúc ngón tay còn trên màn hình thì KHÔNG transition: chỉ báo
          // phải dính theo tay. Chỉ lúc nhả ra mới cho nó bật về.
          transition: dangKeo
            ? undefined
            : "transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1)",
          // `keo === 0` là lúc không có cử chỉ nào: cất hẳn khỏi cây vẽ thay vì
          // để một vòng tròn trong suốt nằm đè lên đỉnh trang.
          visibility: keo > 0.5 ? undefined : "hidden",
        }}
      >
        <div
          className="flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-lift"
          style={{
          // Kéo tới đâu vòng quay tới đó — tay thấy được mình còn thiếu bao nhiêu.
          // Đủ ngưỡng thì icon đứng ở 180°, và màu đổi (xem dưới) để nói "nhả ra
          // là chạy" mà không cần thêm chữ.
            transform: dangTai ? undefined : `rotate(${san * 180}deg)`,
            opacity: dangTai ? 1 : Math.min(1, keo / 24),
          }}
        >
          <RotateCw
            className={cn(
              "size-5 transition-colors",
              dangTai && "animate-spin",
              san >= 1 || dangTai ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
      </div>
      {/* Người dùng đọc màn hình không có cử chỉ này, nhưng nếu họ kích hoạt được
          thì vẫn phải nghe thấy kết quả. Nằm NGOÀI khối aria-hidden ở trên. */}
      <span role="status" className="sr-only">
        {dangTai ? "Đang tải lại trang" : ""}
      </span>
    </>
  );
}
