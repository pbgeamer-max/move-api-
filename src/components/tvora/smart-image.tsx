"use client";
// TVORA SmartImage — graceful <img> that swaps to a procedural fallback when the
// generated asset is missing (assets generate in background; never show broken art).
// Lint-safe: no effect-based state sync — failure state is keyed to the src it failed on.
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SmartImage({
  src,
  fallback,
  alt,
  className,
  loading: loadingProp,
}: {
  src: string;
  fallback: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [fail, setFail] = useState<{ src: string; stage: 1 | 2 } | null>(null);
  const stage = fail && fail.src === src ? fail.stage : 0;
  const display = stage === 0 ? src : stage === 1 ? fallback : "";

  if (!display) {
    return (
      <span aria-hidden className={cn("block h-full w-full bg-gradient-to-br from-[#131318] to-[#0a0a0c]", className)} />
    );
  }
  return (
    <img
      src={display}
      alt={alt}
      loading={loadingProp}
      onError={() => setFail({ src, stage: stage === 0 ? 1 : 2 })}
      className={className}
      draggable={false}
    />
  );
}
