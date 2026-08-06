import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCategories, scopeWith } from "@/lib/queries";
import { CategoryManager } from "@/components/category-manager";
import { NoGroupState, PageHeader } from "@/components/page-shell";

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
      <Link
        href="/settings"
        className="inline-flex min-h-12 items-center gap-2 text-body text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" /> Quay lại Cài đặt
      </Link>

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
