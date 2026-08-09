import {
  Bell,
  BookOpen,
  KeyRound,
  Palette,
  Smartphone,
  Tags,
  Type,
  UserRound,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getMyGroups, getMyPendingJoinRequests, getScope } from "@/lib/queries";
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
 * Cài đặt là HUB, không phải lá.
 *
 * Đây là chỗ hấp thụ mọi thứ mang tính quản lý — sổ, người trong sổ, các loại
 * thu chi, thông báo, cài app, cỡ chữ, nền sáng tối, đăng xuất. Nhờ vậy thanh
 * điều hướng chỉ cần bốn mục, và không còn thứ gì phải trốn trong menu avatar
 * như bản cũ (nơi "Danh mục" và "Cài đặt" nằm ở chỗ không ai nghĩ tới mà tìm).
 *
 * Một trang dài toàn hàng có nhãn, đọc từ trên xuống — kiểu Settings của iOS,
 * thứ mà gần như ai cũng đã quen tay.
 */
export default async function SettingsPage() {
  const session = await getSession();
  const userId = session!.user.id;

  const [groups, scope, pendingJoins] = await Promise.all([
    getMyGroups(userId),
    getScope(userId),
    getMyPendingJoinRequests(userId),
  ]);
  const activeName = groups.find((g) => g.id === scope.groupId)?.name;

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" subtitle="Sổ, người trong sổ, và ứng dụng" />

      {/* MỘT hàng dẫn sang /groups, không phải một bản chép của danh sách sổ.
          Trước đây trang này và /groups vẽ cùng một thứ theo hai kiểu khác nhau,
          với hai bộ affordance khác nhau, và cả hai đều dẫn tới /groups/[id] —
          nên "danh sách sổ của tôi nằm ở đâu" có hai câu trả lời. Đổi sổ đang
          mở vốn là việc của bộ chọn sổ trên khung app (quy tắc 6), không phải
          của một danh sách trong Cài đặt. */}
      <SettingGroup title="Sổ của tôi">
        <LinkRow
          href="/groups"
          icon={BookOpen}
          label="Sổ của tôi"
          hint={
            groups.length === 0
              ? "Chưa có sổ nào — tạo sổ đầu tiên"
              : `${groups.length} sổ${activeName ? ` · đang mở: ${activeName}` : ""}`
          }
          badge={
            pendingJoins.length > 0 ? (
              <Badge variant="warning">{pendingJoins.length} chờ duyệt</Badge>
            ) : undefined
          }
        />
      </SettingGroup>

      <SettingGroup title="Cách ghi chép">
        <LinkRow
          href="/categories"
          icon={Tags}
          label="Các loại thu chi"
          hint="Ăn uống, xăng xe, lương… — để biết tiền đi vào những việc gì"
        />
      </SettingGroup>

      <SettingGroup title="Nhìn cho dễ">
        <ControlRow
          icon={Type}
          label="Cỡ chữ"
          hint="Chọn cỡ nào đọc thoải mái nhất — xem thử ngay bên dưới"
          stacked
        >
          <FontSizeControl />
        </ControlRow>
        <ControlRow icon={Palette} label="Nền sáng hay tối" stacked>
          <ThemeChoice />
        </ControlRow>
      </SettingGroup>

      <SettingGroup title="Ứng dụng">
        <ControlRow
          icon={Bell}
          label="Báo cho tôi khi có việc mới"
          hint="Khi có người trong sổ ghi khoản mượn, hoặc ghi đã trả tiền"
        >
          <PushManager vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""} />
        </ControlRow>
        <ControlRow
          icon={Smartphone}
          label="Cài app vào màn hình chính"
          hint="Mở nhanh như một ứng dụng thật, không cần vào trình duyệt"
          stacked
        >
          <InstallPwa />
        </ControlRow>
      </SettingGroup>

      <SettingGroup title="Tài khoản">
        <ControlRow
          icon={UserRound}
          label={session!.user.name ?? "Tài khoản của tôi"}
          hint={session!.user.email ?? undefined}
        >
          <span />
        </ControlRow>
        <SignOutRow />
      </SettingGroup>

      <p className="flex items-center justify-center gap-2 pb-4 text-center text-caption text-muted-foreground">
        <KeyRound className="size-4 shrink-0" />
        Dữ liệu của bạn chỉ hiện cho người trong sổ.
      </p>
    </div>
  );
}
