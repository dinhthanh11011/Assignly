"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLedgerRevision } from "@/lib/actions";

/**
 * TỰ TẢI LẠI TRANG KHI SỔ CHUNG ĐÃ ĐỔI Ở MÁY NGƯỜI KHÁC.
 *
 * Vấn đề nó chữa: `revalidateGroup` trong actions.ts chỉ dọn cache PHÍA SERVER,
 * và chỉ trong request của người vừa bấm nút. Màn hình của những người còn lại
 * trong sổ vẫn giữ nguyên HTML dựng từ lúc họ mở trang — có thể từ sáng — cho
 * tới khi họ tự chuyển trang hoặc vuốt để tải lại. Trong một cái sổ năm người
 * cùng ghi, thứ đang hiện trên màn hình là bản chụp của một quá khứ mà không ai
 * nói cho họ biết.
 *
 * ── MỘT CÂU HỎI, BA LÚC HỎI ─────────────────────────────────────────────────
 *
 * Câu hỏi luôn là `getLedgerRevision(groupId)`: `Group.revision` của sổ đang hiện
 * trên màn hình, tăng 1 mỗi khi dữ liệu sổ đổi. Lớn hơn số mà trang này được dựng
 * cùng (prop `revision`) thì mới `router.refresh()`. Ba lúc hỏi:
 *
 *  · **Đang mở và đang nhìn** — mỗi `NHIP_MS`. Đây là lúc quan trọng nhất và là
 *    lúc trước đây không có gì cả: hai người ngồi cùng bàn, một người ghi khoản
 *    vừa trả, người kia đang cầm máy nhìn thẳng vào danh sách. Không có nhịp này
 *    thì họ nhìn mãi một danh sách thiếu khoản đó.
 *  · **Quay lại tab / quay lại cửa sổ** — lúc dễ đã lỡ mất nhiều thay đổi nhất.
 *  · **Vừa có web push** — `notifyOtherMembers` đã đẩy push ở vài việc (khoản
 *    vay mới, vừa trả tiền); service worker chuyển tiếp vào đây (xem `sw.js`).
 *    Nó không phủ hết mọi thay đổi, nhưng ở đâu có nó thì tin về gần như tức thì.
 *
 * ── VÌ SAO HỎI TRƯỚC CHỨ KHÔNG REFRESH THẲNG ────────────────────────────────
 *
 * `router.refresh()` dựng lại TOÀN BỘ server component của trang: danh sách giao
 * dịch, tổng theo ngày, khoản chưa rõ tiền, chuông thông báo. Gọi nó mỗi nhịp là
 * bắt server làm lại ngần ấy việc cho một cái sổ mà phần lớn thời gian chẳng ai
 * đụng vào. Câu hỏi kia chỉ là một lần đọc theo khoá chính, và câu trả lời giống
 * hệt lần trước chính là câu trả lời thường gặp nhất.
 *
 * ── VÌ SAO SO VỚI SỐ ĐÃ DỰNG TRANG, KHÔNG PHẢI SỐ HỎI LẦN TRƯỚC ─────────────
 *
 * Người dùng tự sửa một khoản: action tăng revision rồi `revalidatePath` dựng lại
 * trang, và lần dựng đó mang luôn số mới xuống qua prop. Nhịp hỏi sau thấy số trên
 * server BẰNG số của trang → không tải lại lần hai. Trang lấy từ cache của router
 * (`staleTimes`, tới 30s) thì mang số cũ, và lần hỏi đầu tiên thấy ngay là đã cũ.
 *
 * ── NHỮNG THỨ CỐ Ý KHÔNG LÀM ────────────────────────────────────────────────
 *
 * Không hỏi khi tab bị ẩn. Máy để trong túi cả buổi chiều mà vẫn nhịp nhàng hỏi
 * server là tốn pin của người dùng cho một màn hình không ai nhìn.
 *
 * Không `location.reload()`. `router.refresh()` chỉ lấy lại phần server rồi hoà
 * vào cây hiện tại, nên state phía client còn nguyên: hộp thoại đang mở vẫn mở,
 * ô đang gõ dở vẫn còn chữ, chỗ đang cuộn không nhảy đi đâu. Một `reload()` giữa
 * lúc ai đó nhập dở là cách làm mất công của họ.
 *
 * Không có WebSocket / SSE. Chúng đòi một kết nối mở cho mỗi tab, mà app này
 * chạy trên serverless; cái giá đó không tương xứng với một cái sổ chi tiêu.
 */

