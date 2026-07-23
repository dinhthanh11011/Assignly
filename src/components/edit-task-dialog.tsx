"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
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
import { ReminderTimeFields } from "@/components/reminder-fields";
import { updateTask } from "@/lib/actions";

const WEEKDAYS = [
  { code: "SU", label: "Su" },
  { code: "MO", label: "Mo" },
  { code: "TU", label: "Tu" },
  { code: "WE", label: "We" },
  { code: "TH", label: "Th" },
  { code: "FR", label: "Fr" },
  { code: "SA", label: "Sa" },
];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type Freq = "DAILY" | "WEEKLY" | "MONTHLY";
type Mode = "RECURRING" | "SPECIFIC_DATES";

export type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  scheduleType: Mode;
  rrule: string | null;
  specificDates: unknown;
  allowRandomAssign: boolean;
  unassignedReminderTime: string | null;
  doReminderTime: string | null;
};

/** Parse an RRULE string like "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE" into parts. */
function parseRrule(rrule: string | null) {
  const map = new Map<string, string>();
  for (const part of (rrule ?? "").split(";")) {
    const [k, v] = part.split("=");
    if (k && v) map.set(k.toUpperCase(), v);
  }
  const freq = (map.get("FREQ") as Freq) ?? "WEEKLY";
  return {
    freq: ["DAILY", "WEEKLY", "MONTHLY"].includes(freq) ? freq : "WEEKLY",
    interval: Math.max(1, Number(map.get("INTERVAL") ?? 1) || 1),
    byday: map.get("BYDAY")?.split(",").filter(Boolean) ?? ["MO"],
    monthdays: (map.get("BYMONTHDAY")?.split(",") ?? ["1"])
      .map((s) => Number(s))
      .filter((n) => n >= 1 && n <= 31),
  };
}

export function EditTaskDialog({ task }: { task: EditableTask }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const parsed = parseRrule(task.rrule);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [mode, setMode] = useState<Mode>(task.scheduleType);
  const [freq, setFreq] = useState<Freq>(parsed.freq as Freq);
  const interval = parsed.interval; // preserved as-is; not editable here
  const [byday, setByday] = useState<string[]>(parsed.byday);
  const [monthdays, setMonthdays] = useState<number[]>(parsed.monthdays);
  const [dates, setDates] = useState<string[]>(
    Array.isArray(task.specificDates) ? (task.specificDates as string[]) : []
  );
  const [dateInput, setDateInput] = useState("");
  const [allowRandom, setAllowRandom] = useState(task.allowRandomAssign);
  const [unassignedTime, setUnassignedTime] = useState(task.unassignedReminderTime ?? "");
  const [doTime, setDoTime] = useState(task.doReminderTime ?? "");

  function reset() {
    const p = parseRrule(task.rrule);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setMode(task.scheduleType);
    setFreq(p.freq as Freq);
    setByday(p.byday);
    setMonthdays(p.monthdays);
    setDates(Array.isArray(task.specificDates) ? (task.specificDates as string[]) : []);
    setDateInput("");
    setAllowRandom(task.allowRandomAssign);
    setUnassignedTime(task.unassignedReminderTime ?? "");
    setDoTime(task.doReminderTime ?? "");
  }

  function buildRrule(): string {
    const parts = [`FREQ=${freq}`, `INTERVAL=${Math.max(1, interval)}`];
    if (freq === "WEEKLY" && byday.length) parts.push(`BYDAY=${byday.join(",")}`);
    if (freq === "MONTHLY" && monthdays.length)
      parts.push(`BYMONTHDAY=${[...monthdays].sort((a, b) => a - b).join(",")}`);
    return parts.join(";");
  }

  function toggleDay(code: string) {
    setByday((d) => (d.includes(code) ? d.filter((x) => x !== code) : [...d, code]));
  }

  function toggleMonthday(day: number) {
    setMonthdays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  }

  function addDate() {
    if (dateInput && !dates.includes(dateInput)) setDates((d) => [...d, dateInput].sort());
    setDateInput("");
  }

  function submit() {
    if (!title.trim()) return toast.error("Give the task a title");
    if (mode === "RECURRING" && freq === "WEEKLY" && byday.length === 0)
      return toast.error("Pick at least one weekday");
    if (mode === "RECURRING" && freq === "MONTHLY" && monthdays.length === 0)
      return toast.error("Pick at least one day of the month");
    if (mode === "SPECIFIC_DATES" && dates.length === 0)
      return toast.error("Add at least one date");

    start(async () => {
      try {
        await updateTask({
          taskId: task.id,
          title: title.trim(),
          description: description.trim() || null,
          scheduleType: mode,
          rrule: mode === "RECURRING" ? buildRrule() : null,
          specificDates: mode === "SPECIFIC_DATES" ? dates : null,
          allowRandomAssign: allowRandom,
          unassignedReminderTime: unassignedTime || null,
          doReminderTime: doTime || null,
        });
        toast.success("Task updated");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Change the details or reschedule it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-title">Title</Label>
            <Input
              id="e-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Take out the trash"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-desc">Description (optional)</Label>
            <Textarea
              id="e-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details…"
            />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="RECURRING" className="flex-1">
                Recurring
              </TabsTrigger>
              <TabsTrigger value="SPECIFIC_DATES" className="flex-1">
                Specific dates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="RECURRING" className="space-y-4">
              <div className="space-y-2">
                <Label>Repeats</Label>
                <Select value={freq} onValueChange={(v) => setFreq(v as Freq)}>
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
                  <Label>Days of month</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MONTH_DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleMonthday(day)}
                        className={`flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          monthdays.includes(day)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Allow random assignment</div>
              <div className="text-xs text-muted-foreground">Let anyone shuffle assignees</div>
            </div>
            <Switch checked={allowRandom} onCheckedChange={setAllowRandom} />
          </div>

          <ReminderTimeFields
            unassignedValue={unassignedTime}
            doValue={doTime}
            onUnassignedChange={setUnassignedTime}
            onDoChange={setDoTime}
          />
        </div>

        <DialogFooter>
          <Button variant="gradient" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
