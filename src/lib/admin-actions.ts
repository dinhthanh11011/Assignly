"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hasBootstrapAdmins, isBootstrapAdminEmail, requireAdmin } from "@/lib/admin";
import { notifyUser } from "@/lib/push";

/**
 * Thao tác quản trị toàn hệ thống.
 *
 * **Mỗi hàm ở đây tự gọi `requireAdmin()`, và đó không phải phòng thủ nhiều lớp
 * cho yên tâm — đó là ranh giới DUY NHẤT.** Chốt quyền ở `app/admin/layout.tsx`
 * chỉ chặn việc mở trang; server action là một endpoint riêng, ai biết tên cũng
 * gọi thẳng được mà không đi qua layout nào cả.
 *
 * Mọi chốt chặn đều kiểm ở đây, kể cả khi giao diện đã làm mờ nút tương ứng —
 * nút mờ là lời giải thích cho người dùng, không phải một biện pháp bảo vệ.
 */

const Id = z.string().min(1);

/* ─── Quyền quản trị ─────────────────────────────────────────────────────── */

export async function setUserAdmin(userIdInput: string, isAdminInput: boolean) {
  const actorId = await requireAdmin();
  const userId = Id.parse(userIdInput);
  const isAdmin = z.boolean().parse(isAdminInput);

  // Chặn tự đổi quyền của chính mình. Một câu này lo luôn trường hợp tự khoá
  // mình ra khỏi /admin — thứ không có cách nào chữa từ trong giao diện.
  if (userId === actorId) {
    throw new Error("Không tự đổi quyền quản trị của chính mình được — nhờ một quản trị viên khác.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, isAdmin: true },
  });
  if (!target) throw new Error("Không tìm thấy người này");

  if (!isAdmin) {
    if (isBootstrapAdminEmail(target.email)) {
      throw new Error(
        "Người này là quản trị viên theo biến môi trường ADMIN_EMAILS, không gỡ được từ đây. Sửa ADMIN_EMAILS rồi khởi động lại app.",
      );
    }
    // Không để app rơi vào trạng thái không còn ai vào được /admin. Nếu
    // ADMIN_EMAILS có người thì luôn còn đường vào, nên cho phép.
    const remaining = await prisma.user.count({
      where: { isAdmin: true, disabledAt: null, id: { not: userId } },
    });
    if (remaining === 0 && !hasBootstrapAdmins()) {
      throw new Error(
        "Đây là quản trị viên cuối cùng. Gỡ quyền xong sẽ không ai vào được trang quản trị nữa. Hãy phong cho người khác trước, hoặc đặt ADMIN_EMAILS trong biến môi trường.",
      );
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { isAdmin } });

  if (isAdmin) {
    await notifyUser(userId, "ADMIN_GRANTED", {
      title: "Bạn được cấp quyền quản trị",
      body: "Bạn xem được toàn bộ người dùng, sổ và tình hình sử dụng của app.",
      url: "/admin",
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  // Hàng "Bảng quản trị" ở Cài đặt của người này vừa đổi trạng thái hiện/ẩn.
  revalidatePath("/settings");
}

/* ─── Khoá / mở khoá tài khoản ───────────────────────────────────────────── */

/**
 * Khoá tài khoản — và đây là thứ thay thế cho việc "xoá người dùng".
 *
 * App KHÔNG xoá tài khoản, có chủ ý. `Transaction/Loan/LoanPayment/Settlement`
 * đều trỏ tới `User.createdById` với `onDelete: Restrict`, nên xoá một người
 * từng ghi bất cứ thứ gì sẽ ném lỗi khoá ngoại; trong khi `Group.ownerId` lại
 * `Cascade`, nên cùng cú xoá đó sẽ kéo theo mọi sổ họ đứng tên cùng toàn bộ
 * khoản ghi của NHỮNG NGƯỜI KHÁC trong sổ. Thêm nữa `Transaction.paidById` là
 * `SetNull`, mà null nghĩa là "người ghi đã trả" — nên xoá còn âm thầm ghi sai
 * ai bỏ tiền ra trên khoản của người khác.
 *
 * Khoá thì giữ nguyên mọi dữ liệu và vẫn đạt được điều cần đạt: người đó không
 * vào app được nữa.
 */
export async function setUserDisabled(userIdInput: string, disabledInput: boolean) {
  const actorId = await requireAdmin();
  const userId = Id.parse(userIdInput);
  const disabled = z.boolean().parse(disabledInput);

  if (userId === actorId) throw new Error("Không tự khoá tài khoản của chính mình được.");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isAdmin: true },
  });
  if (!target) throw new Error("Không tìm thấy người này");

  if (disabled && isBootstrapAdminEmail(target.email)) {
    throw new Error(
      "Người này là quản trị viên theo ADMIN_EMAILS. Gỡ email khỏi biến môi trường trước, nếu không khoá xong họ vẫn vào lại được.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { disabledAt: disabled ? new Date() : null },
    });
    if (disabled) {
      // Nửa còn lại của việc "bị khoá" mà người dùng thật sự cảm nhận được:
      // thôi nhận thông báo đẩy. Cascade sẵn nên xoá là an toàn.
      await tx.pushSubscription.deleteMany({ where: { userId } });
    }
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

/* ─── Thao tác trên sổ ───────────────────────────────────────────────────── */

/**
 * Giao sổ cho người khác.
 *
 * Cùng một khối `$transaction` với `transferOwnership` ở `actions.ts` (đổi
 * `Group.ownerId`, nâng người nhận lên OWNER, hạ chủ cũ xuống ADMIN), chỉ bỏ
 * hai lần kiểm `assertMember` + `role !== "OWNER"` — quản trị viên hệ thống
 * không ở trong sổ, nên không kiểm theo cách đó được.
 *
 * Đây là lối thoát cho tình huống phải khoá một người đang đứng tên sổ chung:
 * `Group.ownerId` không nullable, nên sổ luôn phải có chủ.
 */
export async function adminTransferGroupOwnership(groupIdInput: string, toUserIdInput: string) {
  await requireAdmin();
  const groupId = Id.parse(groupIdInput);
  const toUserId = Id.parse(toUserIdInput);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!group) throw new Error("Không tìm thấy sổ này");
  if (group.ownerId === toUserId) throw new Error("Người này đang là người lập sổ rồi");

  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: toUserId, groupId } },
    select: { userId: true },
  });
  if (!target) throw new Error("Chỉ giao sổ cho người đang ở trong sổ được");

  await prisma.$transaction([
    prisma.group.update({ where: { id: groupId }, data: { ownerId: toUserId } }),
    prisma.groupMember.updateMany({
      where: { userId: toUserId, groupId },
      data: { role: "OWNER" },
    }),
    prisma.groupMember.updateMany({
      where: { userId: group.ownerId, groupId },
      data: { role: "ADMIN" },
    }),
  ]);

  await notifyUser(toUserId, "OWNER_TRANSFERRED", {
    title: "Bạn là người lập sổ mới",
    body: `Bạn vừa được giao sổ “${group.name}”. Giờ bạn quản lý người trong sổ và xoá sổ được.`,
    url: `/groups/${groupId}`,
  });

  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

