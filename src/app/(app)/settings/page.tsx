import Link from "next/link";
import { Bell, Shapes, Smartphone, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PushManager } from "@/components/push-manager";
import { InstallPwa } from "@/components/install-pwa";

export const metadata = { title: "Cài đặt" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Cài đặt</h1>
        <p className="text-muted-foreground">Thông báo, sổ và tuỳ chọn ứng dụng</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shapes className="size-5 text-primary" /> Danh mục thu chi
            </CardTitle>
            <CardDescription>Thêm, sửa hoặc xoá danh mục của sổ.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/categories">Quản lý danh mục</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5 text-primary" /> Sổ và thành viên
            </CardTitle>
            <CardDescription>Tạo sổ mới, mời người khác hoặc rời sổ.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/groups">Quản lý sổ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" /> Thông báo đẩy
          </CardTitle>
          <CardDescription>
            Nhận thông báo khi có người trong sổ ghi khoản vay mới hoặc ghi nhận thu/trả nợ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushManager vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" /> Cài ứng dụng
          </CardTitle>
          <CardDescription>
            Cài Sổ Thu Chi lên thiết bị để mở nhanh như một ứng dụng thật.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallPwa />
        </CardContent>
      </Card>
    </div>
  );
}
