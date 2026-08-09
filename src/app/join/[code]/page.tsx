import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, LinkIcon, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMembership } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { MessageScreen } from "@/components/page-shell";
import { JoinConfirm } from "@/components/join-confirm";

export const metadata = { title: "Tham gia sổ" };

/**
 * Trang mời — CHỈ ĐỌC.
 *
 * Bản cũ gọi `createJoinRequest()` ngay trong lúc render GET, nên chỉ mở link là
 * đã gửi yêu cầu: prefetch, bấm F5, hay một bot xem trước link đều tạo ra yêu
 * cầu thật và bắn thông báo cho người quản lý sổ. Việc ghi dữ liệu giờ nằm sau
 * một cú bấm của người dùng (xem JoinConfirm).
 *
 * Bốn trạng thái, không có trạng thái nào ghi gì cả:
 *   1. đã là thành viên  → vào thẳng sổ
 *   2. đã có yêu cầu chờ → nói rõ nó còn sống
 *   3. mã hợp lệ         → HỎI trước khi gửi
 *   4. mã sai / hết hạn  → như cũ
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
  // redirect() ném exception để điều khiển luồng — luôn để nó ngoài try/catch.
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/join/${code}`);
  const userId = session.user.id;

  const invite = await prisma.groupInvite.findUnique({
    where: { code: code.toUpperCase() },
    include: { group: { select: { id: true, name: true } } },
  });
  const expired = invite?.expiresAt && invite.expiresAt < new Date();

  if (invite && !expired) {
    const [membership, existing] = await Promise.all([
      getMembership(userId, invite.groupId),
      prisma.groupJoinRequest.findUnique({
        where: { userId_groupId: { userId, groupId: invite.groupId } },
        select: { status: true },
      }),
    ]);

    if (membership) redirect(`/groups/${invite.groupId}`);

    if (existing?.status === "PENDING") {
      return (
        <Shell>
          <MessageScreen
            icon={Clock}
            tone="primary"
            title="Yêu cầu của bạn đang chờ duyệt"
            className="min-h-dvh"
            actions={
              <Button asChild size="lg">
                <Link href="/groups">Về Sổ của tôi</Link>
              </Button>
            }
          >
            Người quản lý sổ <span className="font-semibold text-foreground">{invite.group.name}</span>{" "}
            chưa trả lời. Bạn sẽ nhận được thông báo ngay khi được đồng ý.
          </MessageScreen>
        </Shell>
      );
    }

    return (
      <Shell>
        <MessageScreen
          icon={Users}
          tone="primary"
          title={`Vào sổ “${invite.group.name}”?`}
          className="min-h-dvh"
          actions={<JoinConfirm code={code} />}
        >
          Bạn sẽ gửi một yêu cầu tới người quản lý sổ. Khi họ đồng ý, bạn xem và ghi được mọi
          khoản trong sổ này — và người trong sổ sẽ thấy tên bạn.
        </MessageScreen>
      </Shell>
    );
  }

  return (
    <Shell>
      <MessageScreen
        icon={LinkIcon}
        title={expired ? "Mã vào sổ đã hết hạn" : "Mã vào sổ không hợp lệ"}
        className="min-h-dvh"
        actions={
          <Button asChild size="lg">
            <Link href="/groups">Về Sổ của tôi</Link>
          </Button>
        }
      >
        Liên kết mời này không còn dùng được. Hãy xin người quản lý của sổ một mã mới.
      </MessageScreen>
    </Shell>
  );
}

/** Trang này nằm ngoài (app)/layout nên phải tự dựng landmark <main>. */
function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
