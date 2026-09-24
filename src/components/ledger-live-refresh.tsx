import { Suspense } from "react";
import { LiveRefresh } from "@/components/live-refresh";
import { getGroupRevision } from "@/lib/ledger-revision";

/**
 * Đặt MỘT lần trong mỗi trang hiện dữ liệu của một sổ, với đúng `groupId` trang
 * đang hiện (đã kiểm thành viên). Nó đọc `Group.revision` ngay trong lượt dựng
 * trang và đưa xuống `LiveRefresh`, để phía client biết trang này đã có dữ liệu
 * tới số nào — xem giải thích ở `live-refresh.tsx`.
 *
 * Trong `Suspense` riêng: đây là một lần đọc theo khoá chính, nhưng không phần
 * nào của trang có lý do gì để chờ nó.
 */
export function LedgerLiveRefresh({ groupId }: { groupId: string }) {
  return (
    <Suspense fallback={null}>
      <Revision groupId={groupId} />
    </Suspense>
  );
}

async function Revision({ groupId }: { groupId: string }) {
  const revision = await getGroupRevision(groupId);
  return <LiveRefresh key={groupId} groupId={groupId} revision={revision} />;
}
