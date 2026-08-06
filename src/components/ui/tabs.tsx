"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // rounded-xl + p-1, không còn viên thuốc: máng tab là một VÙNG CHỨA, nên
      // nó theo bo góc của thẻ chứ không theo bo góc của chip.
      "inline-flex h-14 items-center justify-center rounded-xl border border-border bg-sunken p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Tab đang mở khác nhau ở CẢ nền lẫn độ đậm, không chỉ nền.
      // focus-visible:ring: bản cũ có outline-none mà không thay bằng ring nào,
      // nên focus bàn phím hoàn toàn vô hình trên tab.
      "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-5 text-body font-semibold transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:font-bold data-[state=active]:text-foreground data-[state=active]:shadow-soft",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
