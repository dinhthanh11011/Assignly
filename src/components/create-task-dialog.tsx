"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTask } from "@/lib/actions";

type U = { id: string; name?: string | null; email?: string | null };
const WEEKDAYS = [
  { code: "SU", label: "Su" },
  { code: "MO", label: "Mo" },
  { code: "TU", label: "Tu" },
  { code: "WE", label: "We" },
  { code: "TH", label: "Th" },
  { code: "FR", label: "Fr" },
  { code: "SA", label: "Sa" },
];

export function CreateTaskDialog({ groupId, members }: { groupId: string; members: U[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"RECURRING" | "SPECIFIC_DATES">("RECURRING");
  const [freq, setFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [byday, setByday] = useState<string[]>(["MO"]);
  const [monthday, setMonthday] = useState(1);
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [allowRandom, setAllowRandom] = useState(true);

  function buildRrule(): string {
    const parts = [`FREQ=${freq}`, `INTERVAL=${Math.max(1, interval)}`];
    if (freq === "WEEKLY" && byday.length) parts.push(`BYDAY=${byday.join(",")}`);
    if (freq === "MONTHLY") parts.push(`BYMONTHDAY=${monthday}`);
    return parts.join(";");
  }

  function toggleDay(code: string) {
    setByday((d) => (d.includes(code) ? d.filter((x) => x !== code) : [...d, code]));
  }

  function addDate() {
    if (dateInput && !dates.includes(dateInput)) setDates((d) => [...d, dateInput].sort());
    setDateInput("");
  }

  function submit() {
    if (!title.trim()) return toast.error("Give the task a title");
    if (mode === "RECURRING" && freq === "WEEKLY" && byday.length === 0)
      return toast.error("Pick at least one weekday");
    if (mode === "SPECIFIC_DATES" && dates.length === 0)
      return toast.error("Add at least one date");

    start(async () => {
      try {
        const { id } = await createTask({
          groupId,
          title: title.trim(),
          description: description.trim() || null,
          scheduleType: mode,
          rrule: mode === "RECURRING" ? buildRrule() : null,
          specificDates: mode === "SPECIFIC_DATES" ? dates : null,
          allowRandomAssign: allowRandom,
          defaultAssigneeId: assignee || null,
        });
        toast.success("Task created");
        setOpen(false);
        router.push(`/tasks/${id}`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> New task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>Schedule it, then assign people or leave it open.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Take out the trash"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-desc">Description (optional)</Label>
            <Textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details…"
            />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="RECURRING" className="flex-1">
                Recurring
              </TabsTrigger>
              <TabsTrigger value="SPECIFIC_DATES" className="flex-1">
                Specific dates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="RECURRING" className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Repeats</Label>
                  <Select value={freq} onValueChange={(v) => setFreq(v as typeof freq)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Every</Label>
                  <Input
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                  />
                </div>
              </div>

              {freq === "WEEKLY" && (
                <div className="space-y-2">
                  <Label>On days</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => toggleDay(d.code)}
                        className={`flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          byday.includes(d.code)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {freq === "MONTHLY" && (
                <div className="space-y-2">
                  <Label>Day of month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={monthday}
                    onChange={(e) => setMonthday(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="SPECIFIC_DATES" className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Add a date</Label>
                  <Input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addDate}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <Badge key={d} variant="muted" className="gap-1">
                    {d}
                    <button onClick={() => setDates((x) => x.filter((y) => y !== d))}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Default assignee (optional)</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Leave unassigned" />
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Allow random assignment</div>
              <div className="text-xs text-muted-foreground">Let anyone shuffle assignees</div>
            </div>
            <Switch checked={allowRandom} onCheckedChange={setAllowRandom} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="gradient" onClick={submit} disabled={pending}>
            {pending ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
