import { daysSince, formatDate } from "@/lib/utils";

/**
 * Câu chữ riêng của khu quản trị.
 *
 * Cùng nguyên tắc với `src/lib/copy.ts`: một con số cần chủ ngữ và vị ngữ.
 * "30" không nói được gì, "30 ngày trước" thì có. Khác biệt duy nhất là người
 * đọc ở đây là người vận hành app chứ không phải người ghi sổ, nên được phép
 * gọi tên sự vật trong hệ thống ("tài khoản", "quyền quản trị") thay vì nói
 * vòng.
 */

/**
 * "Lần cuối mở app" thành câu người đọc được.
 *
 * `null` KHÔNG có nghĩa là chưa bao giờ dùng app — cột `lastSeenAt` mới có từ
 * bản này, nên mọi người đều null cho tới lần mở app kế tiếp của họ. Nói "chưa
 * bao giờ" ở đây là nói sai về hầu hết người dùng cũ.
 */
export function lastSeenText(lastSeenAt: Date | null): string {
  if (!lastSeenAt) return "Chưa ghi nhận được";
  const d = daysSince(lastSeenAt);
  if (d === 0) return "Hôm nay";
  if (d === 1) return "Hôm qua";
  if (d < 30) return `${d} ngày trước`;
  return formatDate(lastSeenAt);
}

/** Nhãn trạng thái tài khoản. Màu không bao giờ đi một mình — luôn kèm chữ. */
export function accountStatusLabel(u: { disabledAt: Date | null; isAdmin: boolean }): {
  label: string;
  variant: "muted" | "destructive" | "accent";
} {
  if (u.disabledAt) return { label: "Đã khoá", variant: "destructive" };
  if (u.isAdmin) return { label: "Quản trị", variant: "accent" };
  return { label: "Bình thường", variant: "muted" };
}

/**
 * Câu giải thích vì sao không có nút xoá tài khoản.
 *
 * Hiện thẳng trên trang chi tiết, kể cả khi người đó chưa ghi gì: việc app cố ý
 * không cho xoá user là một quyết định, không phải một tính năng bị quên, và
 * người vận hành cần đọc được lý do ngay chỗ họ đi tìm nút xoá.
 */
export function deletionBlockerText(b: { authored: number; ownedSharedGroups: number }): string {
  const parts: string[] = [];
  if (b.authored > 0) parts.push(`${b.authored} bản ghi do họ tạo`);
  if (b.ownedSharedGroups > 0) parts.push(`${b.ownedSharedGroups} sổ chung họ đứng tên`);

  if (parts.length === 0) {
    return "Tài khoản này chưa tạo bản ghi nào. Dù vậy app vẫn không xoá tài khoản — khoá lại là đủ, và giữ được dữ liệu nếu sau này cần đối chiếu.";
  }
  return `Không xoá được tài khoản này: còn ${parts.join(" và ")}. Xoá sẽ vừa hỏng ràng buộc dữ liệu, vừa kéo theo sổ chung cùng khoản ghi của những người khác. Hãy khoá tài khoản, và chuyển quyền những sổ họ đứng tên cho người khác.`;
}
