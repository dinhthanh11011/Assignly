"use client";
import { call } from "@/lib/action-result";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestToJoinByCode } from "@/lib/actions";

/**
 * Nút gửi yêu cầu vào sổ ở `/join/[code]`. Việc ghi nằm sau cú bấm này —
 * mở link (prefetch, F5, bot xem trước link) không được tự gửi yêu cầu.
 */
export function JoinConfirm({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        size="lg"
        variant="default"
        loading={pending}
        onClick={() =>
          start(async () => {
            try {
              const { status, groupId } = await call(requestToJoinByCode(code));
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
