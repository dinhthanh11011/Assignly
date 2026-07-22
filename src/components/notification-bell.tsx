"use client";
import { Bell } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/lib/actions";

type Notification = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
};

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [pending, start] = useTransition();
  const count = notifications.length;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open && count > 0) start(() => markNotificationsRead());
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up 🎉
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const p = (n.payload ?? {}) as { title?: string; body?: string };
              return (
                <div key={n.id} className="rounded-md px-2 py-2 hover:bg-muted">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.body}</div>
                </div>
              );
            })}
          </div>
        )}
        {pending && (
          <p className="px-2 pt-1 text-center text-[11px] text-muted-foreground">Marking read…</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
