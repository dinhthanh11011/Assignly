import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createJoinRequest } from "@/lib/join";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Tham gia sổ" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
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
            <CardTitle>Đã gửi yêu cầu 🙌</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Yêu cầu tham gia sổ <span className="font-medium">{invite.group.name}</span> đang
              chờ quản trị viên duyệt. Bạn sẽ nhận được thông báo khi được chấp nhận.
            </p>
            <Button asChild variant="gradient" className="w-full">
              <Link href="/groups">Về danh sách sổ</Link>
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
          <CardTitle>{expired ? "Mã mời đã hết hạn" : "Mã mời không hợp lệ"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Liên kết mời này không còn dùng được. Hãy xin quản trị viên của sổ một mã mới.
          </p>
          <Button asChild variant="gradient" className="w-full">
            <Link href="/groups">Về danh sách sổ</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
