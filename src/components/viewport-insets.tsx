"use client";
import { useEffect } from "react";

/**
 * Đo vùng nhìn thấy thật (visual viewport) và đẩy ra ba biến CSS trên <html>:
 *
 *   --vvh  chiều cao đang thật sự nhìn thấy được (px)
 *   --vvt  vùng nhìn thấy đó đang bị đẩy xuống bao nhiêu so với đỉnh trang (px)
 *   --kb   BÀN PHÍM ẢO đang che mất bao nhiêu px tính từ đáy trang
 *
 * và đặt `data-keyboard="open"` khi --kb > 0.
 *
 * VÌ SAO CẦN: bottom sheet là `position: fixed; bottom: 0`, mà toạ độ của
 * `fixed` neo theo LAYOUT viewport — thứ mà bàn phím ảo không hề làm co lại
 * trên iOS. Bàn phím mở ra là nó phủ thẳng lên đáy sheet: nút "Ghi khoản này"
 * và mấy ô cuối form nằm DƯỚI bàn phím, và cuộn bên trong sheet cũng không
 * lôi chúng ra được vì cái bị che là chính khung sheet chứ không phải nội dung.
 *
 * `interactive-widget: resizes-content` (xem app/layout.tsx) chỉ chữa được
 * Chrome Android, và cách nó chữa là vừa co layout viewport vừa tự cuộn trang
 * — hai lần bù cho cùng một việc, nên sheet bị nhấc quá tay và hở một dải nền
 * ở đáy. Nay layout viewport để yên, còn phần bàn phím che thì đo lấy.
 *
 * CÁCH ĐO. Không thể lấy `innerHeight - vv.height` làm chiều cao bàn phím:
 * hiệu đó cũng bao gồm thanh công cụ của trình duyệt (thanh địa chỉ Safari co
 * vào/nhả ra theo lúc cuộn), nên sheet sẽ bị nhấc lên vài chục px ngay cả khi
 * chẳng có bàn phím nào — đúng cái khe hở cần tránh. Thay vào đó giữ một mốc
 * `rest`: chiều cao vùng nhìn thấy lúc KHÔNG có ô nhập nào đang được focus.
 * Thanh công cụ gần như không đổi trong lúc đang gõ, nên hiệu so với mốc đó là
 * bàn phím, không phải thanh công cụ.
 */
export function ViewportInsets() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    /** Chiều cao vùng nhìn thấy khi chưa có bàn phím — mốc để trừ. */
    let rest = vv.height;
    let frame = 0;

    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return Boolean(
        el?.matches(
          'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]),textarea,[contenteditable="true"]'
        )
      );
    };

    const apply = () => {
      frame = 0;
      const raw = rest - vv.height - vv.offsetTop;
      // Ngưỡng 60px: dưới mức đó là dao động của thanh công cụ / thanh trạng
      // thái chứ không phải bàn phím. Nhấc sheet lên vì mấy px đó chỉ tạo khe hở.
      const kb = raw > 60 ? Math.round(raw) : 0;
      // Chỉ lấy mốc mới khi CHẮC CHẮN không có bàn phím: không ô nhập nào đang
      // focus VÀ vùng nhìn thấy đang không bị che. Bỏ điều kiện thứ hai thì lúc
      // người dùng bấm một cái nút trong sheet (focus rời ô nhập nhưng bàn phím
      // còn đang thu vào) mốc sẽ bị ghi bằng chiều cao lúc bàn phím CÒN mở, và
      // từ đó về sau mọi phép trừ đều lệch.
      if (!typing() && kb === 0) rest = vv.height;

      root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      root.style.setProperty("--vvt", `${Math.round(vv.offsetTop)}px`);
      root.style.setProperty("--kb", `${kb}px`);
      if (kb > 0) root.dataset.keyboard = "open";
      else delete root.dataset.keyboard;
    };

    // Gộp nhiều sự kiện trong cùng một khung hình: bàn phím mở ra bắn resize +
    // scroll liên tục suốt animation, mỗi lần ghi biến CSS là một lần layout.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    // focusin/focusout không làm vùng nhìn thấy đổi, nhưng chúng đổi câu trả
    // lời của typing() — tức đổi cả mốc `rest` và --kb.
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      window.removeEventListener("orientationchange", schedule);
      for (const v of ["--vvh", "--vvt", "--kb"]) root.style.removeProperty(v);
      delete root.dataset.keyboard;
    };
  }, []);

  return null;
}
