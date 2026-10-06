import { Crown, PenLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Role = "OWNER" | "ADMIN" | "MEMBER";

const ROLE = {
  OWNER: { label: "Người lập sổ", icon: Crown, variant: "default" },
  ADMIN: { label: "Người quản lý", icon: ShieldCheck, variant: "income" },
  MEMBER: { label: "Người ghi", icon: PenLine, variant: "muted" },
} as const;

/** Chip vai trò trong sổ: icon + chữ, không chỉ màu. */
export function RoleBadge({ role, size }: { role: Role; size?: "default" | "sm" }) {
  const r = ROLE[role];
  return (
    <Badge variant={r.variant} size={size} icon={r.icon}>
      {r.label}
    </Badge>
  );
}

/** Ô chữ cái đầu tên sổ — "bìa" của một cuốn sổ. */
export function BookTile({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={
        size === "lg"
          ? "flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-page text-primary-foreground"
          : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-surface text-title text-primary"
      }
    >
      {name.trim().charAt(0).toUpperCase() || "S"}
    </span>
  );
}
