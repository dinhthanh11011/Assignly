import { Bell, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PushManager } from "@/components/push-manager";
import { InstallPwa } from "@/components/install-pwa";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Notifications & app preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" /> Push notifications
          </CardTitle>
          <CardDescription>
            Get reminded when a task is due and nobody in your group is assigned yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushManager vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" /> Install app
          </CardTitle>
          <CardDescription>
            Install Assignly as an app on your device for quick, offline-friendly access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallPwa />
        </CardContent>
      </Card>
    </div>
  );
}
