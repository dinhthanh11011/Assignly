import {
  Bell,
  BookOpen,
  Calculator,
  LockKeyhole,
  Palette,
  ShieldCheck,
  Tags,
  Type,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getJoinRequestsToReview, getMyGroups, getMyPendingJoinRequests, getScope } from "@/lib/queries";
import { isCurrentUserAdmin } from "@/lib/admin";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PushManager } from "@/components/push-manager";
import { InstallPwa } from "@/components/install-pwa";
import { FontSizeControl } from "@/components/font-size-control";
import { ThemeChoice } from "@/components/theme-choice";
import { SignOutRow } from "@/components/sign-out-row";
import { ControlRow, LinkRow, SettingGroup } from "@/components/setting-rows";
import { PageHeader } from "@/components/page-shell";

export const metadata = { title: "Cài đặt" };

/**
 * Cài đặt — hub của mọi thứ mang tính quản lý, kiểu Settings của iOS: các khay
 * có tiêu đề, đọc từ trên xuống. Sổ & thành viên → Hiển thị → Thông báo & ứng
 * dụng → Quản trị (chỉ admin) → Tài khoản.
 */
export default async function SettingsPage() {
  const session = await getSession();
  const user = session!.user;
  const userId = user.id;

  const [groups, scope, pendingJoins, toReview, isAdmin] = await Promise.all([
    getMyGroups(userId),
    getScope(userId),
    getMyPendingJoinRequests(userId),
    getJoinRequestsToReview(userId),
    isCurrentUserAdmin(),
  ]);
  const active = groups.find((g) => g.id === scope.groupId);
  const activeReview = active ? toReview.filter((r) => r.groupId === active.id).length : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeader title="Cài đặt" subtitle="Sổ, người trong sổ, hiển thị và tài khoản" />

      <SettingGroup
        title="Sổ & thành viên"
        footer={active ? `Đang mở sổ “${active.name}”. Đổi sổ ở bộ chọn sổ trên thanh trên cùng.` : undefined}
      >
        <LinkRow
          href="/groups"
          icon={BookOpen}
          label="Sổ của tôi"
          hint={groups.length === 0 ? "Chưa có sổ nào — tạo sổ đầu tiên" : "Tạo sổ mới, vào sổ bằng mã"}
          value={groups.length > 0 ? `${groups.length} sổ` : undefined}
          badge={
            pendingJoins.length > 0 ? (
              <Badge variant="warning" size="sm">
                {pendingJoins.length} chờ duyệt
              </Badge>
            ) : undefined
          }
        />
        {active && (
          <LinkRow
            href={`/groups/${active.id}`}
            icon={Users}
            label="Người trong sổ"
            hint="Mời người, duyệt yêu cầu, đổi quyền"
            value={`${active._count.members} người`}
            badge={
              activeReview > 0 ? (
                <Badge variant="warning" size="sm">
                  {activeReview} xin vào
                </Badge>
              ) : undefined
            }
          />
        )}
        <LinkRow
          href="/categories"
          icon={Tags}
          label="Các loại thu chi"
          hint="Ăn uống, xăng xe, lương… của sổ đang mở"
        />
      </SettingGroup>

      <SettingGroup title="Tiện ích">
        <LinkRow
          href="/split"
          icon={Calculator}
          label="Chia hoá đơn"
          hint="Mỗi người gọi một món, có giảm giá, VAT, ship"
        />
      </SettingGroup>

      <SettingGroup title="Hiển thị">
        <ControlRow icon={Type} label="Cỡ chữ" hint="Đổi ngay trên toàn app" stacked>
          <FontSizeControl />
        </ControlRow>
        <ControlRow icon={Palette} label="Giao diện" hint="Nền sáng, nền tối hoặc theo máy" stacked>
          <ThemeChoice />
        </ControlRow>
      </SettingGroup>

      <SettingGroup title="Thông báo & ứng dụng">
        <ControlRow
          icon={Bell}
          label="Thông báo"
          hint="Khi có người ghi khoản mượn, trả tiền, hoặc xin vào sổ"
        >
          <PushManager vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""} />
        </ControlRow>
        <InstallPwa />
      </SettingGroup>

      {/* Chỉ quản trị viên toàn hệ thống mới thấy khay này. */}
      {isAdmin && (
        <SettingGroup title="Quản trị hệ thống">
          <LinkRow
            href="/admin"
            icon={ShieldCheck}
            tone="solid"
            label="Bảng quản trị"
            hint="Người dùng, sổ và tình hình sử dụng toàn app"
          />
        </SettingGroup>
      )}

      <SettingGroup
        title="Tài khoản"
        footer={
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="size-4 shrink-0" aria-hidden />
            Dữ liệu của bạn chỉ hiện cho người trong cùng sổ.
          </span>
        }
      >
        <div className="flex min-h-20 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
          <Avatar className="size-14 ring-0">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback className="text-title">{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-[1_1_10rem]">
            <p className="text-body-lg font-semibold break-words">{user.name ?? "Tài khoản của tôi"}</p>
            {user.email && (
              <p className="text-body break-all text-muted-foreground">{user.email}</p>
            )}
            <p className="mt-0.5 text-caption text-muted-foreground">Đăng nhập bằng Google</p>
          </div>
          {isAdmin && (
            <Badge variant="default" shape="pill" icon={ShieldCheck}>
              Quản trị viên
            </Badge>
          )}
        </div>
        <SignOutRow />
      </SettingGroup>
    </div>
  );
}
