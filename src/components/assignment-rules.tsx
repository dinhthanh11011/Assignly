"use client";
import { useState, useTransition } from "react";
import { Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addAssignmentRule, deleteAssignmentRule } from "@/lib/actions";

type U = { id: string; name?: string | null; email?: string | null };
type Scope = "WHOLE_TASK" | "WEEKDAY" | "DATE" | "WEEK";

type Rule = {
  id: string;
  scope: Scope;
  target: unknown;
  assignee: U;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeRule(rule: Rule): string {
  const t = (rule.target ?? {}) as Record<string, unknown>;
  switch (rule.scope) {
    case "WHOLE_TASK":
      return "Whole task";
    case "WEEKDAY":
      return `Every ${WEEKDAYS[Number(t.weekday)] ?? "?"}`;
    case "DATE":
      return `On ${t.date}`;
    case "WEEK":
      return `Week of ${t.weekStart}`;
  }
}

export function AssignmentRules({
  taskId,
  members,
  rules,
}: {
  taskId: string;
  members: U[];
  rules: Rule[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [scope, setScope] = useState<Scope>("WHOLE_TASK");
  const [assignee, setAssignee] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [date, setDate] = useState("");
  const [weekStart, setWeekStart] = useState("");

  function submit() {
    if (!assignee) return toast.error("Pick an assignee");
    let target: Record<string, string | number> | null = null;
    if (scope === "WEEKDAY") target = { weekday: Number(weekday) };
    if (scope === "DATE") {
      if (!date) return toast.error("Pick a date");
      target = { date };
    }
    if (scope === "WEEK") {
      if (!weekStart) return toast.error("Pick a week start");
      target = { weekStart };
    }
    start(async () => {
      try {
        await addAssignmentRule({ taskId, scope, assigneeId: assignee, target });
        toast.success("Rule added");
        setOpen(false);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserCog className="size-5" /> Pre-assignment rules
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-4" /> Add rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add pre-assignment rule</DialogTitle>
              <DialogDescription>
                Automatically assign occurrences. More specific rules win (date &gt; week &gt;
                weekday &gt; whole task).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Applies to</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHOLE_TASK">Whole task</SelectItem>
                    <SelectItem value="WEEKDAY">A weekday</SelectItem>
                    <SelectItem value="DATE">A specific date</SelectItem>
                    <SelectItem value="WEEK">A specific week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === "WEEKDAY" && (
                <div className="space-y-2">
                  <Label>Weekday</Label>
                  <Select value={weekday} onValueChange={setWeekday}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {scope === "DATE" && (
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              )}
              {scope === "WEEK" && (
                <div className="space-y-2">
                  <Label>Week starting</Label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={pending} variant="gradient">
                {pending ? "Adding…" : "Add rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No rules. Add one to auto-assign future occurrences.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border bg-card/60 p-3"
            >
              <Badge variant="accent">{describeRule(r)}</Badge>
              <span className="flex-1 text-sm">
                → {r.assignee.name || r.assignee.email}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() =>
                  start(() => {
                    deleteAssignmentRule(r.id)
                      .then(() => toast.success("Rule removed"))
                      .catch((e) => toast.error(e.message));
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
