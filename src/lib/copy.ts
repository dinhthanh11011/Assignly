import { formatMoney } from "@/lib/utils";

/**
 * Câu chữ tiếng Việt cho những chỗ cách nói phụ thuộc vào DẤU hoặc CHIỀU.
 *
 * Vì sao là hàm dựng câu chứ không phải từ điển i18n: app chỉ có tiếng Việt,
 * nên một lớp tra khoá chỉ làm JSX khó đọc hơn. Thứ thật sự cần gom về một chỗ
 * là mấy câu đổi theo net dương/âm, theo LEND/BORROW — vì chúng xuất hiện ở 3–4
 * nơi và rất dễ bị viết lệch nhau.
 *
 * Nguyên tắc chi phối mọi câu ở đây: MỘT CON SỐ CẦN MỘT CHỦ NGỮ VÀ MỘT ĐỘNG TỪ.
 * "Còn phải thu: 2.000.000" là một dòng sổ cái — người dùng đã phản hồi thẳng
 * là nhìn vào không hiểu. "Anh Nam còn nợ bạn 2.000.000 ₫" là câu một đứa trẻ
 * đọc lên được.
 *
 * Mọi thứ liên quan ngày tháng phải đi qua utils.ts (kỷ luật UTC-midnight) —
 * tự format ở đây sẽ lệch ngày.
 */

/** Ai nợ ai, giữa bạn và một người cụ thể. `net` > 0 nghĩa là họ nợ bạn. */
export function netSentence(net: number, name: string) {
  if (net > 0) return `${name} còn nợ bạn ${formatMoney(net)}`;
  if (net < 0) return `Bạn còn nợ ${name} ${formatMoney(-net)}`;
  return `Bạn và ${name} không nợ nhau`;
}

/** Nhãn ngắn cho cột net trong bảng, đi kèm con số đã có dấu. */
export function netLabel(net: number) {
  if (net > 0) return "họ nợ bạn";
  if (net < 0) return "bạn nợ họ";
  return "không nợ ai";
}

/** Kết quả một tháng, nói thành câu thay vì "chênh lệch". */
export function monthSentence(income: number, expense: number) {
  const diff = income - expense;
  if (diff > 0) return `Tháng này còn dư ${formatMoney(diff)}`;
  if (diff < 0) return `Tháng này tiêu quá ${formatMoney(-diff)}`;
  return "Tháng này thu chi vừa đủ";
}

export type LoanSide = "LEND" | "BORROW";

/** "Tôi cho mượn" / "Tôi đi mượn" — thay cho "Cho vay" / "Đi vay". */
export function loanSideLabel(type: LoanSide) {
  return type === "LEND" ? "Tôi cho mượn" : "Tôi đi mượn";
}

/** Tiêu đề nhóm trong danh sách nợ. Chiều là sự thật quan trọng nhất của một
 *  khoản nợ, nên nó là TIÊU ĐỀ chứ không phải cái chip lọc dễ quên đang bật. */
export function loanDirectionHeading(type: LoanSide) {
  return type === "LEND" ? "Người ta còn nợ bạn" : "Bạn còn nợ người ta";
}

/** Câu hỏi trên ô nhập tên người, thay cho "Người vay tiền của bạn". */
export function loanPartyQuestion(type: LoanSide) {
  return type === "LEND" ? "Bạn cho ai mượn?" : "Bạn mượn của ai?";
}

/** Nhãn nút ghi một lần trả — nói rõ AI trả cho AI. */
export function loanPaymentVerb(type: LoanSide) {
  return type === "LEND" ? "Ghi: họ đã trả tôi" : "Ghi: tôi đã trả họ";
}

/** Động từ ngắn dùng trong câu, ví dụ "đã nhận lại 40%" / "đã trả 40%". */
export function loanPaidVerb(type: LoanSide) {
  return type === "LEND" ? "đã nhận lại" : "đã trả";
}

/** Tiêu đề khối lịch sử trả. */
export function loanHistoryTitle(type: LoanSide) {
  return type === "LEND" ? "Những lần họ đã trả" : "Những lần tôi đã trả";
}

/** Câu về hạn trả, thay cho "Quá hạn n ngày" / "Còn n ngày". */
export function dueSentence(daysToDue: number | null) {
  if (daysToDue === null) return "Chưa hẹn ngày trả";
  if (daysToDue < 0) return `Trễ hẹn ${-daysToDue} ngày`;
  if (daysToDue === 0) return "Hẹn trả hôm nay";
  if (daysToDue <= 14) return `Còn ${daysToDue} ngày nữa tới hẹn`;
  return "";
}

export type SplitMode = "EQUAL" | "WEIGHT" | "EXACT";

/** Ba cách chia, gọi bằng lời thường thay vì thuật ngữ. */
export function splitModeLabel(mode: SplitMode) {
  if (mode === "EQUAL") return "Chia đều";
  if (mode === "WEIGHT") return "Người nhiều người ít";
  return "Tự nhập từng người";
}

/** Trạng thái phần chia còn thiếu / thừa trong chế độ tự nhập. */
export function splitRemainderLabel(remainder: number) {
  if (remainder === 0) return { text: "Vừa đủ ✓", tone: "ok" as const };
  if (remainder > 0) return { text: `Còn thiếu ${formatMoney(remainder)}`, tone: "under" as const };
  return { text: `Thừa ${formatMoney(-remainder)}`, tone: "over" as const };
}

/** Ai bỏ tiền ra — câu hỏi đổi theo chi hay thu. */
export function payerQuestion(type: "EXPENSE" | "INCOME") {
  return type === "EXPENSE" ? "Ai bỏ tiền ra?" : "Ai cầm tiền?";
}

export function statusLabel(status: "ACTIVE" | "PAID" | "CANCELLED") {
  if (status === "PAID") return "Xong rồi";
  if (status === "CANCELLED") return "Đã bỏ";
  return "Còn nợ";
}

export function roleLabel(role: "OWNER" | "ADMIN" | "MEMBER") {
  if (role === "OWNER") return "người lập sổ";
  if (role === "ADMIN") return "người quản lý";
  return "người ghi";
}

/** Số tiền kèm dấu tường minh. Màu một mình không bao giờ được mang tin, nên
 *  dấu +/− luôn có mặt — kể cả với khoản chi. Dùng U+2212 (dấu trừ thật) chứ
 *  không phải gạch nối, để không bị đọc nhầm thành dấu nối. */
export function signedMoney(amount: number, direction: "in" | "out") {
  if (amount === 0) return formatMoney(0);
  return `${direction === "in" ? "+" : "−"}${formatMoney(Math.abs(amount))}`;
}
