import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring flex min-h-32 w-full rounded-lg border border-input bg-card px-4 py-3.5 text-field text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
