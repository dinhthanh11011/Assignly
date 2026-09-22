export type MemberOption = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
};

export function memberLabel(m: MemberOption) {
  return m.name || m.email || "Thành viên";
}

/**
 * TÊN GỌI cắt ra từ họ tên đầy đủ: "Nguyễn Thị Huế" → "Huế".
 *
 * Chỉ dành cho DÒNG PHỤ của một hàng — chỗ chật nhất trong app. Ở đó "Nguyễn
 * Thị Huế bỏ tiền · chia 2 người · giấy bạc, trứng" dài tới mức trên điện thoại
 * nó bị cắt ngay giữa phần họ, và thứ còn đọc được lại là phần MANG ÍT TIN
 * NHẤT: họ thì cả nhà trùng nhau, tên gọi mới là thứ phân biệt người này với
 * người kia. Cắt từ đầu chuỗi là cắt đúng phần thừa.
 *
 * Trả `null` khi không có tên (chỉ có email) — chỗ gọi tự lùi về `memberLabel`.
 */
function givenName(m: { name: string | null }) {
  const name = m.name?.trim();
  if (!name) return null;
  const parts = name.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

/**
 * Sinh hàm rút gọn tên cho MỘT sổ cụ thể, vì rút gọn chỉ an toàn khi biết cả sổ:
 *
 *  · hai người cùng tên gọi ("Thu Hà" và "Ngọc Hà") mà rút cả hai thành "Hà" là
 *    app tự tay nói sai ai bỏ tiền. Gặp trùng thì CẢ HAI quay về tên đầy đủ —
 *    dài hơn, nhưng dài còn hơn sai;
 *  · chính mình thì gọi là "Bạn". Đọc tên mình trong danh sách của mình là một
 *    nhịp dịch thừa ("… à, mình").
 */
export function makeShortNamer(members: MemberOption[], selfId?: string) {
  const seen = new Map<string, number>();
  for (const m of members) {
    const g = givenName(m);
    if (g) seen.set(g, (seen.get(g) ?? 0) + 1);
  }
  return function shortName(m: { id: string; name: string | null; email: string | null }) {
    if (selfId && m.id === selfId) return "Bạn";
    const g = givenName(m);
    if (!g || (seen.get(g) ?? 0) > 1) return memberLabel({ ...m, image: null });
    return g;
  };
}
