"use client";
// TVORA Admin kit — shared primitives for the admin panel sub-tabs (task 2-d).
import { useEffect, useRef, type ReactNode } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

// ─── Panel card ───────────────────────────────────────────────────────────────

export function PanelCard({
  title,
  icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/8 bg-gradient-to-b from-[#141416] to-[#0e0e10] p-4 md:p-5",
        className
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-white/70">
            {icon}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// ─── Count-up number (text-content only, tabular, reduced-motion safe) ────────

export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = String(value);
      return;
    }
    const from = Number(el.textContent) || 0;
    const controls = animate(from, value, {
      duration: Math.min(0.9, 0.35 + Math.abs(value - from) * 0.015),
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      0
    </span>
  );
}

// ─── Skeleton block ───────────────────────────────────────────────────────────

export function AdminSkeleton({ className }: { className?: string }) {
  return <div className={cn("tv-shimmer rounded-md border border-white/5", className)} aria-hidden />;
}

// ─── Chips ────────────────────────────────────────────────────────────────────

export type ChipTone = "live" | "warn" | "muted" | "info" | "ok";

const CHIP_TONES: Record<ChipTone, string> = {
  live: "border-[#e5484d]/30 bg-[#e5484d]/12 text-[#ff8a8e]",
  warn: "border-[#e8a04c]/30 bg-[#e8a04c]/10 text-[#f0b26a]",
  muted: "border-white/12 bg-white/5 text-white/55",
  info: "border-[#9fb7cb]/25 bg-[#9fb7cb]/10 text-[#cfe0ee]",
  ok: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
};

export function StatusChip({
  label,
  tone,
  className,
}: {
  label: string;
  tone: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wide",
        CHIP_TONES[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

// ─── Dashed hint note row ─────────────────────────────────────────────────────

export function NoteRow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-white/12 bg-white/[0.015] p-3.5">
      {icon && <span className="mt-0.5 shrink-0 text-white/35">{icon}</span>}
      <p className="text-xs leading-relaxed text-white/50">{children}</p>
    </div>
  );
}
