import { ArrowRight } from "lucide-react";
import { getGroupBalance, getMemberOptions } from "@/lib/queries";
import { MemberAvatar } from "@/components/member-avatar";
import {
  DeleteSettlementButton,
  EditSettlementButton,
  SettleButton,
} from "@/components/settle-actions";
import { memberLabel } from "@/lib/member";
import { Badge } from "@/components/ui/badge";
import { EmptyHint, SectionCard, SummaryCard } from "@/components/page-shell";
import { netLabel } from "@/lib/copy";
import { cn, dateKey, formatDate, formatMoney } from "@/lib/utils";

/**
 * Tab "Tiền chung" của trang Nợ — tiền cả nhà tiêu chung, ai đã trả hộ ai.
 *
 * Trước đây đây là một route riêng (`/balance`, nhãn "Cân đối") nằm ngang hàng
 * với "Vay nợ" trong menu. Hai mục đó đọc ra như đồng nghĩa: cùng nói về "nợ",
 * cùng dùng chữ "còn phải thu / còn phải trả". Sự khác nhau thật sự là QUAN HỆ
 * — người kia là người ngoài hay là người trong sổ — mà quan hệ thì chỉ học
 * được bằng cách đặt cạnh nhau để so, không học được bằng hai dòng menu cách
 * nhau 40px. Nên nó thành tab thứ hai, ngay bên cạnh tab "Mượn tiền".
 *
 * Dấu hiệu phân biệt mạnh nhất không nằm ở chữ mà ở hình: hàng bên tab này có
 * KHUÔN MẶT (avatar người trong sổ), hàng bên tab kia chỉ có tên gõ tay.
 *
 * Tách khỏi trang để `/loans` có thể stream nó riêng: `getGroupBalance` phải
 * đọc toàn bộ lịch sử sổ nên là truy vấn nặng nhất trang.
 */
export async function GroupBalancePanel({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const [balance, members] = await Promise.all([
    getGroupBalance(userId, groupId),
    getMemberOptions(groupId),
  ]);
  if (!balance) return null;

  const me = balance.me;
  const owed = me && me.net > 0 ? me.net : 0;
  const owing = me && me.net < 0 ? -me.net : 0;

  return (
    <div className="space-y-4">
      <SummaryCard
        label={
          owed > 0
            ? "Người trong sổ còn nợ bạn"
            : owing > 0
              ? "Bạn còn nợ người trong sổ"
              : "Bạn và mọi người"
        }
        amount={Math.abs(me?.net ?? 0)}
        tone={owed > 0 ? "income" : owing > 0 ? "expense" : "neutral"}
        figures={
          me
            ? [
                { label: "Bạn đã trả", value: me.paid },
                { label: "Phần của bạn", value: me.share },
              ]
            : undefined
        }
        sentence={
          owed > 0
            ? "Bạn đã trả hộ nhiều hơn phần của mình, mọi người sẽ đưa lại cho bạn."
            : owing > 0
              ? "Bạn cần đưa thêm để về đúng phần của mình."
              : "Bạn không nợ ai và cũng không ai nợ bạn 🎉"
        }
      >
        <div className="mt-4">
          <SettleButton
            groupId={groupId}
            members={members}
            draft={{ fromUserId: userId, toUserId: "", amount: 0 }}
            label="Ghi: đã đưa tiền cho nhau"
            variant="default"
            size="default"
            className="w-full"
          />
        </div>
      </SummaryCard>

      <SectionCard title="Ai đã trả bao nhiêu">
        <div className="divide-y divide-border">
          {balance.rows.map((r) => (
            <div key={r.userId} className="flex min-h-16 items-center gap-3 py-3">
              <MemberAvatar user={r.user} className="size-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-body-lg">{memberLabel(r.user)}</span>
                  {r.userId === userId && <Badge>bạn</Badge>}
                  {!r.isMember && <Badge variant="muted">đã rời sổ</Badge>}
                </div>
                {/* Cho XUỐNG DÒNG chứ không cắt bằng "…": trên điện thoại cột
                    này chỉ còn ~180px nên truncate ăn mất đúng phần giải thích
                    con số bên phải từ đâu ra. */}
                <div className="num text-caption text-muted-foreground">
                  đã trả {formatMoney(r.paid)} · phần của mình {formatMoney(r.share)}
                  {r.settledOut > 0 ? ` · đã đưa lại ${formatMoney(r.settledOut)}` : ""}
                  {r.settledIn > 0 ? ` · đã nhận lại ${formatMoney(r.settledIn)}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "num text-money-row",
                    r.net > 0 ? "text-income" : r.net < 0 ? "text-expense" : "text-muted-foreground"
                  )}
                >
                  {r.net > 0 ? "+" : r.net < 0 ? "−" : ""}
                  {formatMoney(Math.abs(r.net))}
                </div>
                <div className="text-caption text-muted-foreground">{netLabel(r.net)}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Ai cần đưa tiền cho ai">
        {balance.transfers.length === 0 ? (
          <EmptyHint>Không ai cần đưa tiền cho ai nữa 🎉</EmptyHint>
        ) : (
          /* Xếp THÀNH HAI DÒNG, không phải một hàng ngang co giãn: một hàng gồm
             2 avatar + 2 tên + mũi tên + số tiền + nút không bao giờ vừa chiều
             ngang điện thoại — tên bị bóp về 0 rồi mũi tên và số tiền đè lên
             nhau. Dòng trên là "ai đưa ai", dòng dưới là số tiền và nút ghi. */
          <div className="space-y-2.5">
            {balance.transfers.map((t) => (
              <div
                key={`${t.fromUserId}-${t.toUserId}`}
                className="space-y-3 rounded-lg bg-sunken px-3.5 py-3"
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar user={t.from} className="size-9 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-body">{memberLabel(t.from)}</span>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                  <MemberAvatar user={t.to} className="size-9 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-body">{memberLabel(t.to)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="num text-money-row">{formatMoney(t.amount)}</span>
                  <SettleButton
                    groupId={groupId}
                    members={members}
                    label="Ghi: đã đưa rồi"
                    draft={{
                      fromUserId: t.fromUserId,
                      toUserId: t.toUserId,
                      amount: t.amount,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Những lần đã đưa tiền cho nhau">
        {balance.settlements.length === 0 ? (
          <EmptyHint>Chưa ghi lần đưa tiền nào.</EmptyHint>
        ) : (
          <div className="divide-y divide-border">
            {balance.settlements.map((s) => (
              // Cũng hai dòng như khối trên, cùng lý do: hai avatar + hai tên +
              // số tiền + nút sửa/xoá không vừa một hàng trên điện thoại.
              <div key={s.id} className="space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <MemberAvatar user={s.from} className="size-9 shrink-0" />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <MemberAvatar user={s.to} className="size-9 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-body">
                    {memberLabel(s.from)} → {memberLabel(s.to)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-caption text-muted-foreground">
                    {formatDate(s.date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </span>
                  <span className="num shrink-0 text-money-row">{formatMoney(s.amount)}</span>
                  <EditSettlementButton
                    groupId={groupId}
                    members={members}
                    settlementId={s.id}
                    draft={{
                      fromUserId: s.fromUserId,
                      toUserId: s.toUserId,
                      amount: s.amount,
                      date: dateKey(s.date),
                      note: s.note,
                    }}
                  />
                  <DeleteSettlementButton
                    settlementId={s.id}
                    amount={s.amount}
                    fromName={memberLabel(s.from)}
                    toName={memberLabel(s.to)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
