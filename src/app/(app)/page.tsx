import Link from "next/link";
import { CalendarDays, AlertTriangle, UserCheck, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboard, getMyGroups } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OccurrenceItem, type OccurrenceView } from "@/components/occurrence-item";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Today" };

type U = { id: string; name?: string | null; image?: string | null; email?: string | null };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [{ today, unassigned, mine }, groups] = await Promise.all([
    getDashboard(userId),
    getMyGroups(userId),
  ]);

  // members per group for assignment selects
  const groupIds = [...new Set([...today, ...unassigned, ...mine].map((o) => o.task.group.id))];
  const memberRows = await prisma.groupMember.findMany({
    where: { groupId: { in: groupIds } },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  });
  const membersByGroup = new Map<string, U[]>();
  for (const m of memberRows) {
    const list = membersByGroup.get(m.groupId) ?? [];
    list.push(m.user);
    membersByGroup.set(m.groupId, list);
  }

  const render = (o: (typeof today)[number]) => (
    <OccurrenceItem
      key={o.id}
      occ={o as unknown as OccurrenceView}
      members={membersByGroup.get(o.task.group.id) ?? []}
    />
  );

  if (groups.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {greeting()}, {session!.user.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground">{formatDate(new Date())} · here&apos;s your day</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarDays} label="Due today" value={today.length} tone="primary" />
        <StatCard icon={UserCheck} label="Assigned to you" value={mine.length} tone="accent" />
        <StatCard
          icon={AlertTriangle}
          label="Unassigned (7d)"
          value={unassigned.length}
          tone="warning"
        />
      </div>

      <Section
        title="Needs an assignee"
        subtitle="Due within 7 days and nobody's on it yet"
        empty="Everything's covered. Nice work! ✨"
        items={unassigned}
        render={render}
      />

      <Section
        title="Assigned to you"
        subtitle="Your upcoming tasks"
        empty="Nothing on your plate right now."
        items={mine}
        render={render}
      />

      <Section
        title="Everything due today"
        empty="No tasks scheduled for today."
        items={today}
        render={render}
      />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Section<T>({
  title,
  subtitle,
  empty,
  items,
  render,
}: {
  title: string;
  subtitle?: string;
  empty: string;
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">{items.map(render)}</div>
      )}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "primary" | "accent" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/12 text-primary",
    accent: "bg-accent/20 text-accent-foreground",
    warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex size-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Assignly 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Create your first group to start sharing and assigning daily tasks with your team,
            flatmates or family.
          </p>
          <Button asChild variant="gradient" className="w-full">
            <Link href="/groups">
              Create a group <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
