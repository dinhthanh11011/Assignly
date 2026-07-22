import { Suspense } from "react";
import { TrendingUp, CheckCircle2, ListChecks } from "lucide-react";
import { auth } from "@/lib/auth";
import { getMyGroups, getGroupReport } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupPicker } from "@/components/group-picker";
import { StatusPie, MemberLoadChart } from "@/components/report-charts";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const groups = await getMyGroups(userId);

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Join or create a group to see reports.
        </p>
      </div>
    );
  }

  const { group } = await searchParams;
  const groupId = group && groups.some((g) => g.id === group) ? group : groups[0].id;
  const report = await getGroupReport(userId, groupId, 30);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
          <p className="text-muted-foreground">Last 30 days</p>
        </div>
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
      </div>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={ListChecks} label="Total occurrences" value={report.total} />
            <Stat icon={CheckCircle2} label="Completed" value={report.byStatus.DONE} />
            <Stat
              icon={TrendingUp}
              label="Completion rate"
              value={`${report.completionRate}%`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPie data={report.byStatus} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Load per member</CardTitle>
              </CardHeader>
              <CardContent>
                <MemberLoadChart data={report.perMember} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
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
