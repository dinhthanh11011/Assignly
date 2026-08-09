import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Thẻ nằm TRONG luồng trang: viền tóc 1px, KHÔNG bóng.
 *
 * Bản cũ mang cả viền 1.5px lẫn `shadow-soft`. Hai tín hiệu "tôi tách khỏi nền"
 * chồng lên nhau, và vì nền lúc đó gần như trắng y hệt thẻ, cả hai đều phải
 * đánh mạnh mới thấy — thành ra mỗi thẻ là một cái hộp bị đóng khung và đổ bóng.
 * Nay --background tối hơn một nấc nên bậc độ sáng tự làm phần lớn việc tách
 * bề mặt, viền chỉ còn xác định mép, và bóng để dành cho thứ nổi thật (dialog,
 * dropdown, thanh nav).
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-3", className)} {...props} />;
}

/**
 * `as` đổi CẤP NGỮ NGHĨA mà không đổi cỡ nhìn thấy — hai thứ đó độc lập với
 * nhau. Mặc định giữ nguyên h3 để không có chỗ gọi nào đổi ngầm; chỗ nào cần
 * đúng thứ bậc thì truyền vào.
 */
export function CardTitle({
  className,
  as: Tag = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) {
  return <Tag className={cn("text-title", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-3 p-5 pt-0", className)} {...props} />;
}
