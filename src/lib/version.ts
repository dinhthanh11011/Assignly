import pkg from "../../package.json";

/**
 * Phiên bản app, gom về một chỗ.
 *
 * Đường dẫn tương đối sâu (`../../package.json`) chỉ được phép xuất hiện ở đây
 * — chép nó vào một component nào đó là tự đặt một cái bẫy cho lần chuyển thư
 * mục tiếp theo. `resolveJsonModule: true` đã bật sẵn trong `tsconfig.json`.
 */
export const APP_VERSION: string = pkg.version;

/** Vercel tự đặt biến này lúc build. Chạy cục bộ thì không có — trả null. */
export const GIT_SHA: string | null =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
