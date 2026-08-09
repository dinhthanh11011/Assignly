import { getSession } from "@/lib/auth";
import { getCategories, scopeWith } from "@/lib/queries";
import { CategoryManager } from "@/components/category-manager";
import { BackLink, NoGroupState, PageHeader } from "@/components/page-shell";

export const metadata = { title: "Các loại thu chi" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const { group } = await searchParams;

  const { groupId, data } = await scopeWith(userId, group, (id) =>
    getCategories(userId, id)
  );
  if (!groupId || !data) return <NoGroupState />;

  const categories = await data;
  if (!categories) return <NoGroupState />;

  return (
    <div className="space-y-6">
      <BackLink href="/settings" label="Quay lại Cài đặt" />

      <PageHeader title="Các loại thu chi" subtitle="Để biết tiền đi vào những việc gì" />

      <CategoryManager
        groupId={groupId}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          type: c.type,
          count: c._count.transactions,
        }))}
      />
    </div>
  );
}
