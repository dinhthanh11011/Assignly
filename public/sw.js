/* Service worker Sổ Thu Chi: app-shell ngoại tuyến + nhận thông báo đẩy. */
/* v2: thêm cache cho `/_next/static/*`. Bản v1 chỉ cache HTML của điều hướng, nên
   mở app lúc mất mạng thì lấy được HTML mà CSS/JS thì không — trang hiện ra TRƠ,
   không một chút định dạng nào. Phải đổi số phiên bản (không chỉ sửa fetch): HTML
   trong cache v1 trỏ tới chunk mang mã băm của bản build cũ, mà đúng những chunk
   đó là thứ chưa bao giờ được cache — giữ lại thì lần mở offline tới vẫn trơ y
   như cũ. Xoá đi để lần vào mạng kế tiếp cache lại HTML VÀ chunk của nó cùng lứa. */
const CACHE = "so-thu-chi-v2";
const APP_SHELL = ["/", "/offline"];

/* Tài sản tĩnh: nội dung không bao giờ đổi dưới cùng một URL.
   · `/_next/static/*` — Next nhét mã băm nội dung vào tên file (gồm cả file font
     do next/font tải về, nằm trong `static/media`);
   · icon + manifest — đổi thì đổi cả tên file.
   Nên với chúng thì CACHE TRƯỚC, MẠNG SAU: vừa chạy được khi mất mạng, vừa khỏi
   một lượt hỏi server ở mỗi lần mở app. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Không chạm vào API (nhất là OAuth callback): redirect/cookie không được cache hay phát lại.
  if (url.pathname.startsWith("/api/")) return;

  // Tài sản tĩnh: cache trước, mạng sau.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          // Chỉ cache bản 200 nguyên vẹn. `res.ok` loại 404/500, và `type` loại
          // bản 206 (Range) — cache một mẩu file rồi phát lại như cả file là cách
          // làm font/CSS hỏng theo kiểu rất khó tìm ra.
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Điều hướng: mạng trước, hỏng thì lấy cache rồi tới trang ngoại tuyến.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        // ignoreSearch: app mở từ icon vào `/?source=pwa`, còn bản cache là `/`.
        .catch(() =>
          caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match("/offline"))
        )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Sổ Thu Chi", body: "Bạn có thông báo mới." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    /* keep default */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/" },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
