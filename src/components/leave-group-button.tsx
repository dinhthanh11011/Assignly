"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { leaveGroup } from "@/lib/actions";

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await leaveGroup(groupId);
            toast.success("Đã rời sổ");
            router.push("/groups");
          } catch (e) {
            toast.error((e as Error).message);
          }
        })
      }
    >
      <LogOut className="size-4" /> Rời sổ
    </Button>
  );
}
