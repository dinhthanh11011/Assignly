"use client";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tải lại trang — có mạng lại thì service worker trả trang thật. */
export function RetryButton() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      <RotateCw /> Thử lại
    </Button>
  );
}