/** Nhịp hỏi khi tab đang được nhìn. */
const NHIP_MS = 20_000;

/**
 * Hai lần tải lại phải cách nhau ít nhất ngần này.
 *
 * Một push và một nhịp hỏi có thể rơi vào cùng một khoảnh khắc, và mỗi cái một
 * `router.refresh()` thì lần thứ hai chỉ lấy lại đúng thứ lần thứ nhất vừa lấy.
 */
const CACH_NHAU_MS = 5_000;

/**
 * Đừng đặt trực tiếp — trang dùng `LedgerLiveRefresh` (server component), nó
 * đọc `revision` cùng lượt dựng trang rồi truyền xuống đây.
 */
export function LiveRefresh({ groupId, revision }: { groupId: string; revision: number }) {
  const router = useRouter();
  // Ref chứ không phải dependency của effect: mỗi lần trang dựng lại là một số
  // mới, mà dựng lại nhịp hỏi (và hỏi ngay một lượt) mỗi lần như vậy là thừa.
  const daDung = useRef(revision);
  useEffect(() => {
    daDung.current = revision;
  }, [revision]);

  useEffect(() => {
    let lanCuoi = 0;
    let huy = false;
    /** Chặn hai lượt hỏi chồng lên nhau khi mạng chậm hơn một nhịp. */
    let dangHoi = false;

    const taiLai = () => {
      const now = Date.now();
      if (now - lanCuoi < CACH_NHAU_MS) return;
      lanCuoi = now;
      router.refresh();
    };

    const hoi = async () => {
      if (huy || dangHoi || document.visibilityState !== "visible") return;
      dangHoi = true;
      try {
        const res = await getLedgerRevision(groupId);
        if (huy || !res.ok || res.data === null) return;
        // Bị nhịp chặn cũng không sao: số của trang vẫn cũ, nên lần hỏi sau lại
        // thấy chênh và thử lại — không có trạng thái nào để lỡ ghi sai.
        if (res.data > daDung.current) taiLai();
      } catch {
        // Mất mạng, hoặc phiên đăng nhập vừa hết. Không có gì để báo và cũng
        // không có gì để làm — nhịp sau tự thử lại.
      } finally {
        dangHoi = false;
      }
    };

    /** Quay lại nhìn tab: hỏi ngay, đừng đợi hết nhịp. */
    const quayLai = () => {
      if (document.visibilityState !== "visible") return;
      void hoi();
    };

    const doiTamNhin = () => {
      if (document.visibilityState === "visible") quayLai();
    };

    /** Tín hiệu từ service worker: vừa có push, tức sổ vừa đổi ở đâu đó. */
    const onMessage = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type !== "so-da-doi") return;
      // Tab bị ẩn thì bỏ qua, KHÔNG cần nhớ lại: lúc người dùng quay về,
      // `quayLai` hỏi một lượt và câu trả lời đã gồm luôn thay đổi này.
      void hoi();
    };

    void hoi();
    const nhip = setInterval(() => void hoi(), NHIP_MS);

    // `visibilitychange` KHÔNG bắn khi người dùng chuyển sang cửa sổ khác trên
    // máy tính — tab vẫn "visible", chỉ là không còn được nhìn nữa. `focus` bắt
    // nốt trường hợp đó, và cả hai đi chung một đường nên không thêm nhánh nào.
    document.addEventListener("visibilitychange", doiTamNhin);
    window.addEventListener("focus", quayLai);
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      huy = true;
      clearInterval(nhip);
      document.removeEventListener("visibilitychange", doiTamNhin);
      window.removeEventListener("focus", quayLai);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [router, groupId]);

  return null;
}
