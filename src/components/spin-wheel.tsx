"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export type WheelMember = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const TURNS = 5; // full rotations before landing, for dramatic effect

function segmentColor(i: number, total: number) {
  return `hsl(${Math.round((i * 360) / total)}, 70%, 55%)`;
}

/**
 * A spinnable roulette of members. Calls `onResult` with the winner once the
 * spin animation settles. `busy` disables the control while the parent works.
 */
export function SpinWheel({
  members,
  onResult,
  busy = false,
  disabled = false,
}: {
  members: WheelMember[];
  onResult: (member: WheelMember) => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelMember | null>(null);
  const pickedIdx = useRef(0);

  const n = members.length;
  const seg = n ? 360 / n : 360;
  const wheel = members
    .map((_, i) => `${segmentColor(i, n)} ${(i * seg).toFixed(3)}deg ${((i + 1) * seg).toFixed(3)}deg`)
    .join(", ");

  function spin() {
    if (spinning || busy || disabled || n === 0) return;
    setWinner(null);
    setSpinning(true);
    const idx = Math.floor(Math.random() * n);
    pickedIdx.current = idx;
    const center = (idx + 0.5) * seg;
    const targetMod = (360 - center + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta < 0) delta += 360;
    setRotation(rotation + TURNS * 360 + delta);
  }

  function onSpinEnd() {
    if (!spinning) return;
    setSpinning(false);
    const picked = members[pickedIdx.current];
    setWinner(picked);
    onResult(picked);
  }

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="relative size-64">
        {/* Pointer */}
        <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
          <div className="size-0 border-x-8 border-t-[14px] border-x-transparent border-t-foreground" />
        </div>
        {/* Wheel */}
        <div
          className="size-64 rounded-full border-4 border-foreground/10 shadow-lg"
          style={{
            background: `conic-gradient(${wheel})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
          onTransitionEnd={onSpinEnd}
        >
          {members.map((m, i) => {
            const center = (i + 0.5) * seg;
            return (
              <div
                key={m.id}
                className="pointer-events-none absolute inset-0 flex justify-center"
                style={{ transform: `rotate(${center}deg)` }}
              >
                <span className="mt-5 text-xs font-bold text-white drop-shadow">
                  {initials(m.name, m.email)}
                </span>
              </div>
            );
          })}
        </div>
        {/* Hub */}
        <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-foreground/10 bg-background" />
      </div>

      <div className="h-6 text-center text-sm">
        {winner ? (
          <span className="font-semibold text-primary">🎉 {winner.name || winner.email}</span>
        ) : spinning ? (
          <span className="text-muted-foreground">Spinning…</span>
        ) : (
          <span className="text-muted-foreground">{n} member(s) in the draw</span>
        )}
      </div>

      <Button
        variant="gradient"
        onClick={spin}
        disabled={spinning || busy || disabled || n === 0}
      >
        {spinning ? "Spinning…" : winner ? "Spin again" : "Spin"}
      </Button>
    </div>
  );
}
