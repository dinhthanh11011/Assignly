import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Máy chủ push của các trình duyệt. `endpoint` là một URL mà server sẽ POST tới
 * mỗi khi có thông báo (`src/lib/push.ts`), nên nhận bất cứ URL nào là cho người
 * dùng bắt server gọi vào mạng nội bộ. Trình duyệt mới cần thêm máy chủ nào thì
 * thêm vào đây.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge (Chromium), Opera, Samsung
  /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/, // Firefox
  /^([a-z0-9-]+\.)*push\.apple\.com$/, // Safari
  /^([a-z0-9-]+\.)*notify\.windows\.com$/, // Edge cũ (WNS)
];

const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine((s) => {
      try {
        const u = new URL(s);
        return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname));
      } catch {
        return false;
      }
    }),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

/** `requireUserId` chứ không phải `auth()`: nó chặn luôn tài khoản đã bị khoá. */
async function currentUserId() {
  try {
    return await requireUserId();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = subscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;

  // Một endpoint đã thuộc người khác chỉ được chuyển chủ khi khoá mã hoá cũng
  // khớp — tức là đúng trình duyệt đó vừa đăng nhập tài khoản khác. Chỉ biết
  // mỗi URL thì không đủ để giành thông báo của máy người ta về tay mình.
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (
    existing &&
    existing.userId !== userId &&
    (existing.p256dh !== keys.p256dh || existing.auth !== keys.auth)
  ) {
    return NextResponse.json({ error: "Subscription conflict" }, { status: 409 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint === "string" && endpoint) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint, userId } })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
