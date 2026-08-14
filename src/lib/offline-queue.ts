/**
 * HÀNG CHỜ GỬI — ghi được khi mất mạng.
 *
 * Đi chợ vừa là lúc hay ghi nhất, vừa là lúc yếu sóng nhất. Trước đây bấm "Ghi
 * khoản này" lúc mất mạng thì server action văng lỗi mạng, toast đỏ hiện ra, và
 * khoản đó MẤT LUÔN — người dùng phải nhớ trong đầu rồi gõ lại sau. Một lần ghi
 * thất bại là một người dùng mất: sổ thấy "không còn đúng" rồi bỏ hẳn.
 *
 * Nay khoản đó nằm lại trong IndexedDB của máy và tự gửi lên khi có mạng. Đây là
 * IndexedDB chứ không phải localStorage: localStorage đồng bộ (khoá luồng vẽ) và
 * chỉ ~5MB dùng chung với mọi thứ khác, còn hàng chờ này có thể phải sống qua
 * nhiều ngày mất mạng.
 *
 * CHỐNG GHI TRÙNG là phần quan trọng nhất ở đây. Request có thể tới được server
 * và ghi xong rồi mới đứt kết nối trên đường về — client chỉ thấy "lỗi mạng" và
 * xếp hàng gửi lại, thành ra một khoản chi ghi hai lần. Trong một cuốn sổ tiền
 * thì đó là lỗi tệ hơn hẳn việc mất khoản. Nên mỗi khoản mang một `clientId`
 * sinh ở máy, và `createTransaction` coi clientId đã tồn tại là "đã ghi rồi,
 * không ghi nữa" (xem `Transaction.clientId` trong schema).
 */

const DB_NAME = "so-thu-chi";
const DB_VERSION = 1;
const STORE = "pending-tx";

/** Bắn ra khi hàng chờ đổi, để mấy hàng "chờ gửi" trên màn tự vẽ lại. */
const CHANGED = "so-thu-chi:pending-changed";

/** Đúng những gì `createTransaction` cần, đã cắt sẵn ở client. */
export type PendingPayload = {
  groupId: string;
  clientId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  categoryIds: string[];
  note: string | null;
  paidById?: string;
  splits?: { userId: string; weight: number; amount: number | null }[];
};

export type PendingTx = {
  clientId: string;
  groupId: string;
  payload: PendingPayload;
  savedAt: number;
  /**
   * Nhãn + icon lưu kèm chứ không tra lại lúc vẽ: hàng "chờ gửi" phải hiện được
   * khi ĐANG mất mạng, mà lúc đó không hỏi server tên loại được. Vài chục byte
   * đổi lấy việc người dùng nhìn thấy đúng thứ họ vừa ghi.
   */
  label: string;
  icon: string | null;
  /**
   * Server đã trả lời nhưng là lời từ chối (VD: loại vừa bị người khác xoá).
   * Gửi lại bao nhiêu lần cũng vẫn bị từ chối, nên đánh dấu và để người dùng
   * quyết — KHÔNG âm thầm bỏ khoản tiền của họ, cũng không thử lại vô hạn.
   */
  lastError?: string;
};

function hasIdb() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      })
  );
}

function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

/** Đăng ký nghe hàng chờ đổi. Trả về hàm bỏ đăng ký. */
export function onPendingChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
}

export function newClientId(): string {
  // randomUUID chỉ có trong secure context — app luôn chạy https (PWA bắt buộc),
  // nhưng vẫn để đường lùi cho `next dev` qua IP LAN khi thử trên điện thoại thật.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueuePending(item: PendingTx): Promise<void> {
  if (!hasIdb()) throw new Error("Máy này không lưu tạm được");
  await run("readwrite", (s) => s.put(item));
  announce();
}

/**
 * Sửa một khoản đang chờ gửi.
 *
 * Sửa ở đây AN TOÀN theo cách mà sửa một khoản đã lên sổ lúc mất mạng thì không:
 * khoản này chưa hề tồn tại trên server, nên không có bản nào để ghi đè và không
 * ai khác đang sửa nó. Nó vẫn còn là bản nháp trong máy của chính người ghi.
 *
 * `lastError` bị XOÁ đi mỗi lần sửa: người dùng sửa chính là để chữa cái lý do
 * server từ chối (VD: chọn lại loại khác vì loại cũ vừa bị xoá). Giữ cờ cũ lại
 * thì `flushPending` vẫn bỏ qua khoản đó mãi mãi, và người dùng sửa xong lại
 * thấy nó nằm im — không hiểu vì sao.
 */
export async function updatePending(item: PendingTx): Promise<void> {
  if (!hasIdb()) throw new Error("Máy này không lưu tạm được");
  const next: PendingTx = { ...item };
  delete next.lastError;
  await run("readwrite", (s) => s.put(next));
  announce();
}

export async function listPending(groupId?: string): Promise<PendingTx[]> {
  if (!hasIdb()) return [];
  try {
    const all = await run<PendingTx[]>("readonly", (s) => s.getAll() as IDBRequest<PendingTx[]>);
    return all
      .filter((i) => !groupId || i.groupId === groupId)
      .sort((a, b) => a.savedAt - b.savedAt);
  } catch {
    return [];
  }
}

export async function removePending(clientId: string): Promise<void> {
  if (!hasIdb()) return;
  await run("readwrite", (s) => s.delete(clientId));
  announce();
}

/**
 * Lỗi mạng (gửi lại được) hay lỗi server từ chối (gửi lại vô nghĩa)?
 *
 * `navigator.onLine === false` là câu trả lời chắc chắn nhất — nhưng chỉ theo một
 * chiều: `true` KHÔNG có nghĩa là kết nối được (wifi có sóng mà không ra internet
 * vẫn là true), nên phải xét thêm chính lời lỗi. Mấy chuỗi dưới đây là những gì
 * fetch của từng trình duyệt thật sự ném ra khi đứt mạng.
 */
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return /Failed to fetch|Load failed|NetworkError|network ?error|ERR_INTERNET|ERR_NETWORK|Connection closed|fetch failed/i.test(
    msg
  );
}

/**
 * Gửi lần lượt những khoản đang chờ. Trả về số khoản đã gửi được.
 *
 * Gửi TUẦN TỰ, không Promise.all: đứt mạng lại giữa đường thì cái đầu tiên thất
 * bại là dừng ngay, khỏi bắn thêm chục request chắc chắn cũng thất bại. Và thứ
 * tự cũng chính là thứ tự người dùng đã ghi.
 */
export async function flushPending(
  send: (payload: PendingPayload) => Promise<unknown>
): Promise<number> {
  const items = await listPending();
  let sent = 0;
  for (const item of items) {
    // Đã bị server từ chối một lần thì bỏ qua, chờ người dùng xử lý bằng tay.
    if (item.lastError) continue;
    try {
      await send(item.payload);
      await removePending(item.clientId);
      sent += 1;
    } catch (err) {
      if (isOfflineError(err)) break;
      await run("readwrite", (s) => s.put({ ...item, lastError: (err as Error).message }));
      announce();
    }
  }
  return sent;
}
