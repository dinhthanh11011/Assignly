export type MemberOption = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
};

export function memberLabel(m: MemberOption) {
  return m.name || m.email || "Thành viên";
}
