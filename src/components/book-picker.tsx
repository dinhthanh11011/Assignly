"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/lib/actions";
import { useNavTransition } from "@/components/nav-progress";
import { cn } from "@/lib/utils";

/**
 * Chọn sổ đang xem.
 *
 * Vị trí là điều quan trọng nhất ở đây: bộ chọn này thuộc về KHUNG APP (thanh
 * bên trên desktop, thanh trên cùng ở điện thoại), không phải header của từng
 * trang. Trước đây nó được mount lại trong header của mọi trang — mà nó vốn là
 * cookie toàn cục, nên đó vừa là lặp thừa vừa là một phần lý do khiến các trang
 * trông giống hệt nhau.
 *
 * Sổ được ghim ở server (cookie) chứ không nằm trên URL, nên lựa chọn theo
 * người dùng sang mọi trang khác cho tới khi họ đổi sổ. Cũng xoá luôn `?group=`
 * khỏi URL hiện tại nếu có — để lại thì tham số cũ sẽ đè lên sổ vừa ghim. Các
 * bộ lọc khác trên URL (tháng, loại…) được giữ nguyên.
 */
export function BookPicker({
  groups,
  current,
  className,
}: {
  groups: { id: string; name: string }[];
  current: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, startTransition] = useNavTransition();

  const currentName = groups.find((g) => g.id === (picked ?? current))?.name;

  // Chỉ có một sổ thì không có gì để chọn — hiện tên cho biết đang ghi vào đâu.
  if (groups.length < 2) {
    return (
      <div
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-lg px-3 text-body text-muted-foreground",
          className
        )}
      >
        <Wallet className="size-5 shrink-0 text-primary" />
        <span className="truncate">{currentName ?? "Sổ của tôi"}</span>
      </div>
    );
  }

  const pick = (groupId: string) => {
    setPicked(groupId); // hiện tên sổ mới ngay, không chờ server
    startTransition(async () => {
      try {
        await setActiveGroup(groupId);
        const sp = new URLSearchParams(params.toString());
        sp.delete("group");
        const qs = sp.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
        router.refresh();
      } catch (e) {
        setPicked(null);
        toast.error(e instanceof Error ? e.message : "Không đổi được sổ");
      }
    });
  };

  return (
    <Select value={picked ?? current} onValueChange={pick}>
      <SelectTrigger className={cn("gap-2", className)} aria-label="Đang ghi vào sổ nào">
        {pending ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
        ) : (
          <Wallet className="size-5 shrink-0 text-primary" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
