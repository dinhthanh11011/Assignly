/**
 * LỖI CỦA SERVER ACTION PHẢI ĐI VỀ CLIENT BẰNG **GIÁ TRỊ TRẢ VỀ**, KHÔNG PHẢI
 * BẰNG `throw`.
 *
 * Đây không phải chuyện gu code. Trên bản production, React **xoá sạch** message
 * của mọi lỗi ném ra từ phía server trước khi gửi sang trình duyệt — xem
 * `resolveErrorProd` trong `react-server-dom-turbopack-client.browser.production.js`:
 *
 *     Error("An error occurred in the Server Components render. The specific
 *            message is omitted in production builds to avoid leaking sensitive
 *            details. A digest property is included on this error instance…")
 *
 * Nghĩa là mọi câu tiếng Việt đã viết trong `actions.ts` — "Loại này đã có rồi",
 * "Bạn đang là người lập sổ. Hãy giao sổ cho người khác trước" — đều KHÔNG tới
 * được người dùng thật: cái họ nhận là đúng đoạn văn tiếng Anh ba dòng ở trên,
 * nằm trong một toast đỏ. Chuyện này vô hình khi dev vì bản dev giữ nguyên
 * message; chỉ người dùng thật mới thấy.
 *
 * Docs của Next nói thẳng điều này (`01-getting-started/10-error-handling.md`,
 * mục "Server Functions"): *"avoid using try/catch blocks and throw errors.
 * Instead, model expected errors as return values."*
 *
 * CÁCH LÀM Ở ĐÂY. Action vẫn `throw` như cũ (đọc dễ hơn hẳn việc mỗi nhánh sai
 * phải `return` một object), nhưng:
 *
 *  · Lỗi **nghiệp vụ** — thứ người dùng cần đọc và sửa được — ném bằng
 *    `AppError`. `run()` bắt nó lại và biến thành `{ ok: false, error }`, tức là
 *    một giá trị trả về bình thường, không bị React đụng tới.
 *  · Mọi lỗi **khác** (bug, Prisma chết, mất kết nối DB…) được ném tiếp nguyên
 *    vẹn. Chúng đáng bị redact — message của chúng có thể lộ cấu trúc DB — và
 *    chúng cần rơi vào error boundary + log kèm digest như cũ.
 *
 * Việc ném tiếp cũng là thứ giữ cho `redirect()` và `notFound()` chạy đúng: hai
 * hàm đó làm việc bằng cách ném một lỗi đặc biệt, mà ở đây ta chỉ bắt đúng
 * `AppError` nên chúng đi xuyên qua an toàn.
 */

/**
 * Lỗi **người dùng đọc được**: message của nó được đưa nguyên văn về trình duyệt.
 *
 * Chỉ dùng cho những gì người dùng tự sửa được (thiếu quyền, nhập sai, trạng
 * thái không cho phép). Đừng dùng nó để bọc lỗi hệ thống — message của lỗi hệ
 * thống bị redact là ĐÚNG, không phải một vấn đề cần chữa.
 */
export class AppError extends Error {
  /**
   * Dấu nhận biết thay cho `instanceof`.
   *
   * `instanceof` chỉ đúng khi cả hai phía dùng CÙNG một bản module. Next có thể
   * gói `action-result.ts` vào nhiều bundle khác nhau (bundle của server action,
   * bundle RSC, bundle client), và khi đó `AppError` ở bên này không còn là
   * `AppError` ở bên kia — `run()` sẽ không nhận ra lỗi nghiệp vụ nữa và ném nó
   * tiếp, tức là lặng lẽ quay về đúng cái bệnh redact mà cả file này sinh ra để
   * chữa. Một cờ trên chính object thì đi qua mọi ranh giới bundle.
   */
  readonly isAppError = true as const;

  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/** Xem `AppError.isAppError`. */
function isAppError(e: unknown): e is AppError {
  return (
    e instanceof AppError ||
    (typeof e === "object" && e !== null && (e as AppError).isAppError === true)
  );
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Bọc thân của một server action. Xem khối doc đầu file.
 *
 * Dùng ở phía server: `export async function x() { return run(async () => {…}) }`.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (isAppError(e)) return { ok: false, error: e.message };
    // Không phải lỗi nghiệp vụ → để nguyên cho error boundary của Next, và cho
    // log phía server giữ được stack thật.
    throw e;
  }
}

/**
 * Bọc **lời gọi** một server action ở phía client, dựng lại exception từ
 * `{ ok: false }`.
 *
 * Nhờ nó mà mọi `try/catch` + `toast.error((e as Error).message)` đã có sẵn chạy
 * đúng trở lại mà không phải viết lại từng cái — chỉ khác là message bây giờ là
 * câu tiếng Việt thật chứ không phải đoạn văn redact của React.
 *
 * Lỗi MẠNG vẫn nổi lên nguyên dạng (promise bị reject trước khi có giá trị trả
 * về), nên `isOfflineError` trong `offline-queue.ts` vẫn nhận ra và hàng chờ
 * ngoại tuyến không bị ảnh hưởng.
 */
export async function call<T>(p: Promise<ActionResult<T>>): Promise<T> {
  let res: ActionResult<T>;
  try {
    res = await p;
  } catch (e) {
    throw friendlyServerError(e);
  }
  if (!res.ok) throw new AppError(res.error);
  return res.data;
}

/**
 * Lỗi HỆ THỐNG từ server (thứ `run()` cố ý ném tiếp) tới trình duyệt dưới dạng
 * "Minified React error #441" — đúng đoạn redact ở khối doc đầu file. Không ai
 * đọc được nó, và nó thường là lỗi thoáng qua (DB chậm lúc hàm serverless vừa
 * thức dậy, hết kết nối trong pool…): bấm lại là xong. Nên nói đúng điều đó.
 *
 * Nhận ra nó bằng `digest`: React gắn digest lên mọi lỗi server đã redact, còn
 * lỗi mạng (`TypeError: Failed to fetch`) thì không — nên `isOfflineError` vẫn
 * thấy nguyên lỗi mạng như cũ. Digest bắt đầu bằng `NEXT_` là `redirect()` /
 * `notFound()`, phải để nguyên cho Next xử lý.
 *
 * Digest được giữ lại trong câu: nó là thứ duy nhất nối cái toast này với dòng
 * log thật (kèm stack) trên Vercel.
 */
function friendlyServerError(e: unknown): unknown {
  const digest = (e as { digest?: unknown } | null)?.digest;
  if (typeof digest !== "string" || digest.startsWith("NEXT_")) return e;
  return new AppError(`Máy chủ đang trục trặc một chút, bạn thử lại giúp mình nhé. (mã ${digest})`);
}
