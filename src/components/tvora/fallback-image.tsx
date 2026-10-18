"use client";
// TVORA fallback image — raw <img> with a runtime onError candidate chain.
// Tries each candidate URL in order (real assets first), then settles on a
// procedural artwork data-URI so every poster/backdrop degrades gracefully
// (assets pipeline may still be generating images on a fresh clone).
// NOTE: pass `key={<stable id>}` at call sites so the chain resets per item.
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FallbackImage({
  candidates,
  fallback,
  alt,
  className,
  priority = false,
  sizes,
}: {
  candidates: Array<string | null | undefined>;
  fallback: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const list = candidates.filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = idx < list.length ? list[idx] : fallback;

  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
      onError={() => setIdx((i) => (i < list.length ? i + 1 : i))}
      onLoad={() => setLoaded(true)}
      className={cn("object-cover transition-opacity duration-700 ease-out", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
