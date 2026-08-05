import { Suspense } from "react";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getGroupBalance, getMemberOptions, scopeWith } from "@/lib/queries";
import { GroupPicker } from "@/components/scope-picker";
import { MemberAvatar } from "@/components/member-avatar";
import { DeleteSettlementButton, SettleButton } from "@/components/settle-actions";
import { memberLabel } from "@/lib/member";
import { EmptyHint, NoGroupState, PageHeader, SectionCard } from "@/components/page-shell";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Cân đối" };

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await getSession();
  const userId = session!.user.id;
  const sp = await searchParams;

  const { groups, groupId, data } = await scopeWith(userId, sp.group, (id) =>
    Promise.all([getGroupBalance(userId, id), getMemberOptions(id)])
  );
  if (!groupId || !data) return <NoGroupState />;

  const [balance, members] = await data;
  if (!balance) return <NoGroupState />;

  const me = balance.me;
  const owed = me && me.net > 0 ? me.net : 0;
  const owing = me && me.net < 0 ? -me.net : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Cân đối" subtitle="Toàn bộ lịch sử sổ">
        <Suspense>
          <GroupPicker groups={groups} current={groupId} />
        </Suspense>
        {balance.memberCount > 1 && (
          <SettleButton
            groupId={groupId}
            members={members}
            draft={{ fromUserId: userId, toUserId: "", amount: 0 }}
            label="Ghi nhận chuyển tiền"
            variant="gradient"
            size="default"
          />
        )}
      </PageHeader>

      {balance.memberCount < 2 ? (
        <EmptyHint>
          Sổ này chỉ có một thành viên nên không có gì để cân đối. Mời thêm người vào sổ để theo
          dõi ai đã chi bao nhiêu và ai cần bù cho ai.
        </EmptyHint>
      ) : (
        <>
          {/* Chênh lệch của chính mình — thứ người dùng mở trang này để xem */}
          <section className="hero-panel glass-edge relative overflow-hidden rounded-2xl p-5 text-white shadow-lift md:p-7">
            <div className="relative">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    owed > 0
                      ? "bg-[oklch(0.9_0.21_124)]/20 text-[oklch(0.9_0.21_124)]"
                      : "bg-white/15"
                  )}
                >
                  {owed > 0 ? (
                    <TrendingUp className="size-3" />
                  ) : owing > 0 ? (
                    <TrendingDown className="size-3" />
                  ) : (
                    <Scale className="size-3" />
                  )}
                  {owed > 0 ? "Được nợ" : owing > 0 ? "Đang nợ" : "Cân bằng"}
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  {owed > 0
                    ? "Nhóm còn nợ bạn"
                    : owing > 0
                      ? "Bạn còn nợ nhóm"
                      : "Chênh lệch của bạn"}
                </p>
              </div>

              <p className="num-hero rise-in mt-3 text-white">
                {formatMoney(Math.abs(me?.net ?? 0))}
              </p>

              {me && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <HeroFigure label="Bạn đã chi" value={me.paid} />
                  <HeroFigure label="Phần bạn phải chịu" value={me.share} />
                </div>
              )}

              <p className="mt-5 border-t border-white/12 pt-3.5 text-sm text-white/85">
                {owed > 0
                  ? "Bạn đã chi hộ nhiều hơn phần của mình."
                  : owing > 0
                    ? "Bạn cần chuyển thêm để về đúng phần của mình."
                    : "Bạn không nợ ai và cũng không ai nợ bạn 🎉"}
              </p>
            </div>
          </section>

          <SectionCard title="Chi tiêu theo người">
            <div className="divide-y divide-border/50">
              {balance.rows.map((r) => (
                <div key={r.userId} className="flex items-center gap-3 py-2.5">
                  <MemberAvatar user={r.user} className="size-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {memberLabel(r.user)}
                      </span>
                      {r.userId === userId && (
                        <span className="shrink-0 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          bạn
                        </span>
                      )}
                      {!r.isMember && (
                        <span className="shrink-0 rounded-full bg-sunken px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          đã rời sổ
                        </span>
                      )}
                    </div>
                    <div className="num truncate text-[11px] text-muted-foreground">
                      đã chi {formatMoney(r.paid)} · phải chịu {formatMoney(r.share)}
                      {r.settledOut > 0 ? ` · đã bù ${formatMoney(r.settledOut)}` : ""}
                      {r.settledIn > 0 ? ` · đã nhận bù ${formatMoney(r.settledIn)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={cn(
                        "num-lg text-[15px] font-bold",
                        r.net > 0 ? "text-income" : r.net < 0 ? "text-expense" : "text-muted-foreground"
                      )}
                    >
                      {r.net > 0 ? "+" : r.net < 0 ? "−" : ""}
                      {formatMoney(Math.abs(r.net))}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">
                      {r.net > 0 ? "được nợ" : r.net < 0 ? "đang nợ" : "cân bằng"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Cần chuyển để cân bằng">
            {balance.transfers.length === 0 ? (
              <EmptyHint>Mọi người đã cân bằng, không ai cần chuyển cho ai 🎉</EmptyHint>
            ) : (
              <div className="space-y-2">
                {balance.transfers.map((t) => (
                  <div
                    key={`${t.fromUserId}-${t.toUserId}`}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-sunken px-3.5 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <MemberAvatar user={t.from} className="size-8 shrink-0" />
                      <span className="min-w-0 truncate text-sm font-semibold">
                        {memberLabel(t.from)}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                      <MemberAvatar user={t.to} className="size-8 shrink-0" />
                      <span className="min-w-0 truncate text-sm font-semibold">
                        {memberLabel(t.to)}
                      </span>
                    </div>
                    <span className="num-lg shrink-0 text-[15px] font-bold">
                      {formatMoney(t.amount)}
                    </span>
                    <SettleButton
                      groupId={groupId}
                      members={members}
                      draft={{
                        fromUserId: t.fromUserId,
                        toUserId: t.toUserId,
                        amount: t.amount,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Lịch sử cân bằng">
            {balance.settlements.length === 0 ? (
              <EmptyHint>Chưa có lần chuyển tiền nào được ghi nhận.</EmptyHint>
            ) : (
              <div className="divide-y divide-border/50">
                {balance.settlements.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <MemberAvatar user={s.from} className="size-8 shrink-0" />
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                      <MemberAvatar user={s.to} className="size-8 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {memberLabel(s.from)} → {memberLabel(s.to)}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {formatDate(s.date)}
                          {s.note ? ` · ${s.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="num-lg shrink-0 text-sm font-bold">
                      {formatMoney(s.amount)}
                    </span>
                    <DeleteSettlementButton settlementId={s.id} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function HeroFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.07] px-3.5 py-3 backdrop-blur-sm">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/60">{label}</div>
      <div className="num-lg mt-1 truncate text-[17px] font-bold">{formatMoney(value)}</div>
    </div>
  );
}
