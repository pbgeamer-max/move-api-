"use client";
// View stubs — each view file is implemented in its own module; this file only
// re-exports simple placeholders for views owned by other work streams.
// (Replaced progressively as feature views land.)

export function ViewPlaceholder({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-white/40">
      <div className="h-8 w-8 animate-pulse rounded-full border border-white/15" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
