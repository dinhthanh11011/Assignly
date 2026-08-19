"use client";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CircleHelp,
  NotebookPen,
  Pencil,
  Tag,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { splitShares } from "@/lib/balance";
import { UNKNOWN_AMOUNT_LONG, signedMoney } from "@/lib/copy";
import { memberLabel, type MemberOption } from "@/lib/member";
import type { TransactionItem } from "@/components/transaction-list";
import { categoryLabel, cn, formatDate, formatMoney, formatWeekday } from "@/lib/utils";

/**
 * Chi tiết MỘT khoản, mở ra khi bấm vào hàng trong danh sách.
 *
 * Vì sao cần: một hàng trong sổ chỉ hiện được bốn thứ (icon, tên loại, một dòng
 * phụ bị cắt bằng "…", số tiền). Còn lại — ai bỏ tiền, chia cho ai mỗi người bao
 * nhiêu, ghi chú dài, ai là người ghi vào sổ — trước đây KHÔNG CÓ ĐƯỜNG NÀO xem
 * được: muốn biết phải mở form Sửa, tức là muốn đọc thì phải vào chỗ ghi. Người
 * dùng cứ mở Sửa rồi bấm Đóng, mỗi lần lại rủi ro sửa nhầm một khoản đúng.
 *
 * Nên đây là màn ĐỌC: không ô nhập nào, chữ to, mỗi dòng một sự thật. Hai việc
 * sửa/xoá nằm ở đáy sheet — cũng là chỗ duy nhất còn lại để sửa/xoá, thay cho
 * cái menu "⋮" ba chấm ở mỗi hàng (một hàng bấm được mà bên trong lại có nút bấm
 * được nữa thì trên điện thoại là bẫy bấm trượt, còn về HTML là nút lồng nút).
 */
