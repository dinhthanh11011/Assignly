import Link from "next/link";
import { notFound } from "next/navigation";
import { Repeat, CalendarClock, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { describeSchedule } from "@/lib/schedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/member-avatar";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { InvitePanel } from "@/components/invite-panel";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { JoinRequests } from "@/components/join-requests";
import { RemoveMemberButton } from "@/components/remove-member-button";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const data = await getGroupDetail(session!.user.id, id);
  if (!data) notFound();

  const { group, membership } = data;
  const members = group.members.map((m) => m.user);
  const canManage = membership.role !== "MEMBER";
  const currentUserId = session!.user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/groups" className="text-sm text-muted-foreground hover:underline">
            ← Groups
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{group.name}</h1>
          <p className="text-muted-foreground">
            {group.members.length} member{group.members.length !== 1 && "s"} ·{" "}
            {group.tasks.length} task{group.tasks.length !== 1 && "s"}
          </p>
        </div>
        <CreateTaskDialog groupId={group.id} members={members} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Tasks */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tasks</h2>
          {group.tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No tasks yet. Create your first one above.
            </p>
          ) : (
            <div className="space-y-2">
              {group.tasks.map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`}>
                  <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        {t.scheduleType === "RECURRING" ? (
                          <Repeat className="size-5" />
                        ) : (
                          <CalendarClock className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="muted">{describeSchedule(t)}</Badge>
                        </div>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite people</CardTitle>
            </CardHeader>
            <CardContent>
              <InvitePanel
                groupId={group.id}
                code={group.invites[0]?.code ?? null}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          {canManage && (
            <Card id="join-requests" className="scroll-mt-24">
              <CardHeader>
                <CardTitle className="text-base">
                  Join requests
                  {group.joinRequests.length > 0 && (
                    <Badge variant="warning" className="ml-2">
                      {group.joinRequests.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JoinRequests requests={group.joinRequests} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <MemberAvatar user={m.user} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {m.user.name || m.user.email}
                    </div>
                  </div>
                  <Badge variant={m.role === "MEMBER" ? "muted" : "default"}>
                    {m.role.toLowerCase()}
                  </Badge>
                  {canManage && m.role !== "OWNER" && m.userId !== currentUserId && (
                    <RemoveMemberButton
                      groupId={group.id}
                      userId={m.userId}
                      name={m.user.name || m.user.email || "this member"}
                    />
                  )}
                </div>
              ))}
              {membership.role !== "OWNER" && <LeaveGroupButton groupId={group.id} />}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
