"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { randomAssignTaskAction, deleteTask } from "@/lib/actions";

export function TaskActions({
  taskId,
  groupId,
  allowRandom,
}: {
  taskId: string;
  groupId: string;
  allowRandom: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      {allowRandom && (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                const res = await randomAssignTaskAction(taskId);
                toast.success(`Randomly assigned ${res.assigned} occurrence(s)`);
              } catch (e) {
                toast.error((e as Error).message);
              }
            })
          }
        >
          <Shuffle className="size-4" /> Random assign all
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive"
        aria-label="Delete task"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this task and all its occurrences?")) return;
          start(async () => {
            try {
              await deleteTask(taskId);
              toast.success("Task deleted");
              router.push(`/groups/${groupId}`);
            } catch (e) {
              toast.error((e as Error).message);
            }
          });
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
