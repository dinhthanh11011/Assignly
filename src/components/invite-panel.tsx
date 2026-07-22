"use client";
import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rotateInvite } from "@/lib/actions";

export function InvitePanel({
  groupId,
  code,
  canManage,
}: {
  groupId: string;
  code: string | null;
  canManage: boolean;
}) {
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const link =
    typeof window !== "undefined" && current
      ? `${window.location.origin}/join/${current}`
      : "";

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (navigator.share && link) {
      await navigator.share({ title: "Join my TaskFlow group", url: link }).catch(() => {});
    } else {
      copy();
    }
  }

  if (!current) {
    return <p className="text-sm text-muted-foreground">No active invite.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input readOnly value={current} className="font-mono text-lg tracking-[0.3em]" />
        <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
          {copied ? <Check className="size-4 text-[var(--color-success)]" /> : <Copy className="size-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={share} aria-label="Share">
          <Share2 className="size-4" />
        </Button>
      </div>
      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                const { code } = await rotateInvite(groupId);
                setCurrent(code);
                toast.success("New invite code generated");
              } catch (e) {
                toast.error((e as Error).message);
              }
            })
          }
        >
          <RefreshCw className="size-4" /> Generate new code
        </Button>
      )}
    </div>
  );
}
