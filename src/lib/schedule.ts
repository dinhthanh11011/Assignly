const DAY_NAMES: Record<string, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

/** Human-readable summary of a task's schedule (no external deps). */
export function describeSchedule(task: {
  scheduleType: string;
  rrule?: string | null;
  specificDates?: unknown;
}): string {
  if (task.scheduleType === "SPECIFIC_DATES") {
    const dates = (task.specificDates as string[] | null) ?? [];
    if (dates.length === 0) return "No dates";
    if (dates.length === 1) return `On ${dates[0]}`;
    return `${dates.length} specific dates`;
  }

  if (!task.rrule) return "Recurring";
  const parts = Object.fromEntries(
    task.rrule.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const interval = Number(parts.INTERVAL || 1);
  const freq = parts.FREQ;
  const every = interval > 1 ? `every ${interval} ` : "";

  if (freq === "DAILY") return interval > 1 ? `Every ${interval} days` : "Daily";
  if (freq === "WEEKLY") {
    const days = (parts.BYDAY || "")
      .split(",")
      .filter(Boolean)
      .map((d) => DAY_NAMES[d] || d)
      .join(", ");
    return `${every}Weekly${days ? ` on ${days}` : ""}`.replace(/^e/, "E");
  }
  if (freq === "MONTHLY") {
    return `${every}Monthly${parts.BYMONTHDAY ? ` on day ${parts.BYMONTHDAY}` : ""}`.replace(
      /^e/,
      "E"
    );
  }
  return "Recurring";
}
