"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestToJoinByCode } from "@/lib/actions";

/**
 * Nút gửi yêu cầu vào sổ từ trang `/join/[code]`.
 *
 * Tồn tại vì trước đây trang đó GỬI YÊU CẦU NGAY TRONG LÚC RENDER một request
 * GET: chỉ cần mở link — hoặc trình duyệt prefetch nó, hoặc bấm F5, hoặc một
 * bot xem trước link trong tin nhắn — là một yêu cầu vào sổ được tạo ra và
 * người quản lý nhận thông báo. Người dùng không hề được hỏi; họ chỉ được BÁO
 * sau khi việc đã rồi.
 *
 * Dùng lại thẳng `requestToJoinByCode` đã có: nó tự kiểm mã, tự kiểm hạn, tự
 * gọi createJoinRequest và revalidate — không cần server action mới.
 */
export function JoinConfirm({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        size="lg"
        variant="gradient"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            try {
              const { status, groupId } = await requestToJoinByCode(code);
              if (status === "member") {
                toast.success("Bạn đã ở trong sổ này rồi");
                router.push(`/groups/${groupId}`);
              } else {
                toast.success("Đã gửi yêu cầu — chờ người quản lý duyệt");
                router.push("/groups");
              }
            } catch (e) {
              toast.error((e as Error).message);
            }
          })
        }
      >
        {pending ? "Đang gửi…" : "Gửi yêu cầu vào sổ"}
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/">Thôi, để sau</Link>
      </Button>
    </div>
  );
}
