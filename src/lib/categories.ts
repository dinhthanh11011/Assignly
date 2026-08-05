import type { Prisma } from "@prisma/client";

/**
 * Bộ danh mục mặc định tạo kèm mỗi sổ mới. Người dùng có thể sửa/xoá/thêm sau
 * trong trang Danh mục.
 */
export const DEFAULT_CATEGORIES: { name: string; type: "INCOME" | "EXPENSE"; icon: string }[] = [
  // Khoản chi
  { name: "Ăn uống", type: "EXPENSE", icon: "🍜" },
  { name: "Đi lại", type: "EXPENSE", icon: "🛵" },
  { name: "Nhà cửa", type: "EXPENSE", icon: "🏠" },
  { name: "Hoá đơn", type: "EXPENSE", icon: "🧾" },
  { name: "Mua sắm", type: "EXPENSE", icon: "🛍️" },
  { name: "Sức khoẻ", type: "EXPENSE", icon: "💊" },
  { name: "Giải trí", type: "EXPENSE", icon: "🎬" },
  { name: "Giáo dục", type: "EXPENSE", icon: "📚" },
  { name: "Khác", type: "EXPENSE", icon: "📦" },
  // Khoản thu
  { name: "Lương", type: "INCOME", icon: "💰" },
  { name: "Thưởng", type: "INCOME", icon: "🎁" },
  { name: "Kinh doanh", type: "INCOME", icon: "🏪" },
  { name: "Đầu tư", type: "INCOME", icon: "📈" },
  { name: "Khác", type: "INCOME", icon: "✨" },
];

export function defaultCategoriesCreate(): Prisma.CategoryCreateWithoutGroupInput[] {
  return DEFAULT_CATEGORIES.map((c) => ({ name: c.name, type: c.type, icon: c.icon }));
}
