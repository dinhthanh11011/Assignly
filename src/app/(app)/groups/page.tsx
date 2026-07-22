import Link from "next/link";
import { Users, ListTodo } from "lucide-react";
import { auth } from "@/lib/auth";
import { getMyGroups } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarStack } from "@/components/member-avatar";
import { CreateGroupButton, JoinGroupButton } from "@/components/group-dialogs";

export const metadata = { title: "Groups" };

export default async function GroupsPage() {
  const session = await auth();
  const groups = await getMyGroups(session!.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Groups</h1>
          <p className="text-muted-foreground">Shared spaces for your tasks</p>
        </div>
        <div className="flex gap-2">
          <JoinGroupButton />
          <CreateGroupButton />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No groups yet. Create one or join with an invite code.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="group">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold group-hover:text-primary">{g.name}</h3>
                    <AvatarStack users={g.members.map((m) => m.user)} max={4} />
                  </div>
                  <div className="mt-auto flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" /> {g._count.members}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ListTodo className="size-4" /> {g._count.tasks} tasks
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
