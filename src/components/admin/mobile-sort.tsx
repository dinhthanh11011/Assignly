"use client";
import Link from "next/link";
import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Menu sắp xếp cho dạng thẻ (<md), nơi không có tiêu đề cột để bấm. */
export function MobileSort({
  options,
}: {
  options: { label: string; href: string; active: boolean }[];
}) {
  const current = options.find((o) => o.active);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-ring inline-flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-body font-medium text-foreground transition-colors duration-150 hover:bg-sunken">
        <ArrowUpDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 truncate">
          <span className="sr-only">Sắp xếp: </span>
          {current?.label ?? "Sắp xếp"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sắp xếp theo</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuItem key={o.href} asChild>
            <Link href={o.href} scroll={false} aria-current={o.active ? "true" : undefined}>
              <Check className={o.active ? "text-primary" : "invisible"} aria-hidden />
              {o.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
