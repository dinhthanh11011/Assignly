import Link from "next/link";
import { notFound } from "next/navigation";
import { Repeat, CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTaskDetail } from "@/lib/queries";
import { describeSchedule } from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { OccurrenceItem, type OccurrenceView } from "@/components/occurrence-item";
import { TaskActions } from "@/components/task-actions";
import { AssignmentRules } from "@/components/assignment-rules";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const data = await getTaskDetail(session!.user.id, id);
  if (!data) notFound();

  const { task, occurrences } = data;
  const members = task.group.members.map((m) => m.user);

  const views: OccurrenceView[] = occurrences.map((o) => ({
    id: o.id,
    date: o.date,
    status: o.status,
    assigneeId: o.assigneeId,
    assignee: o.assignee,
    task: { id: task.id, title: task.title, group: { id: task.group.id, name: task.group.name } },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/groups/${task.group.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {task.group.name}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            {task.scheduleType === "RECURRING" ? (
              <Repeat className="size-6 text-primary" />
            ) : (
              <CalendarClock className="size-6 text-primary" />
            )}
            {task.title}
          </h1>
          {task.description && <p className="mt-1 text-muted-foreground">{task.description}</p>}
          <div className="mt-2">
            <Badge variant="muted">{describeSchedule(task)}</Badge>
          </div>
        </div>
        <TaskActions taskId={task.id} groupId={task.group.id} allowRandom={task.allowRandomAssign} />
      </div>

      <AssignmentRules taskId={task.id} members={members} rules={task.rules} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming occurrences</h2>
        {views.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No upcoming occurrences within the scheduling horizon.
          </p>
        ) : (
          <div className="space-y-2">
            {views.map((o) => (
              <OccurrenceItem key={o.id} occ={o} members={members} showTask={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