/**
 * Mời một người ra khỏi sổ.
 *
 * Giữ nguyên hai quy tắc dữ liệu mà `removeMember` trong `actions.ts` mã hoá:
 *  · không gỡ được người lập sổ (sổ phải có chủ — giao sổ trước đã);
 *  · xoá luôn yêu cầu xin vào cũ, để sau này họ xin vào lại được.
 *
 * Các dòng `TransactionSplit` của người bị gỡ vẫn còn, đúng như hành vi sẵn có:
 * sổ vẫn ghi phần họ phải chịu trong những khoản đã tiêu. Đừng "sửa" ở đây.
 */
export async function adminRemoveMember(groupIdInput: string, memberUserIdInput: string) {
  await requireAdmin();
  const groupId = Id.parse(groupIdInput);
  const memberUserId = Id.parse(memberUserIdInput);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) throw new Error("Không tìm thấy sổ này");
  if (group.ownerId === memberUserId) {
    throw new Error("Không gỡ người lập sổ ra được. Hãy giao sổ cho người khác trước.");
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: memberUserId, groupId } },
    select: { id: true },
  });
  if (!member) throw new Error("Người này không ở trong sổ");

  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { userId: memberUserId, groupId } }),
    prisma.groupJoinRequest.deleteMany({ where: { userId: memberUserId, groupId } }),
  ]);

  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}`);
}

/**
 * Xoá hẳn một sổ.
 *
 * Xoá sổ thì sạch: `Group` là gốc cascade của thành viên, mã mời, yêu cầu vào
 * sổ, danh mục, giao dịch, khoản mượn và các lần cân đối — không khoá ngoại nào
 * chặn, không bản ghi mồ côi nào ở lại.
 *
 * Cố ý KHÔNG dùng lại `deleteGroup` ở `actions.ts`: hàm đó đòi `assertMember` +
 * `role === "OWNER"`, mà quản trị viên hệ thống không ở trong sổ.
 */
export async function adminDeleteGroup(groupIdInput: string) {
  await requireAdmin();
  const groupId = Id.parse(groupIdInput);

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) throw new Error("Không tìm thấy sổ này");

  await prisma.group.delete({ where: { id: groupId } });

  revalidatePath("/admin/groups");
  revalidatePath("/admin");
  // Sổ vừa biến mất khỏi danh sách sổ của mọi thành viên cũ.
  revalidatePath("/groups");
  revalidatePath("/");
}
