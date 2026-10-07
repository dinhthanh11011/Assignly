import { ArrowRight, CircleCheck } from "lucide-react";
import { getGroupBalance, getMemberOptions } from "@/lib/queries";
import { MemberAvatar } from "@/components/member-avatar";
import { SettleButton } from "@/components/settle-actions";
import { SettlementHistory } from "@/components/settlement-history";
import { memberLabel } from "@/lib/member";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { netLabel } from "@/lib/copy";
import { formatMoney } from "@/lib/utils";

/**
 * Tab "Tiền chung" của trang Nợ: tiền cả nhà chi chung, ai đã trả hộ ai.
 * Tính trên TOÀN BỘ lịch sử sổ (nợ nhau không hết khi sang tháng).
 *
 *   1. Bạn đang ở đâu (một con số có dấu).
 *   2. Ai cần đưa ai bao nhiêu — mỗi lượt một hàng, bấm "Đã đưa tiền" là ghi.
 *   3. Số dư từng người.
 *   4. Lịch sử đã đưa tiền (gập lại).
 *
 * Tách khỏi trang để stream riêng: `getGroupBalance` là truy vấn nặng nhất.
 */
export async function GroupBalancePanel({ userId, groupId }: { userId: string; groupId: string }) {
  const [balance, members] = await Promise.all([
    getGroupBalance(userId, groupId),
    getMemberOptions(groupId),
  ]);
  if (!balance) return null;

  const me = balance.me;
  const net = me?.net ?? 0;
  const name = (u: Parameters<typeof memberLabel>[0]) =>
    u.id === userId ? "Bạn" : memberLabel(u);

  return (
    <div className="space-y-8">
      {/* 1 — vị trí của bạn */}
      <section aria-labelledby="me-title" className="money-cq rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 id="me-title" className="text-label text-muted-foreground">
          {net > 0 ? "Mọi người còn nợ bạn" : net < 0 ? "Bạn còn nợ mọi người" : "Bạn và mọi người"}
        </h2>
        <Amount value={net} size="hero" icon className="mt-1" />
        <p className="mt-2 text-body text-muted-foreground">
          {net > 0
            ? "Bạn đã trả hộ nhiều hơn phần của mình — mọi người sẽ đưa lại cho bạn."
            : net < 0
              ? "Bạn cần đưa thêm để về đúng phần của mình."
              : "Bạn không nợ ai và cũng không ai nợ bạn."}
        </p>
        {me && (
          <dl className="mt-4 grid grid-cols-1 gap-2.5 @min-[16em]:grid-cols-2">
            <div className="rounded-lg bg-sunken px-3.5 py-3">
              <dt className="text-caption text-muted-foreground">Bạn đã trả</dt>
              <dd className="num text-body-lg font-semibold">{formatMoney(me.paid)}</dd>
            </div>
            <div className="rounded-lg bg-sunken px-3.5 py-3">
              <dt className="text-caption text-muted-foreground">Phần của bạn</dt>
              <dd className="num text-body-lg font-semibold">{formatMoney(me.share)}</dd>
            </div>
            {me.received > 0 && (
              <div className="rounded-lg bg-sunken px-3.5 py-3">
                <dt className="text-caption text-muted-foreground">Tiền thu bạn đang cầm</dt>
                <dd className="num text-body-lg font-semibold">{formatMoney(me.received)}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      {/* 2 — ai đưa ai */}
      <section aria-labelledby="transfers-title" className="space-y-3">
        <div>
          <h2 id="transfers-title" className="text-title">
            Ai đưa ai
          </h2>
          <p className="text-caption text-muted-foreground">
            Đưa đúng các khoản này là cả sổ hết nợ nhau.
          </p>
        </div>
        {balance.transfers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState size="inline" icon={CircleCheck} title="Mọi người đã hết nợ nhau" />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {balance.transfers.map((t) => {
              const mine = t.fromUserId === userId || t.toUserId === userId;
              return (
                <li
                  key={`${t.fromUserId}-${t.toUserId}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5"
                >
                  <span className="flex shrink-0 items-center -space-x-1.5" aria-hidden>
                    <MemberAvatar user={t.from} className="size-9" />
                    <MemberAvatar user={t.to} className="size-9" />
                  </span>
                  <span className="min-w-0 flex-[1_1_9rem]">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-body-lg">
                      <span className="truncate">{name(t.from)}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="sr-only">đưa cho</span>
                      <span className="truncate">{name(t.to)}</span>
                    </span>
                    <span className="num block text-money-row">{formatMoney(t.amount)}</span>
                  </span>
                  <SettleButton
                    groupId={groupId}
                    members={members}
                    label="Đã đưa tiền"
                    variant={mine ? "soft" : "outline"}
                    className="ml-auto"
                    draft={{ fromUserId: t.fromUserId, toUserId: t.toUserId, amount: t.amount }}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <SettleButton
          groupId={groupId}
          members={members}
          draft={{ fromUserId: userId, toUserId: "", amount: 0 }}
          label="Ghi một lần đưa tiền khác"
          variant="ghost"
          className="-ml-2 px-2 text-primary"
        />
      </section>

      {/* 3 — từng người */}
      <section aria-labelledby="members-title" className="space-y-3">
        <h2 id="members-title" className="text-title">
          Mỗi người
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {balance.rows.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5">
              <MemberAvatar user={r.user} className="size-10 shrink-0" />
              <div className="min-w-0 flex-[1_1_10rem]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-body-lg">{memberLabel(r.user)}</span>
                  {r.userId === userId && <Badge>bạn</Badge>}
                  {!r.isMember && <Badge variant="muted">đã rời sổ</Badge>}
                </div>
                <p className="num text-caption text-muted-foreground">
                  đã trả {formatMoney(r.paid)} · phần mình {formatMoney(r.share)}
                  {r.received > 0 ? ` · cầm tiền thu ${formatMoney(r.received)}` : ""}
                  {r.settledOut > 0 ? ` · đã đưa ${formatMoney(r.settledOut)}` : ""}
                  {r.settledIn > 0 ? ` · đã nhận ${formatMoney(r.settledIn)}` : ""}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 flex-col items-end">
                <Amount value={r.net} />
                <span className="text-caption text-muted-foreground">
                  {r.userId === userId
                    ? r.net > 0
                      ? "mọi người nợ bạn"
                      : r.net < 0
                        ? "bạn nợ mọi người"
                        : "không nợ ai"
                    : netLabel(r.net)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 4 — lịch sử, gập lại: ít khi cần xem nhưng phải sửa/xoá được */}
      <SettlementHistory
        groupId={groupId}
        userId={userId}
        members={members}
        items={balance.history.items}
        nextCursor={balance.history.nextCursor}
        count={balance.history.count}
      />
    </div>
  );
}
