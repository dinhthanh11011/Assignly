import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Test chỉ chạy trên các module **thuần** — không chạm DB, không chạm React.
 *
 * `src/lib/balance.ts` và `src/lib/range.ts` là hai chỗ đáng test nhất repo này:
 * chúng quyết định con số tiền hiện ra cho người dùng, chúng không cần mock gì
 * cả, và sai ở đó thì không có `npm run verify` nào bắt được — check UI, check
 * contrast, check migration đều không nhìn vào phép tính.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
