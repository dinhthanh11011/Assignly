import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createJoinRequest } from "@/lib/join";
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
    const result = await createJoinRequest(session.user.id, invite.groupId);
    if (result === "member") redirect(`/groups/${invite.groupId}`);

    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Request sent 🙌</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your request to join <span className="font-medium">{invite.group.name}</span> is
              waiting for an admin to approve it. You&apos;ll get a notification once you&apos;re in.
            </p>
            <Button asChild variant="gradient" className="w-full">
              <Link href="/groups">Go to my groups</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
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
