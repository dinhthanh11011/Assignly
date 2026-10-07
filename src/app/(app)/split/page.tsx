import { getSession } from "@/lib/auth";
import { getMemberOptions, getScope } from "@/lib/queries";
import { BackLink, PageHeader } from "@/components/page-shell";
import { BillSplitter } from "@/components/bill-splitter/bill-splitter";

export const metadata = { title: "Chia hoá đơn" };

/**
 * Tiện ích chia hoá đơn đi ăn. Không cần sổ nào — sổ đang mở (nếu có) chỉ dùng
 * để gợi ý tên người cho nhanh.
 */
export default async function SplitPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const { groupId } = await getScope(userId);
  const members = groupId ? await getMemberOptions(groupId) : [];
  const suggestions = members.map((m) => m.name || m.email || "").filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/settings" label="Cài đặt" />
      <PageHeader title="Chia hoá đơn" subtitle="Mỗi người gọi món riêng, có giảm giá, ship, VAT" />
      <BillSplitter suggestions={suggestions} />
    </div>
  );
}
