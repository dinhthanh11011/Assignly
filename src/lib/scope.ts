import { cookies } from "next/headers";

/**
 * Sổ đang xem được ghim vào cookie, không phải vào URL: đổi sổ một lần là mọi
 * trang (tổng quan, giao dịch, vay nợ, báo cáo, cân đối, danh mục) đều theo sổ
 * đó cho tới khi người dùng tự đổi sang sổ khác — kể cả sau khi tải lại trang
 * hay mở lại app.
 *
 * `?group=` trên URL vẫn được tôn trọng như một lần xem tạm (link chia sẻ, mở
 * tab mới) và `setActiveGroup` sẽ ghim lại khi người dùng bấm chọn thật.
 */
export const ACTIVE_GROUP_COOKIE = "sothuchi.group";

/**
 * Tên cũ từ hồi app còn mang tên khác. Vẫn ĐỌC nó, không ghi nữa: cookie sống một
 * năm, nên đổi tên mà không đọc bản cũ thì mọi người đang dùng app bỗng bị nhảy về
 * sổ mặc định — với người có ba bốn cuốn sổ thì đó là ghi tiền vào sai sổ. Lần
 * `setActiveGroup` kế tiếp sẽ ghi sang tên mới và xoá bản cũ đi.
 */
const LEGACY_GROUP_COOKIE = "assignly.group";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function readActiveGroupId() {
  const jar = await cookies();
  return jar.get(ACTIVE_GROUP_COOKIE)?.value ?? jar.get(LEGACY_GROUP_COOKIE)?.value;
}

/** Chỉ gọi được trong server action / route handler (HTTP không cho set cookie khi đã stream). */
export async function writeActiveGroupId(groupId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_GROUP_COOKIE, groupId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  jar.delete(LEGACY_GROUP_COOKIE);
}

/** Bỏ ghim — dùng khi sổ đang ghim bị xoá hoặc người dùng rời khỏi nó. */
export async function clearActiveGroupId(onlyIfIs?: string) {
  const jar = await cookies();
  const pinned = jar.get(ACTIVE_GROUP_COOKIE)?.value ?? jar.get(LEGACY_GROUP_COOKIE)?.value;
  if (onlyIfIs && pinned !== onlyIfIs) return;
  jar.delete(ACTIVE_GROUP_COOKIE);
  jar.delete(LEGACY_GROUP_COOKIE);
}