export function TransactionDetailDialog({
  transaction: t,
  members,
  currentUserId,
  notice,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onFill,
}: {
  transaction: TransactionItem;
  members: MemberOption[];
  currentUserId: string;
  /**
   * Dải trạng thái đặt TRÊN số tiền — hiện chỉ dùng cho khoản chưa lên sổ. Nó
   * phải là thứ đọc được trước tiên: mọi con số bên dưới đều là "sẽ thành", chứ
   * chưa phải cái đang có trong sổ chung.
   */
  notice?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  /**
   * Mở màn điền số tiền. Chỉ có mặt ở khoản CHƯA BIẾT số tiền, và khi có thì nó
   * chiếm chỗ nút chính ở đáy sheet: với một khoản như thế, việc người dùng mở nó
   * ra để làm gần như luôn là điền cho xong con số còn thiếu.
   */
  onFill?: () => void;
}) {
  const inbound = t.type === "INCOME";
  const payer = t.paidBy ?? t.createdBy;
  const creator = t.createdBy;
  const date = new Date(t.date);

  // Phần mỗi người phải chịu, tính bằng CHÍNH hàm mà trang Cân đối dùng — nếu
  // chỗ này tự chia lại thì hai trang sẽ nói hai con số khác nhau về cùng một khoản.
  const shares = splitShares(
    { type: t.type, amount: t.amount, payerId: payer.id, splits: t.splits },
    members.map((m) => m.id)
  );
  const byId = new Map(members.map((m) => [m.id, m]));
  const shareRows = [...shares.entries()]
    .map(([userId, amount]) => ({
      userId,
      amount,
      name: byId.get(userId) ? memberLabel(byId.get(userId)!) : "Người đã rời sổ",
    }))
    .sort((a, b) => b.amount - a.amount);
  const splitAcrossPeople = shareRows.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoryLabel(t)}</DialogTitle>
          <DialogDescription>
            {inbound ? "Một khoản tiền vào sổ" : "Một khoản tiền ra khỏi sổ"}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3.5">
          {notice}

          {/* Số tiền là câu trả lời chính, nên nó là thứ to nhất trong sheet —
              kèm dấu, icon và một từ, không dựa vào màu. */}
          <div
            className={cn(
              "rounded-lg px-4 py-3.5",
              inbound ? "bg-income-surface" : "bg-expense-surface"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 text-label",
                inbound ? "text-income" : "text-expense"
              )}
            >
              {inbound ? (
                <ArrowDownCircle className="size-5" />
              ) : (
                <ArrowUpCircle className="size-5" />
              )}
              {inbound ? "Tiền vào" : "Tiền ra"}
            </div>
            {t.amountUnknown ? (
              // KHÔNG dùng lớp `num` và cỡ money ở đây: đây là một câu, không phải
              // một con số, và đặt nó vào đúng khuôn con số cỡ đại thì mắt đọc ra
              // "số tiền là chữ này" rồi đi tìm con số thật.
              <>
                <p className="mt-1 flex items-center gap-2 break-words text-title font-bold text-foreground">
                  <CircleHelp className="size-6 shrink-0" />
                  {UNKNOWN_AMOUNT_LONG}
                </p>
                <p className="mt-1 text-caption text-muted-foreground">
                  Chưa cộng vào tổng thu chi của sổ. Điền số tiền khi bạn biết.
                </p>
              </>
            ) : (
              <p
                className={cn(
                  "num mt-1 break-words text-money-lg",
                  inbound ? "text-income" : "text-expense"
                )}
              >
                {signedMoney(t.amount, inbound ? "in" : "out")}
              </p>
            )}
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <DetailRow icon={CalendarDays} label="Ngày">
              {formatWeekday(date)}, {formatDate(date)}
            </DetailRow>

            <DetailRow icon={Tag} label="Ghi là loại gì">
              {t.categories.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {t.categories.map((c) => (
                    <span
                      key={c.category.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-sunken px-3 py-1 text-label"
                    >
                      {c.category.icon ?? "📁"} {c.category.name}
                    </span>
                  ))}
                </span>
              ) : (
                "Chưa ghi là gì"
              )}
            </DetailRow>

            <DetailRow icon={Wallet} label={inbound ? "Ai cầm tiền" : "Ai bỏ tiền ra"}>
              {memberLabel({ ...payer, image: null })}
              {payer.id === currentUserId && " (chính bạn)"}
            </DetailRow>

            {splitAcrossPeople && (
              <DetailRow icon={Users} label={inbound ? "Chia cho ai" : "Ai cùng chịu"}>
                <span className="flex flex-col gap-1.5">
                  {shareRows.map((r) => (
                    <span key={r.userId} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {r.name}
                        {r.userId === currentUserId && " (bạn)"}
                      </span>
                      {/* Chưa biết tổng thì phần của mỗi người tính ra đúng 0, và
                          in "0 ₫" cạnh tên là nói với họ rằng họ không phải trả gì.
                          Danh sách tên trần vẫn giữ đủ điều cần nhớ: chia cho ai. */}
                      {!t.amountUnknown && (
                        <span className="num shrink-0">{formatMoney(r.amount)}</span>
                      )}
                    </span>
                  ))}
                </span>
              </DetailRow>
            )}

            {t.note && (
              <DetailRow icon={NotebookPen} label="Ghi chú">
                <span className="whitespace-pre-wrap break-words">{t.note}</span>
              </DetailRow>
            )}

            {/* Người ghi sổ chỉ có nghĩa khi sổ có nhiều người — sổ riêng thì
                lúc nào cũng là chính mình, thành một dòng vô ích. */}
            {members.length > 1 && (
              <DetailRow icon={NotebookPen} label="Người ghi vào sổ">
                {memberLabel({ ...creator, image: null })}
                {creator.id === currentUserId && " (chính bạn)"}
              </DetailRow>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 /> Xoá khoản này
          </Button>
          {t.amountUnknown && onFill ? (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Pencil /> Sửa khoản này
              </Button>
              <Button onClick={onFill}>
                <CircleHelp /> Điền số tiền
              </Button>
            </>
          ) : (
            <Button onClick={onEdit}>
              <Pencil /> Sửa khoản này
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Một sự thật: nhãn xám ở trên, nội dung cỡ đọc ở dưới. */
function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-start gap-3 px-3.5 py-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-caption text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-body">{children}</div>
      </div>
    </div>
  );
}
