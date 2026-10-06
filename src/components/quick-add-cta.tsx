"use client";
import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { openQuickAdd } from "@/lib/quick-add";

/** Mở hộp thoại "Ghi một khoản" của khung app từ bất kỳ đâu trong trang. */
export function QuickAddCta({
  label = "Ghi khoản",
  ...props
}: Omit<ButtonProps, "onClick"> & { label?: string }) {
  return (
    <Button {...props} onClick={() => openQuickAdd()}>
      <Plus aria-hidden />
      {label}
    </Button>
  );
}
