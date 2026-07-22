import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Join group" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/join/${code}`);

  const invite = await prisma.groupInvite.findUnique({
    where: { code: code.toUpperCase() },
    include: { group: { select: { id: true, name: true } } },
  });

  const expired = invite?.expiresAt && invite.expiresAt < new Date();

  if (invite && !expired) {
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: session.user.id, groupId: invite.groupId } },
      update: {},
      create: { userId: session.user.id, groupId: invite.groupId, role: "MEMBER" },
    });
    redirect(`/groups/${invite.groupId}`);
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>{expired ? "Invite expired" : "Invalid invite"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This invite link is no longer valid. Ask a group admin for a fresh one.
          </p>
          <Button asChild variant="gradient" className="w-full">
            <Link href="/groups">Go to my groups</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
