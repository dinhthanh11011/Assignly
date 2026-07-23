"use client";
import { useTransition } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeMember } from "@/lib/actions";

export function RemoveMemberButton({
  groupId,
  userId,
  name,
}: {
  groupId: string;
  userId: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive"
      aria-label={`Remove ${name}`}
      title={`Remove ${name}`}
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name} from this group?`)) return;
        start(async () => {
          try {
            await removeMember(groupId, userId);
            toast.success(`${name} removed`);
          } catch (e) {
            toast.error((e as Error).message);
          }
        });
      }}
    >
      <UserMinus className="size-4" />
    </Button>
  );
}
