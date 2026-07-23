import Link from "next/link";
import { notFound } from "next/navigation";
import { Repeat, CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTaskDetail } from "@/lib/queries";
import { describeSchedule } from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { type OccurrenceView } from "@/components/occurrence-item";
import { TaskOccurrenceList } from "@/components/task-occurrence-list";
import { TaskActions } from "@/components/task-actions";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { SpinAssignDialog } from "@/components/spin-assign-dialog";
import { AssignmentRules } from "@/components/assignment-rules";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const data = await getTaskDetail(session!.user.id, id);
  if (!data) notFound();

  const { task, occurrences, nextCursor, hasMore } = data;
  const members = task.group.members.map((m) => m.user);
  const views = occurrences as unknown as OccurrenceView[];

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
        <div className="flex flex-wrap items-center gap-2">
          <EditTaskDialog
            task={{
              id: task.id,
              title: task.title,
              description: task.description,
              scheduleType: task.scheduleType,
              rrule: task.rrule,
              specificDates: task.specificDates,
              allowRandomAssign: task.allowRandomAssign,
              unassignedReminderTime: task.unassignedReminderTime,
              doReminderTime: task.doReminderTime,
            }}
          />
          {task.allowRandomAssign && (
            <SpinAssignDialog taskId={task.id} members={members} occurrences={views} />
          )}
          <TaskActions
            taskId={task.id}
            groupId={task.group.id}
            allowRandom={task.allowRandomAssign}
            occurrences={views}
          />
        </div>
      </div>

      <AssignmentRules taskId={task.id} members={members} rules={task.rules} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming occurrences</h2>
        <TaskOccurrenceList
          taskId={task.id}
          members={members}
          initialOccurrences={views}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
        />
      </section>
    </div>
  );
}
