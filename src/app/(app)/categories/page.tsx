import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getCategories, getScope } from "@/lib/queries";
import { GroupPicker } from "@/components/scope-picker";
import { CategoryManager } from "@/components/category-manager";
import { NoGroupState, PageHeader } from "@/components/page-shell";

export const metadata = { title: "Danh mục" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { group } = await searchParams;

  const { groups, groupId } = await getScope(userId, group);
  if (!groupId) return <NoGroupState />;

  const categories = await getCategories(userId, groupId);
  if (!categories) return <NoGroupState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục"
        subtitle="Phân loại các khoản thu và chi của sổ"
      >
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
      </PageHeader>

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
