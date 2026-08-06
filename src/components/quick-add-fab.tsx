import { prisma } from "@/lib/db";
import { getMemberOptions, getScope } from "@/lib/queries";
import { QuickAddButton } from "@/components/quick-add";

/**
 * Nút ghi khoản mới, mount một lần trong khung app nên có mặt ở **mọi** trang:
 * nút nổi giữa thanh nav dưới trên điện thoại, nút trong thanh trên ở desktop
 * (xem `QuickAddButton`) — trước đây nó chỉ nằm trong header của Tổng quan và
 * Khoản, nên ô giữa thanh nav bị trống ở các trang khác.
 *
 * Sổ lấy từ cookie ghim (`getScope` không có `preferred` vì layout không nhận
 * `searchParams`); tên sổ luôn hiện trong sheet để thấy rõ đang ghi vào đâu.
 */
export async function QuickAddFab({ userId }: { userId: string }) {
  const { groups, groupId } = await getScope(userId);
  if (!groupId) return null;

  const [categories, members] = await Promise.all([
    prisma.category.findMany({
      where: { groupId },
      select: { id: true, name: true, icon: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    getMemberOptions(groupId),
  ]);

  return (
    <QuickAddButton
      groupId={groupId}
      groupName={groups.find((g) => g.id === groupId)?.name ?? "này"}
      categories={categories}
      members={members}
      currentUserId={userId}
    />
  );
}
