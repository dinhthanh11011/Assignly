import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getClosedLoans, scopeWith } from "@/lib/queries";
import { FilterChips } from "@/components/scope-picker";
import { LoanCard } from "@/components/loan-card";
import { BackLink, NoGroupState, PageHeader } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata = { title: "Khoản đã xong" };

/**
 * KHO LƯU — chỗ xem lại các khoản mượn đã đóng.
 *
 * Trang `/loans` cố ý chỉ hiện khoản CÒN NỢ: câu hỏi nó trả lời là "ai còn nợ
 * ai", và một khoản đã trả xong thì không còn là câu trả lời cho câu đó. Nhưng
 * bản cũ đẩy hệ quả đi quá xa — khoản trả xong biến mất KHÔNG CÓ ĐƯỜNG NÀO quay
 * lại: hàng chip lọc trạng thái ở `/loans` chỉ hiện khi danh sách đang xem đã có
 * khoản đã đóng, mà ở view mặc định danh sách chỉ chứa khoản ACTIVE, nên điều
 * kiện đó không bao giờ đúng. Người dùng báo đúng chuyện này.
 *
 * Nên nó thành một TRANG riêng chứ không phải một chip lọc: "xem lại chuyện đã
 * xong" là một việc khác với "ai đang nợ tôi", và nó cần thứ mà `/loans` không
 * có chỗ chứa — phân trang. Danh sách đang nợ thì bao nhiêu cũng phải hiện hết
 * (mỗi khoản là một việc phải làm); còn kho lưu chỉ dài thêm mãi.
 *
 * Sắp theo NGÀY XONG mới nhất trước — xem ghi chú ở `getClosedLoans`.
 */
export default async function ClosedLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; status?: string; page?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const status =
    sp.status === "PAID" ? ("PAID" as const) : sp.status === "CANCELLED" ? ("CANCELLED" as const) : undefined;
  // Số trang gõ tay trên URL: kẹp về 1 thay vì tin, để `?page=-3` hay `?page=abc`
  // không thành OFFSET âm.
  const wanted = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const { groupId, data } = await scopeWith(userId, sp.group, (id) =>
    getClosedLoans(userId, id, { status, page: wanted })
  );
  if (!groupId || !data) return <NoGroupState />;

  const result = await data;
  if (!result) return <NoGroupState />;

  const href = (page: number) => {
    const params = new URLSearchParams();
    if (sp.group) params.set("group", sp.group);
    if (sp.status) params.set("status", sp.status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/loans/closed?${qs}` : "/loans/closed";
  };

  return (
    <div className="space-y-6">
      <BackLink href="/loans" label="Quay lại Nợ" />

      <PageHeader
        title="Khoản đã xong"
        subtitle={
          result.total > 0
            ? `${result.total} khoản đã đóng, mới xong trước`
            : "Nơi các khoản đã trả xong nằm lại"
        }
      />

      <Suspense>
        <FilterChips
          param="status"
          value={sp.status ?? ""}
          label="Lọc theo cách khoản đó kết thúc"
          // Đổi bộ lọc là về trang 1: số trang cũ hầu như luôn vượt quá tập mới.
          clear={["page"]}
          options={[
            { value: "", label: "Tất cả" },
            { value: "PAID", label: "Đã trả xong" },
            { value: "CANCELLED", label: "Đã bỏ" },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState emoji="📦">
          {status === "CANCELLED"
            ? "Chưa có khoản nào bị bỏ giữa đường."
            : status === "PAID"
              ? "Chưa có khoản nào trả xong. Khi một khoản được trả hết, nó sẽ nằm ở đây."
              : "Chưa có khoản nào xong. Khi một khoản được trả hết hoặc bị bỏ, nó sẽ nằm ở đây thay vì mất hẳn."}
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {result.items.map((loan) => (
              <LoanCard key={loan.id} loan={loan} paymentCount={loan.paymentCount} />
            ))}
          </div>

          {result.pageCount > 1 && (
            <nav
              aria-label="Chuyển trang"
              className="flex items-center justify-between gap-3 border-t border-border pt-3.5"
            >
              <PageLink
                href={href(result.page - 1)}
                enabled={result.page > 1}
                icon={ChevronLeft}
                label="Mới hơn"
              />
              <span className="text-caption text-muted-foreground">
                Trang {result.page} / {result.pageCount}
              </span>
              <PageLink
                href={href(result.page + 1)}
                enabled={result.page < result.pageCount}
                icon={ChevronRight}
                label="Cũ hơn"
                trailing
              />
            </nav>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Một nút chuyển trang. Ở đầu/cuối danh sách nó vẫn CHIẾM CHỖ nhưng thành chữ
 * mờ không bấm được — nếu ẩn đi thì nút còn lại nhảy sang chỗ khác giữa hai
 * trang, và người dùng bấm "Cũ hơn" hai lần liền sẽ bấm nhầm.
 */
function PageLink({
  href,
  enabled,
  icon: Icon,
  label,
  trailing = false,
}: {
  href: string;
  enabled: boolean;
  icon: React.ElementType;
  label: string;
  trailing?: boolean;
}) {
  const body = (
    <>
      {!trailing && <Icon className="size-5 shrink-0" aria-hidden />}
      {label}
      {trailing && <Icon className="size-5 shrink-0" aria-hidden />}
    </>
  );
  const shape = "inline-flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-body";

  if (!enabled) {
    // Màu mờ, KHÔNG phải opacity: quy tắc giao diện cấm hạ opacity lên màu chữ
    // (xem scripts/check-ui-rules.sh) — chữ nào cũng phải đo được tương phản.
    return (
      <span aria-disabled className={cn(shape, "text-muted-foreground")}>
        {body}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={cn(shape, "focus-ring text-foreground transition-colors hover:text-primary")}
      // Trang kế tiếp thường được bấm ngay sau khi trang này hiện ra.
      prefetch
    >
      {body}
    </Link>
  );
}
