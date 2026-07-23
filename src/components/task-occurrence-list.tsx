"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OccurrenceItem, type OccurrenceView } from "@/components/occurrence-item";
import { loadTaskOccurrences } from "@/lib/actions";

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

/**
 * Upcoming-occurrences list with cursor-based "load more". The first page comes
 * from the server render; each click resolves the next window of virtual days.
 */
export function TaskOccurrenceList({
  taskId,
  members,
  initialOccurrences,
  initialCursor,
  initialHasMore,
}: {
  taskId: string;
  members: U[];
  initialOccurrences: OccurrenceView[];
  initialCursor: string | null;
  initialHasMore: boolean;
}) {
  const [occurrences, setOccurrences] = useState(initialOccurrences);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, start] = useTransition();

  function loadMore() {
    start(async () => {
      try {
        const page = await loadTaskOccurrences(taskId, cursor);
        setOccurrences((prev) => [...prev, ...(page.occurrences as unknown as OccurrenceView[])]);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  if (occurrences.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No upcoming occurrences for this task.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {occurrences.map((o) => (
        <OccurrenceItem key={o.dateKey} occ={o} members={members} showTask={false} />
      ))}
      {hasMore && (
        <div className="pt-2 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={pending}>
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
