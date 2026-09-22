import webpush from "web-push";
import { after } from "next/server";
import { prisma } from "@/lib/db";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Extra structured data for in-app handling (e.g. a join-request id). */
  data?: Record<string, string>;
};

/** Send a web-push notification to every subscription of a user. Prunes dead endpoints. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;
  ensureConfigured();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    })
  );
}

/**
 * Lưu một thông báo trong app và đẩy web-push cho cùng người đó.
 *
 * **Phần đẩy push chạy SAU khi đã trả lời người dùng** (`after` của Next).
 * `sendPushToUser` gọi HTTP sang FCM/APNs cho từng thiết bị đã đăng ký, và
 * server ở `sin1` phải chờ hết lượt đi/về đó. Trước đây nó nằm thẳng trong
 * đường đi của server action, nên ghi một khoản trong sổ 5 người × 2 thiết bị
 * là người bấm nút phải chờ 10 request sang Google/Apple xong mới thấy chữ
 * "Đã ghi khoản" — họ trả tiền thời gian cho một việc chẳng liên quan gì tới họ.
 *
 * Hàng `Notification` thì VẪN ghi đồng bộ: chuông trong app phải đúng ngay ở
 * lần vẽ lại kế tiếp, mà lần đó có thể xảy ra trước khi `after` kịp chạy.
 *
 * `after` cần một request đang chạy. Mọi đường dẫn tới hàm này đều xuất phát từ
 * server action (actions.ts / admin-actions.ts / join.ts) nên điều kiện đó luôn
 * đúng — nếu sau này có việc chạy nền gọi tới đây thì phải xem lại chỗ này.
 */
export async function notifyUser(
  userId: string,
  type: string,
  payload: PushPayload
) {
  await prisma.notification.create({
    data: { userId, type, payload: payload as object },
  });
  after(() => sendPushToUser(userId, payload).catch(() => {}));
}
