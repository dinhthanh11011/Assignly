"use client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GroupPicker({
  groups,
  current,
}: {
  groups: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        const sp = new URLSearchParams(params.toString());
        sp.set("group", v);
        router.push(`/reports?${sp.toString()}`);
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
