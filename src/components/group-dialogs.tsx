"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createGroup, requestToJoinByCode } from "@/lib/actions";

export function CreateGroupButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>Groups hold shared tasks and members.</DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              try {
                const { id } = await createGroup(fd);
                toast.success("Group created");
                setOpen(false);
                router.push(`/groups/${id}`);
              } catch (e) {
                toast.error((e as Error).message);
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Group name</Label>
            <Input id="name" name="name" placeholder="e.g. Flat 4B chores" autoFocus required />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinGroupButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogIn className="size-4" /> Join
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>
            Enter the invite code someone shared. An admin approves your request before you&apos;re
            in.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              try {
                const { status, groupId } = await requestToJoinByCode(String(fd.get("code") ?? ""));
                setOpen(false);
                if (status === "member") {
                  toast.success("You're already in this group");
                  router.push(`/groups/${groupId}`);
                } else {
                  toast.success("Request sent — waiting for an admin to approve");
                  router.push("/groups");
                }
              } catch (e) {
                toast.error((e as Error).message);
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="code">Invite code</Label>
            <Input
              id="code"
              name="code"
              placeholder="ABCD2345"
              autoFocus
              required
              className="uppercase tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Request to join"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
